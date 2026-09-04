import { APIError } from "better-auth/api";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { consentGrants } from "#/db/schema";
import {
	ALLOWED_ATTRIBUTE_KEYS,
	ATTRIBUTE_OIDC_CLAIMS,
} from "#/lib/profile-catalogue";

const suppressedIdentityClaims = (): Record<string, unknown> =>
	Object.fromEntries(
		[...Object.values(ATTRIBUTE_OIDC_CLAIMS), "email_verified"].map((claim) => [
			claim,
			undefined,
		]),
	);

export type ConsentGrantClaimsSource = {
	releasedAttributes: Record<string, string>;
	authEmail: string;
	emailVerified: boolean;
};

/**
 * Prepares the identity data previously agreed by the user
 * to be sent back to the same app
 */

export function resolveConsentGrantClaims(
	grant: ConsentGrantClaimsSource,
	scopes: readonly string[],
): Record<string, unknown> {
	const claims: Record<string, unknown> = suppressedIdentityClaims();
	const grantedScopes = new Set(scopes);
	const releasedValue = (key: string) => {
		const value = grant.releasedAttributes[key];
		return value?.trim() ? value : undefined;
	};

	if (grantedScopes.has("profile")) {
		for (const [attribute, claim] of Object.entries(ATTRIBUTE_OIDC_CLAIMS)) {
			if (attribute === "email") continue;
			claims[claim] = releasedValue(attribute);
		}
	}

	if (grantedScopes.has("email")) {
		const email = releasedValue("email");
		claims.email = email;
		if (email) {
			claims.email_verified = grant.emailVerified && email === grant.authEmail;
		}
	}

	for (const key of ALLOWED_ATTRIBUTE_KEYS) {
		if (!grantedScopes.has(key)) continue;
		const value = releasedValue(key);
		if (value) claims[key] = value;
	}

	return claims;
}

const accessTokenReferenceSchema = z.object({
	sub: z.string().min(1),
	clientId: z.string().min(1),
	referenceId: z.string().min(1),
});

/**
 * Verifies that access token belongs to grant
 */
export async function getConsentBoundUserInfoClaims(context: {
	sub: unknown;
	clientId: unknown;
	referenceId: unknown;
	scopes: readonly string[];
}): Promise<Record<string, unknown>> {
	const reference = accessTokenReferenceSchema.safeParse(context);
	if (!reference.success) {
		throw new APIError("UNAUTHORIZED", {
			message: "Access token is missing its consent reference",
		});
	}

	const [grant] = await db
		.select({
			clientId: consentGrants.clientId,
			scopes: consentGrants.scopes,
			releasedAttributes: consentGrants.releasedAttributes,
			authEmail: consentGrants.authEmail,
			emailVerified: consentGrants.emailVerified,
		})
		.from(consentGrants)
		.where(
			and(
				eq(consentGrants.userId, reference.data.sub),
				eq(consentGrants.referenceId, reference.data.referenceId),
				isNull(consentGrants.revokedAt),
			),
		)
		.limit(1);

	if (
		!grant ||
		grant.clientId !== reference.data.clientId ||
		!context.scopes.every((scope) => grant.scopes.includes(scope))
	) {
		throw new APIError("UNAUTHORIZED", {
			message: "Access token does not match an accepted consent grant",
		});
	}

	return resolveConsentGrantClaims(grant, context.scopes);
}

export const suppressIdentityTokenClaims = suppressedIdentityClaims;
