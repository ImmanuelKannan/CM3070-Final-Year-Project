import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { identityAttributes, user } from "#/db/schema";
import { registrationNameSchema } from "#/lib/registration";

export const BASE_IDENTITY_KEYS = ["firstName", "lastName", "email"] as const;

export const IDENTITY_EMAIL_MAX_LENGTH = 254;

export const identitySchema = z.strictObject({
	firstName: registrationNameSchema("First name"),
	lastName: registrationNameSchema("Last name"),
	email: z
    .email()
		.trim()
		.toLowerCase()
		.min(1, "Email is required")
		.max(
			IDENTITY_EMAIL_MAX_LENGTH,
			`Email must be ${IDENTITY_EMAIL_MAX_LENGTH} characters or fewer`,
		)
});

export type IdentityAttributes = z.infer<typeof identitySchema>;

export function normalizeIdentityAttributes(
	input: unknown,
): IdentityAttributes {
	const parsed = identitySchema.safeParse(input);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message: parsed.error.issues[0].message,
		});
	}
	return parsed.data;
}

function transformToIdentity(
	rows: { key: string; value: string }[],
): IdentityAttributes {
	const found = new Map(rows.map((r) => [r.key, r.value]));
	const identity = {} as IdentityAttributes;
	for (const key of BASE_IDENTITY_KEYS) {
		const value = found.get(key);
		if (value === undefined) {
			throw new Error(`Identity attribute missing: ${key}`);
		}
		identity[key] = value;
	}
	return identity;
}

export async function getBaseIdentity(
	userId: string,
): Promise<IdentityAttributes> {
	const rows = await db
		.select({ key: identityAttributes.key, value: identityAttributes.value })
		.from(identityAttributes)
		.where(eq(identityAttributes.userId, userId));
	return transformToIdentity(rows);
}

export async function updateBaseIdentity(
	userId: string,
	identity: IdentityAttributes,
): Promise<IdentityAttributes> {
	await db.transaction(async (tx) => {
		await tx
			.update(user)
			.set({
				firstName: identity.firstName,
				lastName: identity.lastName,
				name: `${identity.firstName} ${identity.lastName}`,
			})
			.where(eq(user.id, userId));

		for (const [key, value] of Object.entries(identity)) {
			await tx
				.insert(identityAttributes)
				.values({ userId, key, value, updatedAt: new Date() })
				.onConflictDoUpdate({
					target: [identityAttributes.userId, identityAttributes.key],
					set: { value, updatedAt: new Date() },
				});
		}
	});

	return identity;
}
