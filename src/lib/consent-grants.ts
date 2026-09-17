import { createHash } from "node:crypto";
import { getOAuthProviderState } from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";
import { constantTimeEqual, makeSignature } from "better-auth/crypto";
import { z } from "zod";

export const IGNORED_BETTER_AUTH_QUERY_KEYS = [
	"sig",
	"exp",
	"ba_iat",
	"ba_pl",
	"ba_param",
	"prompt",
] as const;

export const consentGrantSourceSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("base") }),
	z.object({
		kind: z.literal("contextual"),
		id: z.string(),
		name: z.string(),
		type: z.string(),
	}),
]);
export type ConsentGrantSource = z.infer<typeof consentGrantSourceSchema>;

export const consentDecisionSchema = z.enum(["approved", "rejected"]);
export type ConsentDecision = z.infer<typeof consentDecisionSchema>;

export function normalizeScopes(scopes: readonly string[]): string[] {
	return [...new Set(scopes)].sort();
}

export const consentGrantSnapshotSchema = z.object({
	referenceId: z.string(),
	clientId: z.string(),
	canonicalQuery: z.string(),
	scopes: z.array(z.string()),
	source: consentGrantSourceSchema,
	releasedAttributes: z.record(z.string(), z.string()),
	authEmail: z.string(),
	emailVerified: z.boolean(),
});

export type ConsentGrantSnapshot = z.infer<typeof consentGrantSnapshotSchema>;

export function normalizeAuthorizationQuery(
	oauthQuery: string,
	scopes: readonly string[],
): string {
	const params = new URLSearchParams(oauthQuery);
	for (const queryKeyToIgnore of IGNORED_BETTER_AUTH_QUERY_KEYS)
		params.delete(queryKeyToIgnore);
	params.set("scope", normalizeScopes(scopes).join(" "));
	params.sort();
	return params.toString();
}

export function generateQUeryHash(
	userId: string,
	normalizedQueryString: string,
): string {
	return createHash("sha256")
		.update(`${userId}\u0000${normalizedQueryString}`)
		.digest("hex");
}

export async function verifyOAuthQuery(
	oauthQuery: string,
	secret = process.env.BETTER_AUTH_SECRET,
): Promise<boolean> {
	if (!secret) return false;

	const params = new URLSearchParams(oauthQuery);
	const signatures = params.getAll("sig");
	const signature = signatures[0];
	const expiresAt = Number(params.get("exp"));
	params.delete("sig");

	const queryParams = [...params.entries()].sort(
		([keyA, valueA], [keyB, valueB]) => {
			if (keyA !== keyB) return keyA < keyB ? -1 : 1;
			if (valueA === valueB) return 0;
			return valueA < valueB ? -1 : 1;
		},
	);
	const expectedSignature = await makeSignature(
		new URLSearchParams(queryParams).toString(),
		secret,
	);

	return (
		signatures.length === 1 &&
		!!signature &&
		Number.isFinite(expiresAt) &&
		expiresAt * 1000 >= Date.now() &&
		constantTimeEqual(signature, expectedSignature)
	);
}

export async function validateOauthQuery(oauthQuery: string): Promise<void> {
	if (!(await verifyOAuthQuery(oauthQuery))) {
		throw new APIError("BAD_REQUEST", {
			message: "Authorization request is invalid or expired",
		});
	}
}

export async function resolveOAuthProviderConsentReference(
	userId: string,
	scopes: readonly string[],
): Promise<string> {
	const state = await getOAuthProviderState();
	if (!state?.query) {
		throw new APIError("BAD_REQUEST", {
			message: "OAuth provider state query is missing",
		});
	}
	return generateQUeryHash(
		userId,
		normalizeAuthorizationQuery(state.query, scopes),
	);
}
