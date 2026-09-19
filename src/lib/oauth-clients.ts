import type { OAuthClient } from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";
import { z } from "zod";

import { auth } from "#/lib/auth";
import {
	ALLOWED_ATTRIBUTE_KEYS,
	APPLICATION_CONTEXTS,
	type ApplicationContext,
} from "#/lib/profile-catalogue";

const clientNameSchema = z.string().trim().min(1).max(100);

const redirectUrisSchema = z
	.array(z.url("Redirect URL must be a valid URL"))
	.min(1);

const requestedAttributeDataSchema = z
	.array(z.string())
	.min(1, "Select at least one identity attribute")
	.refine(
		(keys) => new Set(keys).size === keys.length,
		"Identity attribute keys must be unique",
	)
	.refine(
		(keys) => keys.every((key) => ALLOWED_ATTRIBUTE_KEYS.includes(key)),
		"Unknown identity attribute",
	);

export const createOAuthClientInputSchema = z.strictObject({
	name: clientNameSchema,
	profileType: z.enum(APPLICATION_CONTEXTS),
	redirectUris: redirectUrisSchema,
	requestedAttributeData: requestedAttributeDataSchema,
});

export type CreateOAuthClientInput = z.infer<
	typeof createOAuthClientInputSchema
>;
export type OAuthClientProfileType = ApplicationContext;

export type OAuthClientSummary = {
	client_id: string;
	client_name?: string;
	redirect_uris: string[];
	requested_attribute_data: string[];
	metadata?: { profileType: ApplicationContext };
};

function toOAuthClientSummary(
	client: Pick<
		OAuthClient,
		"client_id" | "client_name" | "redirect_uris" | "scope"
	> & { profileType?: unknown },
): OAuthClientSummary {
	const profileType = client.profileType;
	const clientSummary: OAuthClientSummary = {
		client_id: client.client_id,
		client_name: client.client_name,
		redirect_uris: client.redirect_uris,
		requested_attribute_data: (client.scope ?? "")
			.split(" ")
			.filter((key) => key !== "" && key !== "openid"),
	};
	if (
		typeof profileType === "string" &&
		(APPLICATION_CONTEXTS as readonly string[]).includes(profileType)
	) {
		clientSummary.metadata = {
			profileType: profileType as ApplicationContext,
		};
	}
	return clientSummary;
}

export function normalizeCreateOAuthClientInput(
	input: unknown,
): CreateOAuthClientInput {
	const parsedOauthClient = createOAuthClientInputSchema.safeParse(input);
	if (!parsedOauthClient.success) {
		throw new APIError("BAD_REQUEST", {
			message:
				parsedOauthClient.error.issues[0]?.message ??
				"Invalid OAuth client input",
		});
	}
	return parsedOauthClient.data;
}

export function normalizeOAuthClientId(input: unknown): string {
	const parsed = z.string().trim().min(1).safeParse(input);
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
			scope: ["openid", ...validatedInput.requestedAttributeData].join(" "),
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
