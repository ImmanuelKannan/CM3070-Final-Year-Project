import { createHash } from "node:crypto";
import { getOAuthProviderState } from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";
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

 /**
   * Removes the better auth query keys, and normalizes
 * param order
 */
export function normalizeAuthorizationQuery(
	oauthQuery: string,
	scopes: readonly string[],
): string {
	const params = new URLSearchParams(oauthQuery);
	for (const queryKeyToIgnore of IGNORED_BETTER_AUTH_QUERY_KEYS) params.delete(queryKeyToIgnore);
	params.set("scope", [...new Set(scopes)].sort().join(" "));
	params.sort();
	return params.toString();
}

 /**
   * Generates a stable hash given the normalized query string
 */
export function generateStableQueryHash(
	userId: string,
	normalizedQueryString: string,
): string {
	return createHash("sha256")
		.update(`${userId}\u0000${normalizedQueryString}`)
		.digest("hex");
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
	return generateStableQueryHash(
		userId,
		normalizeAuthorizationQuery(state.query, scopes),
	);
}
