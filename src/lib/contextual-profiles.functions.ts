import { createServerFn } from "@tanstack/react-start";

import { getUserIdFromRequest } from "#/lib/auth.server";
import {
	createProfile,
	deleteProfile,
	getProfile,
	listProfiles,
	normalizeCreateProfileInput,
	normalizeProfileId,
	normalizeUpdateAttributeInput,
	normalizeUpdateMetadataInput,
	updateProfileAttribute,
	updateProfileMetadata,
} from "#/lib/contextual-profiles";

export const listProfilesFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const userId = await getUserIdFromRequest(
			"Sign in to manage your profiles",
		);
		return listProfiles(userId);
	},
);

export const getProfileFn = createServerFn({ method: "GET" })
	.validator(normalizeProfileId)
	.handler(async ({ data }) => {
		const userId = await getUserIdFromRequest(
			"Sign in to manage your profiles",
		);
		return getProfile(userId, data);
	});

export const createProfileFn = createServerFn({ method: "POST" })
	.validator(normalizeCreateProfileInput)
	.handler(async ({ data }) => {
		const userId = await getUserIdFromRequest(
			"Sign in to manage your profiles",
		);
		return createProfile(userId, data);
	});

export const updateProfileMetadataFn = createServerFn({ method: "POST" })
	.validator(normalizeUpdateMetadataInput)
	.handler(async ({ data }) => {
		const userId = await getUserIdFromRequest(
			"Sign in to manage your profiles",
		);
		const { id, ...rest } = data;
		return updateProfileMetadata(userId, id, rest);
	});

export const updateProfileAttributeFn = createServerFn({ method: "POST" })
	.validator(normalizeUpdateAttributeInput)
	.handler(async ({ data }) => {
		const userId = await getUserIdFromRequest(
			"Sign in to manage your profiles",
		);
		const { profileId, key, value } = data;
		return updateProfileAttribute(userId, profileId, key, value);
	});

export const deleteProfileFn = createServerFn({ method: "POST" })
	.validator(normalizeProfileId)
	.handler(async ({ data }) => {
		const userId = await getUserIdFromRequest(
			"Sign in to manage your profiles",
		);
		return deleteProfile(userId, data);
	});
