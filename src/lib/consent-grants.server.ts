import { isDeepStrictEqual } from "node:util";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { APIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";

import { db } from "#/db";
import { consentGrants, oauthClient, oauthConsent } from "#/db/schema";
import { auth } from "#/lib/auth";
import { getSessionFromRequest } from "#/lib/auth.server";
import {
	type ConsentGrantSource,
	normalizeAuthorizationQuery,
	generateStableQueryHash,
} from "#/lib/consent-grants";
import type {
	ApproveConsentGrantInput,
	ApproveConsentGrantResult,
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

export async function approveConsentGrantFromRequest(
	data: ApproveConsentGrantInput,
): Promise<ApproveConsentGrantResult> {
	const session = await getSessionFromRequest();

	if (!session) {
		throw new APIError("UNAUTHORIZED", { message: "Sign in to continue" });
	}

	return approveConsentGrant(data, session, getRequestHeaders());
}

// Validates the user's approval, saves the exact identity data the user agreed to
// share in the consent field, and finally returns the OAuth redirect
export async function approveConsentGrant(
	data: ApproveConsentGrantInput,
	session: ApproveConsentGrantSession,
	headers: Headers,
): Promise<ApproveConsentGrantResult> {
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
	const referenceId = generateStableQueryHash(userId, normalizedQuery);
	const snapshot = {
		clientId,
		userId,
		referenceId,
		canonicalQuery: normalizedQuery,
		scopes,
		source,
		releasedAttributes,
		authEmail: session.user.email,
		emailVerified: session.user.emailVerified,
	};

	const [existingGrant] = await db
		.select()
		.from(consentGrants)
		.where(
			and(
				eq(consentGrants.userId, userId),
				eq(consentGrants.referenceId, referenceId),
			),
		)
		.limit(1);

	if (existingGrant && !doesConsentGrantMatchDataSnapshot(existingGrant, snapshot)) {
		throw new APIError("CONFLICT", {
			message: "This authorization request already has a different approval",
		});
	}

	const oauthProviderResult = await auth.api.oauth2Consent({
		headers,
		asResponse: false,
		request: new Request(
			`${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/auth/oauth2/consent`,
			{ method: "POST", headers },
		),
		body: { accept: true, oauth_query: data.oauthQuery },
	});

	const redirectUrl = new URL(oauthProviderResult.url);
	const requestedRedirect = new URL(query.get("redirect_uri") ?? "");
	if (
		!oauthProviderResult.redirect ||
		redirectUrl.origin !== requestedRedirect.origin ||
		redirectUrl.pathname !== requestedRedirect.pathname ||
		redirectUrl.searchParams.has("error") ||
		!redirectUrl.searchParams.has("code")
	) {
		if (!existingGrant) {
			await db
				.delete(oauthConsent)
				.where(
					and(
						eq(oauthConsent.clientId, clientId),
						eq(oauthConsent.userId, userId),
						eq(oauthConsent.referenceId, referenceId),
					),
				);
		}
		throw new APIError("BAD_REQUEST", {
			message: "OAuth provider did not issue an authorization code",
		});
	}

	await db
		.insert(consentGrants)
		.values(snapshot)
		.onConflictDoNothing({
			target: [consentGrants.userId, consentGrants.referenceId],
		});

	const [[grant], [consent]] = await Promise.all([
		db
			.select()
			.from(consentGrants)
			.where(
				and(
					eq(consentGrants.userId, userId),
					eq(consentGrants.referenceId, referenceId),
				),
			)
			.limit(1),
		db
			.select({
				clientId: oauthConsent.clientId,
				userId: oauthConsent.userId,
				referenceId: oauthConsent.referenceId,
				scopes: oauthConsent.scopes,
			})
			.from(oauthConsent)
			.where(
				and(
					eq(oauthConsent.clientId, clientId),
					eq(oauthConsent.userId, userId),
					eq(oauthConsent.referenceId, referenceId),
				),
			)
			.limit(1),
	]);

	const areSameScopes = (values: readonly string[] | undefined) => !!values && [...values].sort().join(" ") === [...scopes].sort().join(" ");

	if (
		!grant ||
		!doesConsentGrantMatchDataSnapshot(grant, snapshot) ||
		consent?.clientId !== clientId ||
		consent.userId !== userId ||
		consent.referenceId !== referenceId ||
		!areSameScopes(consent.scopes)
	) {
		throw new APIError("INTERNAL_SERVER_ERROR", {
			message: "Failed to match consent grants",
		});
	}

	return { redirect: oauthProviderResult.redirect, url: oauthProviderResult.url };
}

function doesConsentGrantMatchDataSnapshot(
	consentGrant: typeof consentGrants.$inferSelect,
	dataSnapshot: Omit<typeof consentGrants.$inferInsert, "id" | "createdAt">,
): boolean {
	return (
		consentGrant.userId === dataSnapshot.userId &&
		consentGrant.clientId === dataSnapshot.clientId &&
		consentGrant.referenceId === dataSnapshot.referenceId &&
		consentGrant.canonicalQuery === dataSnapshot.canonicalQuery &&
		isDeepStrictEqual(consentGrant.scopes, dataSnapshot.scopes) &&
		isDeepStrictEqual(consentGrant.source, dataSnapshot.source) &&
		isDeepStrictEqual(consentGrant.releasedAttributes, dataSnapshot.releasedAttributes) &&
		consentGrant.authEmail === dataSnapshot.authEmail &&
		consentGrant.emailVerified === dataSnapshot.emailVerified
	);
}
