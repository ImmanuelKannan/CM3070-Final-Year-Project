import { APIError } from "better-auth/api";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "#/db";
import {
	consentGrants,
	consentRevocations,
	oauthAccessToken,
	oauthClient,
	oauthConsent,
	oauthRefreshToken,
} from "#/db/schema";
import { normalizeScopes } from "#/lib/consent-grants";

export type AuthorizedApp = {
	clientId: string;
	name: string | null;
	latestGrantScopes: string[];
	releasedAttributes: Record<string, string>;
	latestGrantAt: Date;
};

export type RevokeAppResult = { success: true };

type ActiveGrantRow = {
	clientId: string;
	name: string | null;
	scopes: string[];
	releasedAttributes: Record<string, string>;
	createdAt: Date;
};

function selectActiveGrants(
	userId: string,
	clientId?: string,
): Promise<ActiveGrantRow[]> {
	const conditions = [
		eq(consentGrants.userId, userId),
		isNull(consentGrants.revokedAt),
	];
	if (clientId !== undefined) {
		conditions.push(eq(consentGrants.clientId, clientId));
	}
	return db
		.select({
			clientId: consentGrants.clientId,
			name: oauthClient.name,
			scopes: consentGrants.scopes,
			releasedAttributes: consentGrants.releasedAttributes,
			createdAt: consentGrants.createdAt,
		})
		.from(consentGrants)
		.innerJoin(oauthClient, eq(consentGrants.clientId, oauthClient.clientId))
		.where(and(...conditions))
		.orderBy(consentGrants.createdAt, consentGrants.id);
}

function groupAuthorizedApps(rows: ActiveGrantRow[]): AuthorizedApp[] {
	const authorizedAppGroupingMap = new Map<string, AuthorizedApp>();
	for (const row of rows) {
		let authorizedApp = authorizedAppGroupingMap.get(row.clientId);
		if (!authorizedApp) {
			authorizedApp = {
				clientId: row.clientId,
				name: row.name,
				latestGrantScopes: [],
				releasedAttributes: {},
				latestGrantAt: row.createdAt,
			};
			authorizedAppGroupingMap.set(row.clientId, authorizedApp);
		}
		authorizedApp.latestGrantAt = row.createdAt;
		authorizedApp.releasedAttributes = row.releasedAttributes;
		authorizedApp.latestGrantScopes = normalizeScopes(row.scopes);
	}
	return [...authorizedAppGroupingMap.values()].sort(
		(a, b) => b.latestGrantAt.getTime() - a.latestGrantAt.getTime(),
	);
}

export async function listAuthorizedApps(
	userId: string,
): Promise<AuthorizedApp[]> {
	return groupAuthorizedApps(await selectActiveGrants(userId));
}

export async function getAuthorizedApp(
	userId: string,
	clientId: string,
): Promise<AuthorizedApp> {
	const [authorizedApp] = groupAuthorizedApps(
		await selectActiveGrants(userId, clientId),
	);
	if (!authorizedApp) {
		throw new APIError("NOT_FOUND", {
			message: "Authorized application not found",
		});
	}
	return authorizedApp;
}

export async function revokeAuthorizedAPp(
	userId: string,
	clientId: string,
): Promise<RevokeAppResult> {
	return db.transaction(async (tx) => {
		const approvalKey = and(
			eq(consentGrants.userId, userId),
			eq(consentGrants.clientId, clientId),
		);
		const revokedAt = new Date();
		const revokedGrants = await tx
			.update(consentGrants)
			.set({ revokedAt })
			.where(and(approvalKey, isNull(consentGrants.revokedAt)))
			.returning({ scopes: consentGrants.scopes });

		if (revokedGrants.length === 0) {
			const [existingRevocation] = await tx
				.select({ id: consentRevocations.id })
				.from(consentRevocations)
				.where(
					and(
						eq(consentRevocations.userId, userId),
						eq(consentRevocations.clientId, clientId),
					),
				)
				.limit(1);
			if (existingRevocation) return { success: true };
			throw new APIError("NOT_FOUND", {
				message: "No active authorization for this application",
			});
		}
		await tx
			.delete(oauthConsent)
			.where(
				and(
					eq(oauthConsent.userId, userId),
					eq(oauthConsent.clientId, clientId),
				),
			);
		await tx
			.update(oauthRefreshToken)
			.set({ revoked: revokedAt })
			.where(
				and(
					eq(oauthRefreshToken.userId, userId),
					eq(oauthRefreshToken.clientId, clientId),
					isNull(oauthRefreshToken.revoked),
				),
			);
		await tx
			.delete(oauthAccessToken)
			.where(
				and(
					eq(oauthAccessToken.userId, userId),
					eq(oauthAccessToken.clientId, clientId),
				),
			);
		const [client] = await tx
			.select({ name: oauthClient.name })
			.from(oauthClient)
			.where(eq(oauthClient.clientId, clientId))
			.limit(1);
		await tx.insert(consentRevocations).values({
			userId,
			clientId,
			clientName: client?.name?.trim() || clientId,
			scopes: normalizeScopes(revokedGrants.flatMap((grant) => grant.scopes)),
			createdAt: revokedAt,
		});

		return { success: true };
	});
}
