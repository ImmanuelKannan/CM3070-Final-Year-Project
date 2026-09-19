import { createServerFn } from "@tanstack/react-start";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { oauthClient } from "#/db/schema";
import { requireAccountKind } from "#/lib/auth.server";
import {
	generateQUeryHash,
	normalizeAuthorizationQuery,
	validateOauthQuery,
} from "#/lib/consent-grants";
import { saveConsentRequest } from "#/lib/consent-history";
import {
	getAppContext,
	getRequestedIdentityAttributeKeys,
	type PreviewAttribute,
	resolveConsentPreviewAttributes,
} from "#/lib/consent-preview";
import { getProfile, listProfiles } from "#/lib/contextual-profiles";
import { getBaseIdentity } from "#/lib/identity";
import type { ProfileType } from "#/lib/profile-catalogue";

const consentPreviewInputValidateSchema = z.strictObject({
	oauthQuery: z
		.string({ error: "Authorization request is required" })
		.trim()
		.min(1, "Authorization request is required"),
	selectedProfileId: z.string().nullish(),
});

export type ConsentClientInfo = {
	id: string;
	name: string | null;
	uri: string | null;
	icon: string | null;
};

export type ConsentProfileOption = {
	id: string;
	type: ProfileType;
	name: string;
};

export type ConsentPreviewResult = {
	client: ConsentClientInfo;
	scopes: string[];
	requestedKeys: string[];
	profiles: ConsentProfileOption[];
	suggestedProfileId: string | null;
	selectedProfileId: string | null;
	selectedProfileName: string | null;
	attributes: PreviewAttribute[];
};

export const getConsentPreview = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const parsed = consentPreviewInputValidateSchema.safeParse(input);
		if (!parsed.success) {
			throw new APIError("BAD_REQUEST", {
				message: parsed.error.issues[0].message,
			});
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<ConsentPreviewResult> => {
		const userId = await requireAccountKind(
			"identity_holder",
			"Sign in with an Identity Holder account to authorize access",
		);
		await validateOauthQuery(data.oauthQuery);

		const query = new URLSearchParams(data.oauthQuery);
		const clientId = query.get("client_id");
		if (!clientId) {
			throw new APIError("BAD_REQUEST", { message: "Missing client_id" });
		}

		const scopes = (query.get("scope") ?? "").split(/\s+/).filter(Boolean);
		const requestedKeys = getRequestedIdentityAttributeKeys(scopes);

		const [client] = await db
			.select({
				clientId: oauthClient.clientId,
				name: oauthClient.name,
				uri: oauthClient.uri,
				icon: oauthClient.icon,
				metadata: oauthClient.metadata,
			})
			.from(oauthClient)
			.where(eq(oauthClient.clientId, clientId))
			.limit(1);

		if (!client) {
			throw new APIError("NOT_FOUND", { message: "Application not found" });
		}

		const suggestedType = getAppContext(client.metadata);
		const [baseProfile, customProfiles] = await Promise.all([
			getBaseIdentity(userId),
			listProfiles(userId),
		]);

		const profileOptions: ConsentProfileOption[] = customProfiles.map((p) => ({
			id: p.id,
			type: p.type,
			name: p.name,
		}));

		const suggestedProfileId = suggestedType
			? (profileOptions.find((p) => p.type === suggestedType)?.id ?? null)
			: null;

		let selectedProfileId: string | null = null;
		let selectedProfileName: string | null = null;
		let profileOverrides: Record<string, string> | null = null;

		if (data.selectedProfileId && data.selectedProfileId !== "default") {
			const profile = await getProfile(userId, data.selectedProfileId);
			selectedProfileId = profile.id;
			selectedProfileName = profile.name;
			profileOverrides = profile.attributes;
		}

		const resolvedAttributes = resolveConsentPreviewAttributes(
			baseProfile,
			profileOverrides,
			requestedKeys,
		);
		const normalizedQuery = normalizeAuthorizationQuery(
			data.oauthQuery,
			scopes,
		);
		const referenceId = generateQUeryHash(userId, normalizedQuery);
		await saveConsentRequest(userId, {
			referenceId,
			clientId: client.clientId,
			clientName: client.name ?? client.clientId,
			scopes,
		});

		return {
			client: {
				id: client.clientId,
				name: client.name,
				uri: client.uri,
				icon: client.icon,
			},
			scopes,
			requestedKeys,
			profiles: profileOptions,
			suggestedProfileId,
			selectedProfileId,
			selectedProfileName,
			attributes: resolvedAttributes,
		};
	});
