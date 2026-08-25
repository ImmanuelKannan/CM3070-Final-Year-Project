import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { APIError } from "better-auth/api";

import { auth } from "#/lib/auth";
import {
	getBaseIdentity,
	normalizeIdentityAttributes,
	updateBaseIdentity,
} from "#/lib/identity";

async function requireUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) {
		throw new APIError("UNAUTHORIZED", {
			message: "Sign in to manage your identity",
		});
	}
	return session.user.id;
}

export const getIdentity = createServerFn({ method: "GET" }).handler(
	async () => {
		const userId = await requireUserId();
		return getBaseIdentity(userId);
	},
);

export const updateIdentity = createServerFn({ method: "POST" })
	.validator(normalizeIdentityAttributes)
	.handler(async ({ data }) => {
		const userId = await requireUserId();
		const identity = await updateBaseIdentity(userId, data);
		return { success: true, identity };
	});
