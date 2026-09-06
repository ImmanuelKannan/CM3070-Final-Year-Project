import type { OAuthClient } from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";
import { z } from "zod";

import { auth } from "#/lib/auth";
import { PROFILE_TYPES, type ProfileType } from "#/lib/profile-catalogue";

const clientNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(100);

const redirectUrisSchema = z
	.array(z.url("Redirect URL must be a valid URL"))
	.min(1);

export const createOAuthClientInputSchema = z.strictObject({
	name: clientNameSchema,
	profileType: z.enum(PROFILE_TYPES),
	redirectUris: redirectUrisSchema,
});

export type CreateOAuthClientInput = z.infer<
	typeof createOAuthClientInputSchema
>;
export type OAuthClientProfileType = ProfileType;

export type OAuthClientSummary = {
	client_id: string;
	client_name?: string;
	redirect_uris: string[];
	metadata?: { profileType: ProfileType };
};

function toOAuthClientSummary(
	client: Pick<OAuthClient, "client_id" | "client_name" | "redirect_uris"> & {
		profileType?: unknown;
	},
): OAuthClientSummary {
	const profileType = client.profileType;
	const clientSummary: OAuthClientSummary = {
		client_id: client.client_id,
		client_name: client.client_name,
		redirect_uris: client.redirect_uris,
	};
	if (
		typeof profileType === "string" &&
		(PROFILE_TYPES as readonly string[]).includes(profileType)
	) {
		clientSummary.metadata = { profileType: profileType as ProfileType };
	}
	return clientSummary;
}

export function normalizeCreateOAuthClientInput(
	input: unknown,
): CreateOAuthClientInput {
	const parsedOauthClient = createOAuthClientInputSchema.safeParse(input);
	if (!parsedOauthClient.success) {
		throw new APIError("BAD_REQUEST", {
			message: parsedOauthClient.error.issues[0]?.message ?? "Invalid OAuth client input",
		});
	}
	return parsedOauthClient.data;
}

export function normalizeOAuthClientId(input: unknown): string {
	const parsed = z
		.string()
		.trim()
		.min(1)
		.safeParse(input);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message: parsed.error.issues[0]?.message ?? "Invalid client id",
		});
	}
	return parsed.data;
}

export async function createOAuthClient(headers: Headers, input: unknown) {
	const validatedInput = normalizeCreateOAuthClientInput(input);
	const createdClient = await auth.api.adminCreateOAuthClient({
		headers,
		body: {
			client_name: validatedInput.name,
			redirect_uris: validatedInput.redirectUris,
			token_endpoint_auth_method: "client_secret_basic",
			grant_types: ["authorization_code"],
			response_types: ["code"],
			type: "web",
			metadata: { profileType: validatedInput.profileType },
		},
	});

	if (!createdClient.client_secret) {
		throw new APIError("INTERNAL_SERVER_ERROR", {
			message: "OAuth client secret was not created",
		});
	}

	return {
		...toOAuthClientSummary(createdClient),
		client_secret: createdClient.client_secret,
	};
}

export async function listOAuthClients(
	headers: Headers,
): Promise<OAuthClientSummary[]> {
	const clients = await auth.api.getOAuthClients({ headers });
	if (!clients || clients.length === 0) return [];

	return clients.map(toOAuthClientSummary);
}

export async function deleteOAuthClient(
	headers: Headers,
	clientId: string,
): Promise<{ success: true }> {
	const validatedClientId = normalizeOAuthClientId(clientId);
	await auth.api.deleteOAuthClient({
		headers,
		body: { client_id: validatedClientId },
	});
	return { success: true };
}
