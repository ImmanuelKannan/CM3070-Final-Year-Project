import { createServerFn } from "@tanstack/react-start";
import { APIError } from "better-auth/api";

import { getUserIdFromRequest } from "#/lib/auth.server";
import {
	getBaseIdentity,
	normalizeIdentityAttributes,
	normalizeUpdateIdentityAttributeInput,
	updateBaseIdentity,
	validateBaseAttribute,
} from "#/lib/identity";

export const getIdentity = createServerFn({ method: "GET" }).handler(
	async () => {
		const userId = await getUserIdFromRequest("Sign in to manage your identity");
		return getBaseIdentity(userId);
	},
);

export const updateIdentity = createServerFn({ method: "POST" })
	.validator(normalizeIdentityAttributes)
	.handler(async ({ data }) => {
		const userId = await getUserIdFromRequest("Sign in to manage your identity");
		const identity = await updateBaseIdentity(userId, data);
		return { success: true, identity };
	});

export const updateIdentityAttribute = createServerFn({ method: "POST" })
	.validator(normalizeUpdateIdentityAttributeInput)
	.handler(async ({ data }) => {
		const userId = await getUserIdFromRequest("Sign in to manage your identity");
		const { key, value } = data;
		const validationError = validateBaseAttribute(key, value);
		if (validationError) {
			throw new APIError("BAD_REQUEST", { message: validationError });
		}
		const identity = await updateBaseIdentity(userId, { [key]: value });
		return { success: true, key, value, identity };
	});
