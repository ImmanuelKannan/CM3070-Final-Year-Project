import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";

import { db } from "#/db";
import {
	consentDecisions,
	consentGrants,
	consentRequests,
	consentRevocations,
	oauthClient,
} from "#/db/schema";
import { normalizeScopes } from "#/lib/consent-grants";

export const CONSENT_HISTORY_PAGE_SIZE = 20;

type ConsentHistoryEventType =
	| "requested"
	| "approved"
	| "rejected"
	| "revoked";

type ConsentHistoryEventCommon = {
	id: string;
	clientId: string;
	clientName: string;
	scopes: string[];
	createdAt: Date;
};

export type ConsentHistoryEvent =
	| (ConsentHistoryEventCommon & {
			type: "approved";
			releasedAttributes: Record<string, string>;
	  })
	| (ConsentHistoryEventCommon & {
			type: Exclude<ConsentHistoryEventType, "approved">;
	  });

export type ConsentHistorySummary = {
	totalDecisions: number;
	approved: number;
	rejected: number;
	revoked: number;
};

export type ConsentHistory = {
	events: ConsentHistoryEvent[];
	summary: ConsentHistorySummary;
	page: number;
	hasPrevious: boolean;
	hasNext: boolean;
};

export type ConsentHistoryQuery = {
	search?: string;
	page?: number;
};

export type ConsentRequestSnapshot = {
	referenceId: string;
	clientId: string;
	clientName: string;
	scopes: string[];
};

export async function saveConsentRequest(
	userId: string,
	snapshot: ConsentRequestSnapshot,
): Promise<void> {
	await db
		.insert(consentRequests)
		.values({
			userId,
			referenceId: snapshot.referenceId,
			clientId: snapshot.clientId,
			clientName: snapshot.clientName.trim() || snapshot.clientId,
			scopes: normalizeScopes(snapshot.scopes),
		})
		.onConflictDoNothing({
			target: [consentRequests.userId, consentRequests.referenceId],
		});
}

type ConsentHistoryRow = {
	eventType: ConsentHistoryEventType;
	eventId: string;
	clientId: string;
	clientName: string;
	scopes: string[];
	createdAt: Date;
	releasedAttributes: Record<string, string> | null;
};

function initialiseEvent(row: ConsentHistoryRow): ConsentHistoryEvent {
	const common = {
		id: row.eventId,
		clientId: row.clientId,
		clientName: row.clientName,
		scopes: row.scopes,
		createdAt: row.createdAt,
	};

	if (row.eventType === "approved") {
		return {
			type: "approved",
			...common,
			releasedAttributes: row.releasedAttributes ?? {},
		};
	}

	return { type: row.eventType, ...common };
}

// TODO: Look into potentially refactoring consent history into one table instead?
export async function getConsentHistory(
	userId: string,
	input: ConsentHistoryQuery = {},
): Promise<ConsentHistory> {
	const page = Math.max(1, Math.trunc(input.page ?? 1));
	const offset = (page - 1) * CONSENT_HISTORY_PAGE_SIZE;
	const search = input.search?.trim();

	const requestedEvents = db
		.select({
			eventType: sql<ConsentHistoryEventType>`'requested'`.as("eventType"),
			eventId: sql<string>`'requested:' || ${consentRequests.id}::text`.as(
				"eventId",
			),
			clientId: consentRequests.clientId,
			clientName: consentRequests.clientName,
			scopes: consentRequests.scopes,
			createdAt: consentRequests.createdAt,
			releasedAttributes: sql<Record<string, string> | null>`NULL::jsonb`.as(
				"releasedAttributes",
			),
		})
		.from(consentRequests)
		.where(eq(consentRequests.userId, userId));

	const decisionEvents = db
		.select({
			eventType: sql<ConsentHistoryEventType>`${consentDecisions.decision}`.as(
				"eventType",
			),
			eventId:
				sql<string>`${consentDecisions.decision}::text || ':' || ${consentDecisions.id}::text`.as(
					"eventId",
				),
			clientId: consentDecisions.clientId,
			clientName: sql<string>`COALESCE(
				NULLIF(${consentRequests.clientName}, ''),
				NULLIF(${oauthClient.name}, ''),
				${consentDecisions.clientId}
			)`.as("clientName"),
			scopes: sql<string[]>`CASE
				WHEN ${consentDecisions.decision} = 'approved' THEN ${consentGrants.scopes}
				ELSE ${consentDecisions.canonicalScopes}
			END`.as("scopes"),
			createdAt: consentDecisions.createdAt,
			releasedAttributes: sql<Record<string, string> | null>`CASE
				WHEN ${consentDecisions.decision} = 'approved' THEN ${consentGrants.releasedAttributes}
				ELSE NULL
			END`.as("releasedAttributes"),
		})
		.from(consentDecisions)
		.leftJoin(
			consentGrants,
			and(
				eq(consentGrants.userId, consentDecisions.userId),
				eq(consentGrants.referenceId, consentDecisions.referenceId),
				eq(consentGrants.clientId, consentDecisions.clientId),
			),
		)
		.leftJoin(
			consentRequests,
			and(
				eq(consentRequests.userId, consentDecisions.userId),
				eq(consentRequests.referenceId, consentDecisions.referenceId),
				eq(consentRequests.clientId, consentDecisions.clientId),
			),
		)
		.leftJoin(oauthClient, eq(oauthClient.clientId, consentDecisions.clientId))
		.where(
			and(
				eq(consentDecisions.userId, userId),
				or(
					eq(consentDecisions.decision, "rejected"),
					isNotNull(consentGrants.id),
				),
			),
		);

	const revokedEvents = db
		.select({
			eventType: sql<ConsentHistoryEventType>`'revoked'`.as("eventType"),
			eventId: sql<string>`'revoked:' || ${consentRevocations.id}::text`.as(
				"eventId",
			),
			clientId: consentRevocations.clientId,
			clientName: consentRevocations.clientName,
			scopes: consentRevocations.scopes,
			createdAt: consentRevocations.createdAt,
			releasedAttributes: sql<Record<string, string> | null>`NULL::jsonb`.as(
				"releasedAttributes",
			),
		})
		.from(consentRevocations)
		.where(eq(consentRevocations.userId, userId));

	const historyEvents = unionAll(
		requestedEvents,
		decisionEvents,
		revokedEvents,
	).as("history_events");

	const searchCondition = search
		? sql`position(lower(${search}) in lower(${historyEvents.clientName})) > 0 OR position(lower(${search}) in lower(${historyEvents.clientId})) > 0`
		: sql`true`;

	const [eventResult, summaryResult] = await Promise.all([
		db
			.select({
				eventType: historyEvents.eventType,
				eventId: historyEvents.eventId,
				clientId: historyEvents.clientId,
				clientName: historyEvents.clientName,
				scopes: historyEvents.scopes,
				createdAt: historyEvents.createdAt,
				releasedAttributes: historyEvents.releasedAttributes,
			})
			.from(historyEvents)
			.where(searchCondition)
			.orderBy(desc(historyEvents.createdAt), desc(historyEvents.eventId))
			.limit(CONSENT_HISTORY_PAGE_SIZE + 1)
			.offset(offset),
		db
			.select({
				approved: sql<number>`count(*) filter (where ${consentDecisions.decision} = 'approved')::int`,
				rejected: sql<number>`count(*) filter (where ${consentDecisions.decision} = 'rejected')::int`,
				revoked: sql<number>`(select count(*)::int from ${consentRevocations} where ${consentRevocations.userId} = ${userId})`,
			})
			.from(consentDecisions)
			.where(eq(consentDecisions.userId, userId)),
	]);

	const approved = summaryResult[0]?.approved ?? 0;
	const rejected = summaryResult[0]?.rejected ?? 0;
	const revoked = summaryResult[0]?.revoked ?? 0;

	return {
		events: eventResult
			.slice(0, CONSENT_HISTORY_PAGE_SIZE)
			.map(initialiseEvent),
		summary: {
			totalDecisions: approved + rejected,
			approved,
			rejected,
			revoked,
		},
		page,
		hasPrevious: page > 1,
		hasNext: eventResult.length > CONSENT_HISTORY_PAGE_SIZE,
	};
}
