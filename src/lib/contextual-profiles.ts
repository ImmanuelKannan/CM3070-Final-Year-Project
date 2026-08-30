import { APIError } from "better-auth/api";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { contextualProfiles, profileAttributes } from "#/db/schema";
import { getBaseIdentity } from "#/lib/identity";
import type { ProfileType } from "#/lib/profile-catalogue";
import {
	ALLOWED_ATTRIBUTE_KEYS,
	PROFILE_TYPES,
	validateAttribute,
} from "#/lib/profile-catalogue";

export const PROFILE_NAME_MAX_LENGTH = 100;
export const PROFILE_DESCRIPTION_MAX_LENGTH = 500;

const profileTypeSchema = z.enum(PROFILE_TYPES);

const profileNameSchema = z
	.string({ error: "Profile name is required" })
	.trim()
	.min(1, "Profile name is required")
	.max(
		PROFILE_NAME_MAX_LENGTH,
		`Profile name must be ${PROFILE_NAME_MAX_LENGTH} characters or fewer`,
	);

const profileDescriptionSchema = z
	.string({ error: "Description must be a string" })
	.trim()
	.max(
		PROFILE_DESCRIPTION_MAX_LENGTH,
		`Description must be ${PROFILE_DESCRIPTION_MAX_LENGTH} characters or fewer`,
	)
	.default("");

export const createProfileInputSchema = z.strictObject({
	type: profileTypeSchema,
	name: profileNameSchema,
	description: profileDescriptionSchema,
});

export const updateMetadataInputSchema = createProfileInputSchema.extend({
	id: z.uuid("Profile id must be a valid uuid"),
});

export const updateAttributeInputSchema = z.strictObject({
	profileId: z.uuid("Profile id must be a valid uuid"),
	key: z.string({ error: "Attribute key is required" }),
	value: z.string({ error: "Attribute value must be a string" }).default(""),
});

export function normalizeCreateProfileInput(input: unknown) {
	const parsed = createProfileInputSchema.safeParse(input);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message: parsed.error.issues[0].message,
		});
	}
	return parsed.data;
}

export function normalizeUpdateMetadataInput(input: unknown) {
	const parsed = updateMetadataInputSchema.safeParse(input);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message: parsed.error.issues[0].message,
		});
	}
	return parsed.data;
}

export function normalizeUpdateAttributeInput(input: unknown) {
	const parsed = updateAttributeInputSchema.safeParse(input);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message: parsed.error.issues[0].message,
		});
	}
	return parsed.data;
}

export function normalizeProfileId(id: unknown): string {
	const parsed = z.uuid("Profile id must be a valid uuid").safeParse(id);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message: parsed.error.issues[0].message,
		});
	}
	return parsed.data;
}

type ProfileRow = typeof contextualProfiles.$inferSelect;

type StoredAttributes = Record<string, string>;

async function getProfileRow(
	userId: string,
	profileId: string,
): Promise<ProfileRow> {
	const [row] = await db
		.select()
		.from(contextualProfiles)
		.where(
			and(
				eq(contextualProfiles.id, profileId),
				eq(contextualProfiles.userId, userId),
			),
		);
	if (!row) {
		throw new APIError("NOT_FOUND", { message: "Profile not found" });
	}
	return row;
}

async function getStoredAttributes(
	profileId: string,
): Promise<StoredAttributes> {
	const rows = await db
		.select({ key: profileAttributes.key, value: profileAttributes.value })
		.from(profileAttributes)
		.where(eq(profileAttributes.profileId, profileId));
	return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function resolveStored(
	base: Record<string, string>,
	stored: StoredAttributes,
): Record<string, string> {
	const resolved: Record<string, string> = {};
	for (const key of ALLOWED_ATTRIBUTE_KEYS) {
		const value = stored[key];
		resolved[key] = value && value.trim() !== "" ? value : (base[key] ?? "");
	}
	return resolved;
}

export type ProfileView = {
	id: string;
	type: ProfileType;
	name: string;
	description: string;
	createdAt: Date;
	updatedAt: Date;
	attributes: StoredAttributes;
	resolved: Record<string, string>;
};

async function toProfileView(row: ProfileRow): Promise<ProfileView> {
	const [base, stored] = await Promise.all([
		getBaseIdentity(row.userId),
		getStoredAttributes(row.id),
	]);
	return {
		id: row.id,
		type: row.type as ProfileType,
		name: row.name,
		description: row.description,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		attributes: stored,
		resolved: resolveStored(base, stored),
	};
}

function isUniqueViolation(error: unknown) {
	const code = (error as { cause?: { code?: string } } | undefined)?.cause
		?.code;
	return code === "23505";
}

function assertUniqueType(error: unknown, type: string): never {
	if (isUniqueViolation(error)) {
		throw new APIError("CONFLICT", {
			message: `A ${type} profile already exists for your account`,
		});
	}
	throw error;
}

export async function listProfiles(userId: string): Promise<
	Array<{
		id: string;
		type: ProfileType;
		name: string;
		description: string;
		createdAt: Date;
		updatedAt: Date;
	}>
> {
	const rows = await db
		.select({
			id: contextualProfiles.id,
			type: contextualProfiles.type,
			name: contextualProfiles.name,
			description: contextualProfiles.description,
			createdAt: contextualProfiles.createdAt,
			updatedAt: contextualProfiles.updatedAt,
		})
		.from(contextualProfiles)
		.where(eq(contextualProfiles.userId, userId))
		.orderBy(desc(contextualProfiles.createdAt));
	return rows.map((row) => ({
		...row,
		type: row.type as ProfileType,
	}));
}

export async function getProfile(userId: string, profileId: string) {
	const row = await getProfileRow(userId, normalizeProfileId(profileId));
	return toProfileView(row);
}

export async function createProfile(
	userId: string,
	input: { type: ProfileType; name: string; description: string },
) {
	const { type, name, description } = input;

	try {
		const row = await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(contextualProfiles)
				.values({ userId, type, name, description })
				.returning();

			const base = await getBaseIdentity(userId);
			await tx.insert(profileAttributes).values(
				Object.entries(base).map(([key, value]) => ({
					profileId: created.id,
					key,
					value,
				})),
			);
			return created;
		});
		return toProfileView(row);
	} catch (error) {
		assertUniqueType(error, type);
	}
}

export async function updateProfileMetadata(
	userId: string,
	profileId: string,
	input: { name: string; description: string },
) {
	const id = normalizeProfileId(profileId);
	const [updated] = await db
		.update(contextualProfiles)
		.set({
			name: input.name,
			description: input.description,
			updatedAt: new Date(),
		})
		.where(
			and(eq(contextualProfiles.id, id), eq(contextualProfiles.userId, userId)),
		)
		.returning();
	if (!updated) {
		throw new APIError("NOT_FOUND", { message: "Profile not found" });
	}
	return toProfileView(updated);
}

export async function updateProfileAttribute(
	userId: string,
	profileId: string,
	key: string,
	value: string,
): Promise<ProfileView> {
	const id = normalizeProfileId(profileId);
	const row = await getProfileRow(userId, id);

	if (!ALLOWED_ATTRIBUTE_KEYS.includes(key)) {
		throw new APIError("BAD_REQUEST", {
			message: `Unknown attribute key: ${key}`,
		});
	}

	// A blank value means "fall back to the Base Identity": resolved values
	// inherit the Base Identity for blank/absent profile values, so blanks are
	// always allowed here even for catalogue-required fields.
	if (value.trim() !== "") {
		const fieldError = validateAttribute(key, value);
		if (fieldError) {
			throw new APIError("BAD_REQUEST", {
				message: `Validation error for "${key}": ${fieldError}`,
			});
		}
	}

	await db
		.insert(profileAttributes)
		.values({ profileId: id, key, value })
		.onConflictDoUpdate({
			target: [profileAttributes.profileId, profileAttributes.key],
			set: { value, updatedAt: new Date() },
		});

	return toProfileView(row);
}

export async function deleteProfile(userId: string, profileId: string) {
	const id = normalizeProfileId(profileId);
	const deleted = await db
		.delete(contextualProfiles)
		.where(
			and(eq(contextualProfiles.id, id), eq(contextualProfiles.userId, userId)),
		)
		.returning({ id: contextualProfiles.id });
	if (deleted.length === 0) {
		throw new APIError("NOT_FOUND", { message: "Profile not found" });
	}
	return { success: true };
}
