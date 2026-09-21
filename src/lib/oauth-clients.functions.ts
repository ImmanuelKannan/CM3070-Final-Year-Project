import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { requireAccountKind } from "#/lib/auth.server";
import {
	createOAuthClient,
	deleteOAuthClient,
	listOAuthClients,
	normalizeCreateOAuthClientInput,
	normalizeOAuthClientId,
	rotateOAuthClientSecret,
} from "#/lib/oauth-clients";

const OAUTH_CLIENTS_ERROR_MESSAGE =
	"Sign in with a Developer account to manage your OAuth clients";

export const createOAuthClientFn = createServerFn({ method: "POST" })
	.validator(normalizeCreateOAuthClientInput)
	.handler(async ({ data }) => {
		await requireAccountKind("developer", OAUTH_CLIENTS_ERROR_MESSAGE);
		return createOAuthClient(getRequestHeaders(), data);
	});

export const listOAuthClientsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireAccountKind("developer", OAUTH_CLIENTS_ERROR_MESSAGE);
		return listOAuthClients(getRequestHeaders());
	},
);

export const deleteOAuthClientFn = createServerFn({ method: "POST" })
	.validator(normalizeOAuthClientId)
	.handler(async ({ data }) => {
		await requireAccountKind("developer", OAUTH_CLIENTS_ERROR_MESSAGE);
		return deleteOAuthClient(getRequestHeaders(), data);
	});

export const rotateOAuthClientSecretFn = createServerFn({ method: "POST" })
	.validator(normalizeOAuthClientId)
	.handler(async ({ data }) => {
		await requireAccountKind("developer", OAUTH_CLIENTS_ERROR_MESSAGE);
		return rotateOAuthClientSecret(getRequestHeaders(), data);
	});
