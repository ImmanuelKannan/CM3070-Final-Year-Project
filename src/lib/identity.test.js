import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { pool } from "#/db";
import {
	getBaseIdentity,
	normalizeIdentityAttributes,
	updateBaseIdentity,
	validateBaseAttribute,
} from "./identity";

const insertUser = `
	INSERT INTO "user" ("id", "name", "first_name", "last_name", "email")
	VALUES ($1, $2, $3, $4, $5)
`;

async function seedUser(overrides = {}) {
	const userId = randomUUID();
	const email = `${userId}@example.com`;
	const firstName = overrides.firstName ?? "Ada";
	const lastName = overrides.lastName ?? "Lovelace";
	await pool.query(insertUser, [
		userId,
		`${firstName} ${lastName}`,
		firstName,
		lastName,
		email,
	]);
	return { userId, email };
}

describe("normalizeIdentityAttributes", () => {
	test("normalizes a valid full identity", () => {
		const identity = normalizeIdentityAttributes({
			firstName: "  Ada  ",
			lastName: " Lovelace ",
			email: "  ADA@Example.COM  ",
		});
		expect(identity).toEqual({
			firstName: "Ada",
			lastName: "Lovelace",
			email: "ada@example.com",
		});
	});

	test("rejects missing keys", () => {
		expect(() =>
			normalizeIdentityAttributes({ firstName: "Ada", email: "a@b.co" }),
		).toThrow("Last name is required");
	});

	test("rejects unknown attributes", () => {
		expect(() =>
			normalizeIdentityAttributes({
				firstName: "Ada",
				lastName: "Lovelace",
				email: "a@b.co",
				phone: "123",
			}),
		).toThrow('Unrecognized key: "phone"');
	});

	test("rejects wrongly typed values", () => {
		expect(() =>
			normalizeIdentityAttributes({
				firstName: 42,
				lastName: "Lovelace",
				email: "a@b.co",
			}),
		).toThrow("First name is required");
	});

	test("rejects non-object input", () => {
		expect(() => normalizeIdentityAttributes(null)).toThrow(
			"Invalid input: expected object, received null",
		);
		expect(() => normalizeIdentityAttributes(["Ada"])).toThrow(
			"Invalid input: expected object, received array",
		);
	});

	test("rejects invalid and overlong emails", () => {
		for (const email of [
			"not-an-email",
			"a@example..com",
			"a@-example.com",
			".a@example.com",
		]) {
			expect(() =>
				normalizeIdentityAttributes({
					firstName: "Ada",
					lastName: "Lovelace",
					email,
				}),
			).toThrow("Email is invalid");
		}
		expect(() =>
			normalizeIdentityAttributes({
				firstName: "Ada",
				lastName: "Lovelace",
				email: "   ",
			}),
		).toThrow("Email is required");
		const long = `${"a".repeat(245)}@example.com`;
		expect(() =>
			normalizeIdentityAttributes({
				firstName: "Ada",
				lastName: "Lovelace",
				email: long,
			}),
		).toThrow("Email must be 254 characters or fewer");
	});
});

describe("validateBaseAttribute", () => {
	test("rejects unknown keys and invalid values", () => {
		expect(validateBaseAttribute("phone", "123")).toBe(
			"Unknown attribute key: phone",
		);
		expect(validateBaseAttribute("email", "not-an-email")).toContain(
			"Invalid email address",
		);
		expect(validateBaseAttribute("firstName", "   ")).toBe(
			"First name is required",
		);
		expect(validateBaseAttribute("bio", "hello")).toBeNull();
	});
});

describe("updateBaseIdentity", () => {
	test("persists all attributes atomically and mirrors the name", async () => {
		const { userId, email } = await seedUser();
		try {
			const identity = normalizeIdentityAttributes({
				firstName: " Grace ",
				lastName: " Hopper ",
				email: "  GRACE@Example.com  ",
			});
			await updateBaseIdentity(userId, identity);

			const rows = await pool.query(
				'SELECT "key", "value" FROM "identity_attributes" WHERE "user_id" = $1 ORDER BY "key"',
				[userId],
			);
			expect(rows.rows).toEqual([
				{ key: "email", value: "grace@example.com" },
				{ key: "firstName", value: "Grace" },
				{ key: "lastName", value: "Hopper" },
			]);

			// The Better Auth user mirrors the name but keeps its sign-in email.
			const mirrored = await pool.query(
				'SELECT "name", "first_name", "last_name", "email" FROM "user" WHERE "id" = $1',
				[userId],
			);
			expect(mirrored.rows[0]).toEqual({
				name: "Grace Hopper",
				first_name: "Grace",
				last_name: "Hopper",
				email,
			});

			expect(await getBaseIdentity(userId)).toMatchObject(identity);
		} finally {
			await pool.query('DELETE FROM "user" WHERE "id" = $1', [userId]);
		}
	}, 15000);

	test("single-attribute updates persist without disturbing other attributes", async () => {
		const { userId } = await seedUser();
		try {
			await updateBaseIdentity(userId, { phoneNumber: "+60 123456789" });

			const identity = await getBaseIdentity(userId);
			expect(identity).toMatchObject({
				firstName: "Ada",
				lastName: "Lovelace",
				phoneNumber: "+60 123456789",
			});

			const rows = await pool.query(
				'SELECT "key", "value" FROM "identity_attributes" WHERE "user_id" = $1 ORDER BY "key"',
				[userId],
			);
			expect(rows.rows).toEqual([
				{ key: "email", value: `${userId}@example.com` },
				{ key: "firstName", value: "Ada" },
				{ key: "lastName", value: "Lovelace" },
				{ key: "phoneNumber", value: "+60 123456789" },
			]);
		} finally {
			await pool.query('DELETE FROM "user" WHERE "id" = $1', [userId]);
		}
	}, 15000);

	test("does not leak changes to another user (owner scoping)", async () => {
		const alice = await seedUser({ firstName: "Alice", lastName: "A" });
		const bob = await seedUser({ firstName: "Bob", lastName: "B" });
		try {
			await updateBaseIdentity(
				alice.userId,
				normalizeIdentityAttributes({
					firstName: "Alicia",
					lastName: "Alpha",
					email: "alicia@example.com",
				}),
			);

			const bobIdentity = await getBaseIdentity(bob.userId);
			expect(bobIdentity).toMatchObject({
				firstName: "Bob",
				lastName: "B",
				email: bob.email,
			});
			expect(await getBaseIdentity(alice.userId)).toMatchObject({
				firstName: "Alicia",
				lastName: "Alpha",
				email: "alicia@example.com",
			});
		} finally {
			await pool.query('DELETE FROM "user" WHERE "id" = ANY($1)', [
				[alice.userId, bob.userId],
			]);
		}
	}, 15000);
});
