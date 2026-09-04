import { createServerFn } from "@tanstack/react-start";
import { APIError } from "better-auth/api";
import { z } from "zod";

import { getUserIdFromRequest } from "#/lib/auth.server";
import type {
	AuthorizedApp,
	RevokeAppResult,
} from "#/lib/authorized-apps";
import {
	getAuthorizedApp as getAuthorizedAppImpl,
	listAuthorizedApps as listAuthorizedAppsImpl,
	revokeAuthorizedAPp as revokeAuthorizedAppsImpl,
} from "#/lib/authorized-apps";

const clientIdSchema = z
	.string({ error: "Client id is required" })
	.trim()
	.min(1, "Client id is required");

function parseClientId(input: unknown): string {
	const parsed = clientIdSchema.safeParse(input);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message: parsed.error.issues[0]?.message ?? "Invalid client id",
		});
	}
	return parsed.data;
}

const AUTHORIZED_APPS_ERROR_MESSAGE =
	"Sign in to manage your authorized applications";

export const listAuthorizedApps = createServerFn({
	method: "GET",
}).handler(async (): Promise<AuthorizedApp[]> => {
	const userId = await getUserIdFromRequest(AUTHORIZED_APPS_ERROR_MESSAGE);
	return listAuthorizedAppsImpl(userId);
});

export const getAuthorizedApps = createServerFn({ method: "GET" })
	.validator(parseClientId)
	.handler(async ({ data }): Promise<AuthorizedApp> => {
		const userId = await getUserIdFromRequest(AUTHORIZED_APPS_ERROR_MESSAGE);
		return getAuthorizedAppImpl(userId, data);
	});

export const revokeAuthorizedApp = createServerFn({ method: "POST" })
	.validator(parseClientId)
	.handler(async ({ data }): Promise<RevokeAppResult> => {
		const userId = await getUserIdFromRequest(AUTHORIZED_APPS_ERROR_MESSAGE);
		return revokeAuthorizedAppsImpl(userId, data);
	});
