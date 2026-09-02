import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { APIError } from "better-auth/api";
import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db";
import {
	consentDecisions,
	consentGrants,
	oauthClient,
	oauthConsent,
} from "#/db/schema";
import { auth } from "#/lib/auth";
import { getSessionFromRequest } from "#/lib/auth.server";
import {
	type ConsentDecision,
	type ConsentGrantSource,
	generateStableQueryHash,
	normalizeAuthorizationQuery,
	normalizeScopes,
} from "#/lib/consent-grants";
import type {
	ApproveConsentGrantInput,
	ConsentDecisionResult,
	RejectConsentGrantInput,
} from "#/lib/consent-grants.functions";
import {
	getRequestedIdentityAttributeKeys,
	resolveConsentPreviewAttributes,
} from "#/lib/consent-preview";
import { getProfile } from "#/lib/contextual-profiles";
import { getBaseIdentity } from "#/lib/identity";
import { validateAttribute } from "#/lib/profile-catalogue";

export type ApproveConsentGrantSession = {
	user: {
		id: string;
		email: string;
		emailVerified: boolean;
	};
};

type ApprovalSnapshot = Omit<
	typeof consentGrants.$inferInsert,
	"id" | "createdAt"
>;

type ConsentDecisionInput = {
	decision: ConsentDecision;
	userId: string;
	clientId: string;
	referenceId: string;
	canonicalQuery: string;
	canonicalScopes: string[];
	snapshot: ApprovalSnapshot | null;
	oauthQuery: string;
	headers: Headers;
};

const CONFLICT_ALREADY_APPROVED =
	"This authorization request has already been approved";
const CONFLICT_ALREADY_REJECTED =
	"This authorization request has already been rejected";
const CONFLICT_DIFFERENT_APPROVAL =
	"This authorization request already has a different approval";
const INVALID_REDIRECT_MESSAGE = "OAuth provider returned an invalid redirect";

export async function approveConsentGrantFromRequest(
	data: ApproveConsentGrantInput,
): Promise<ConsentDecisionResult> {
	const session = await getSessionFromRequest();

	if (!session) {
		throw new APIError("UNAUTHORIZED", { message: "Sign in to continue" });
	}

	return approveConsentGrant(data, session, getRequestHeaders());
}

export async function rejectConsentGrantFromRequest(
	data: RejectConsentGrantInput,
): Promise<ConsentDecisionResult> {
	const session = await getSessionFromRequest();

	if (!session) {
		throw new APIError("UNAUTHORIZED", { message: "Sign in to continue" });
	}

	return rejectConsentGrant(data, session, getRequestHeaders());
}

// Validates the user's approval, saves the exact identity data the user agreed to
// share in the consent field, and finally returns the OAuth redirect
export async function approveConsentGrant(
	data: ApproveConsentGrantInput,
	session: ApproveConsentGrantSession,
	headers: Headers,
): Promise<ConsentDecisionResult> {
	const userId = session.user.id;
	const query = new URLSearchParams(data.oauthQuery);
	const clientId = query.get("client_id");

	if (!clientId) {
		throw new APIError("BAD_REQUEST", { message: "Missing client_id" });
	}

	const scopes = (query.get("scope") ?? "").split(/\s+/).filter(Boolean);
	const requestedIdentityDataKeys = getRequestedIdentityAttributeKeys(scopes);
	const edits: Record<string, string> = {};

	// Validates fields to be updated
	for (const [key, value] of Object.entries(data.edits)) {
		if (!requestedIdentityDataKeys.includes(key)) {
			throw new APIError("BAD_REQUEST", {
				message: `Unrequested edit for attribute: ${key}`,
			});
		}
		const trimmed = value.trim();
		if (!trimmed) continue;
		const fieldError = validateAttribute(key, trimmed);
		if (fieldError) {
			throw new APIError("BAD_REQUEST", {
				message: `Validation error for "${key}": ${fieldError}`,
			});
		}
		edits[key] = trimmed;
	}

	const [[authClient], baseIdentity] = await Promise.all([
		db
			.select({ clientId: oauthClient.clientId })
			.from(oauthClient)
			.where(eq(oauthClient.clientId, clientId))
			.limit(1),
		getBaseIdentity(userId),
	]);
	if (!authClient) {
		throw new APIError("NOT_FOUND", { message: "Application not found" });
	}

	let source: ConsentGrantSource = { kind: "base" };
	let profileOverrides: Record<string, string> | null = null;
	if (data.selectedProfileId) {
		const profile = await getProfile(userId, data.selectedProfileId);
		source = {
			kind: "contextual",
			id: profile.id,
			name: profile.name,
			type: profile.type,
		};
		profileOverrides = profile.attributes;
	}

	const releasedAttributes = Object.fromEntries(
		resolveConsentPreviewAttributes(
			baseIdentity,
			profileOverrides,
			requestedIdentityDataKeys,
			edits,
		).map(({ key, value }) => [key, value]),
	);

	const normalizedQuery = normalizeAuthorizationQuery(data.oauthQuery, scopes);
	const snapshot = {
		clientId,
		userId,
		referenceId: generateStableQueryHash(userId, normalizedQuery),
		canonicalQuery: normalizedQuery,
		scopes: normalizeScopes(scopes),
		source,
		releasedAttributes,
		authEmail: session.user.email,
		emailVerified: session.user.emailVerified,
	};

	return applyConsentDecision({
		decision: "approved",
		userId,
		clientId,
		referenceId: snapshot.referenceId,
		canonicalQuery: normalizedQuery,
		canonicalScopes: snapshot.scopes,
		snapshot,
		oauthQuery: data.oauthQuery,
		headers,
	});
}

export async function rejectConsentGrant(
	data: RejectConsentGrantInput,
	session: ApproveConsentGrantSession,
	headers: Headers,
): Promise<ConsentDecisionResult> {
	const userId = session.user.id;
	const query = new URLSearchParams(data.oauthQuery);
	const clientId = query.get("client_id");

	if (!clientId) {
		throw new APIError("BAD_REQUEST", { message: "Missing client_id" });
	}

	const scopes = (query.get("scope") ?? "").split(/\s+/).filter(Boolean);

	const [authClient] = await db
		.select({ clientId: oauthClient.clientId })
		.from(oauthClient)
		.where(eq(oauthClient.clientId, clientId))
		.limit(1);
	if (!authClient) {
		throw new APIError("NOT_FOUND", { message: "Application not found" });
	}

	const normalizedQuery = normalizeAuthorizationQuery(data.oauthQuery, scopes);

	return applyConsentDecision({
		decision: "rejected",
		userId,
		clientId,
		referenceId: generateStableQueryHash(userId, normalizedQuery),
		canonicalQuery: normalizedQuery,
		canonicalScopes: normalizeScopes(scopes),
		snapshot: null,
		oauthQuery: data.oauthQuery,
		headers,
	});
}

async function applyConsentDecision(
	input: ConsentDecisionInput,
): Promise<ConsentDecisionResult> {
	const {
		decision,
		userId,
		clientId,
		referenceId,
		canonicalQuery,
		canonicalScopes,
		snapshot,
		oauthQuery,
		headers,
	} = input;

	// The decision is committed before provider delivery, so invalid or expired
	// requests are also recorded — every submission stays visible in history.
	const delivery = await db.transaction(async (tx) => {
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtextextended(${referenceId}, 0))`,
		);

		const decisionKey = and(
			eq(consentDecisions.userId, userId),
			eq(consentDecisions.referenceId, referenceId),
		);
		const grantKey = and(
			eq(consentGrants.userId, userId),
			eq(consentGrants.referenceId, referenceId),
		);

		const [existingDecision] = await tx
			.select()
			.from(consentDecisions)
			.where(decisionKey)
			.limit(1);

		if (existingDecision) {
			if (existingDecision.decision === "rejected") {
				if (decision === "approved") {
					throw new APIError("CONFLICT", {
						message: CONFLICT_ALREADY_REJECTED,
					});
				}
				// Rejected retry: replay the same effective decision without
				// duplicating the durable record.
				return "reject";
			}
			if (decision === "rejected") {
				throw new APIError("CONFLICT", {
					message: CONFLICT_ALREADY_APPROVED,
				});
			}
			// Approved retry: only an identical approval snapshot may repeat.
			if (!snapshot) {
				throw new APIError("INTERNAL_SERVER_ERROR", {
					message: "Missing approval snapshot",
				});
			}
			const [existingGrant] = await tx
				.select()
				.from(consentGrants)
				.where(grantKey)
				.limit(1);
			if (
				!existingGrant ||
				!doesConsentGrantMatchDataSnapshot(existingGrant, snapshot)
			) {
				throw new APIError("CONFLICT", {
					message: CONFLICT_DIFFERENT_APPROVAL,
				});
			}
			return "approve";
		}

		if (decision === "rejected") {
			await tx.insert(consentDecisions).values({
				userId,
				clientId,
				referenceId,
				canonicalQuery,
				canonicalScopes,
				decision,
			});
			return "reject";
		}

		// First approval: one business decision, one grant, and one reusable
		// provider consent are committed atomically before any provider work.
		// The advisory lock and the existing-decision check above serialize
		// concurrent requests, so the decision and grant inserts cannot collide.
		// The provider consent can already exist (provider-flow consents), so it
		// keeps conflict handling to take the provider's update path instead.
		if (!snapshot) {
			throw new APIError("INTERNAL_SERVER_ERROR", {
				message: "Missing approval snapshot",
			});
		}

		await tx.insert(consentDecisions).values({
			userId,
			clientId,
			referenceId,
			canonicalQuery,
			canonicalScopes,
			decision,
		});
		await tx.insert(consentGrants).values(snapshot);
		await tx
			.insert(oauthConsent)
			.values({
				id: randomUUID(),
				clientId,
				userId,
				referenceId,
				scopes: snapshot.scopes,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.onConflictDoNothing({
				target: [
					oauthConsent.clientId,
					oauthConsent.userId,
					oauthConsent.referenceId,
				],
			});

		return "approve";
	});

	const result = await auth.api.oauth2Consent({
		headers,
		asResponse: false,
		request: new Request(
			`${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/auth/oauth2/consent`,
			{ method: "POST", headers },
		),
		body: { accept: delivery === "approve", oauth_query: oauthQuery },
	});

	if (delivery === "approve") {
		validateAuthorizationCodeRedirect(result, oauthQuery);
	} else {
		validateAccessDeniedRedirect(result, oauthQuery);
	}
	return result;
}

type ProviderRedirectResult = { redirect: boolean; url: string };

function getBadRequest(): APIError {
	return new APIError("BAD_REQUEST", { message: INVALID_REDIRECT_MESSAGE });
}

function parseProviderRedirect(result: ProviderRedirectResult): URL {
	if (!result.redirect) {
		throw getBadRequest();
	}
	try {
		return new URL(result.url);
	} catch {
		throw getBadRequest();
	}
}

function assertRedirectMatchesRequest(url: URL, oauthQuery: string): void {
	const query = new URLSearchParams(oauthQuery);
	let requested: URL;
	try {
		requested = new URL(query.get("redirect_uri") ?? "");
	} catch {
		throw getBadRequest();
	}
	if (url.origin !== requested.origin || url.pathname !== requested.pathname) {
		throw getBadRequest();
	}
	for (const key of new Set(requested.searchParams.keys())) {
		const expected = requested.searchParams.getAll(key);
		const actual = url.searchParams.getAll(key);
		if (
			expected.length !== actual.length ||
			expected.some((value, index) => value !== actual[index])
		) {
			throw getBadRequest();
		}
	}
	const expectedState = query.get("state");
	if (expectedState && url.searchParams.get("state") !== expectedState) {
		throw getBadRequest();
	}
}

export function validateAuthorizationCodeRedirect(
	result: ProviderRedirectResult,
	oauthQuery: string,
): void {
	const url = parseProviderRedirect(result);
	if (url.searchParams.has("error") || !url.searchParams.get("code")) {
		throw getBadRequest();
	}
	assertRedirectMatchesRequest(url, oauthQuery);
}

export function validateAccessDeniedRedirect(
	result: ProviderRedirectResult,
	oauthQuery: string,
): void {
	const url = parseProviderRedirect(result);
	if (
		url.searchParams.get("error") !== "access_denied" ||
		url.searchParams.has("code")
	) {
		throw getBadRequest();
	}
	assertRedirectMatchesRequest(url, oauthQuery);
}

function areSameScopes(
	a: readonly string[] | undefined,
	b: readonly string[] | undefined,
): boolean {
	return (
		!!a && !!b && isDeepStrictEqual(normalizeScopes(a), normalizeScopes(b))
	);
}

function doesConsentGrantMatchDataSnapshot(
	consentGrant: typeof consentGrants.$inferSelect,
	dataSnapshot: ApprovalSnapshot,
): boolean {
	return (
		consentGrant.userId === dataSnapshot.userId &&
		consentGrant.clientId === dataSnapshot.clientId &&
		consentGrant.referenceId === dataSnapshot.referenceId &&
		consentGrant.canonicalQuery === dataSnapshot.canonicalQuery &&
		areSameScopes(consentGrant.scopes, dataSnapshot.scopes) &&
		isDeepStrictEqual(consentGrant.source, dataSnapshot.source) &&
		isDeepStrictEqual(
			consentGrant.releasedAttributes,
			dataSnapshot.releasedAttributes,
		) &&
		consentGrant.authEmail === dataSnapshot.authEmail &&
		consentGrant.emailVerified === dataSnapshot.emailVerified
	);
}
