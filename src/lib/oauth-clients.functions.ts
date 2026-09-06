import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { getUserIdFromRequest } from "#/lib/auth.server";
import {
	createOAuthClient,
	deleteOAuthClient,
	listOAuthClients,
	normalizeCreateOAuthClientInput,
	normalizeOAuthClientId,
} from "#/lib/oauth-clients";

const OAUTH_CLIENTS_ERROR_MESSAGE = "Sign in to manage your OAuth clients";

export const createOAuthClientFn = createServerFn({ method: "POST" })
	.validator(normalizeCreateOAuthClientInput)
	.handler(async ({ data }) => {
		await getUserIdFromRequest(OAUTH_CLIENTS_ERROR_MESSAGE);
		return createOAuthClient(getRequestHeaders(), data);
	});

export const listOAuthClientsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await getUserIdFromRequest(OAUTH_CLIENTS_ERROR_MESSAGE);
		return listOAuthClients(getRequestHeaders());
	},
);

export const deleteOAuthClientFn = createServerFn({ method: "POST" })
	.validator(normalizeOAuthClientId)
	.handler(async ({ data }) => {
		await getUserIdFromRequest(OAUTH_CLIENTS_ERROR_MESSAGE);
		return deleteOAuthClient(getRequestHeaders(), data);
	});
