import { APIError } from "better-auth/api";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { identityAttributes, user } from "#/db/schema";
import {
	ALLOWED_ATTRIBUTE_KEYS,
	ATTRIBUTE_SCHEMAS,
} from "#/lib/profile-catalogue";
import { registrationNameSchema } from "#/lib/registration";

export const BASE_IDENTITY_KEYS = ALLOWED_ATTRIBUTE_KEYS;
export const IDENTITY_EMAIL_MAX_LENGTH = 254;

type IdentityForm = {
	firstName: string;
	lastName: string;
	email: string;
};

const identityFormSchema = z.strictObject({
	firstName: registrationNameSchema("First name"),
	lastName: registrationNameSchema("Last name"),
	email: z
		.string({ error: "Email is required" })
		.trim()
		.toLowerCase()
		.min(1, "Email is required")
		.max(
			IDENTITY_EMAIL_MAX_LENGTH,
			`Email must be ${IDENTITY_EMAIL_MAX_LENGTH} characters or fewer`,
		)
		.email("Email is invalid"),
});

const updateIdentityAttributeSchema = z.strictObject({
	key: z.string({ error: "Attribute key is required" }),
	value: z.string({ error: "Attribute value must be a string" }),
});

export type IdentityAttributes = Record<string, string>;

export function normalizeUpdateIdentityAttributeInput(input: unknown): {
	key: string;
	value: string;
} {
	const parsed = updateIdentityAttributeSchema.safeParse(input);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message: parsed.error.issues[0].message,
		});
	}
	return parsed.data;
}

export function normalizeIdentityAttributes(input: unknown): IdentityForm {
	const parsed = identityFormSchema.safeParse(input);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message: parsed.error.issues[0].message,
		});
	}
	return parsed.data;
}

function emptyIdentity(): Record<string, string> {
	return Object.fromEntries(BASE_IDENTITY_KEYS.map((key) => [key, ""]));
}

export async function getBaseIdentity(
	userId: string,
): Promise<Record<string, string>> {
	const rows = await db
		.select({ key: identityAttributes.key, value: identityAttributes.value })
		.from(identityAttributes)
		.where(eq(identityAttributes.userId, userId));

	const found = new Map(rows.map((r) => [r.key, r.value]));
	const identity = emptyIdentity();
	for (const key of BASE_IDENTITY_KEYS) {
		identity[key] = found.get(key) ?? "";
	}
	return identity;
}

export async function updateBaseIdentity(
	userId: string,
	partial: Record<string, string>,
): Promise<Record<string, string>> {
	await db.transaction(async (tx) => {
		for (const [key, value] of Object.entries(partial)) {
			await tx
				.insert(identityAttributes)
				.values({ userId, key, value, updatedAt: new Date() })
				.onConflictDoUpdate({
					target: [identityAttributes.userId, identityAttributes.key],
					set: { value, updatedAt: new Date() },
				});
		}

    // This is to keep Better Auth identity and user identity data in sync
		const mirrorRows = await tx
			.select({ key: identityAttributes.key, value: identityAttributes.value })
			.from(identityAttributes)
			.where(
				and(
					eq(identityAttributes.userId, userId),
					inArray(identityAttributes.key, [
						"firstName",
						"lastName",
						"profilePicture",
					]),
				),
			);
		const mirrored = Object.fromEntries(
			mirrorRows.map((r) => [r.key, r.value]),
		);

		const userUpdate: {
			firstName?: string;
			lastName?: string;
			name?: string;
			image?: string | null;
		} = {};
		if (mirrored.firstName && mirrored.lastName) {
			userUpdate.firstName = mirrored.firstName;
			userUpdate.lastName = mirrored.lastName;
			userUpdate.name = `${mirrored.firstName} ${mirrored.lastName}`;
		}
		if (mirrored.profilePicture !== undefined) {
			userUpdate.image = mirrored.profilePicture || null;
		}
		if (Object.keys(userUpdate).length > 0) {
			await tx.update(user).set(userUpdate).where(eq(user.id, userId));
		}
	});

	return getBaseIdentity(userId);
}

/** Validate a single Base Identity attribute key against the catalogue. */
export function validateBaseAttribute(
	key: string,
	value: string,
): string | null {
	if (key === "profilePicture") {
		return "Upload profile pictures from the image picker";
	}
	if (!BASE_IDENTITY_KEYS.includes(key)) {
		return `Unknown attribute key: ${key}`;
	}
	const schema = ATTRIBUTE_SCHEMAS[key];
	const result = schema.safeParse(value);
	return result.success ? null : (result.error.issues[0]?.message ?? null);
}
