import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { pool } from "#/db";
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
} from "./contextual-profiles";
import { normalizeIdentityAttributes, updateBaseIdentity } from "./identity";
import { ALLOWED_ATTRIBUTE_KEYS } from "./profile-catalogue";

setDefaultTimeout(30_000);

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

async function cleanup(userIds) {
	await pool.query('DELETE FROM "user" WHERE "id" = ANY($1)', [userIds]);
}

describe("contextual profiles", () => {
	test("createProfile copies the complete Base Identity catalogue", async () => {
		const { userId, email } = await seedUser();
		try {
			const created = await createProfile(userId, {
				type: "others",
				name: "Archive",
				description: "",
			});
			expect(created.type).toBe("others");
			expect(created.name).toBe("Archive");

			// Every catalogue attribute is snapshotted into the new profile.
			expect(Object.keys(created.attributes).sort()).toEqual(
				[...ALLOWED_ATTRIBUTE_KEYS].sort(),
			);
			expect(created.attributes.firstName).toBe("Ada");
			expect(created.attributes.lastName).toBe("Lovelace");
			expect(created.attributes.email).toBe(email);
			expect(created.attributes.bio).toBe("");

			// With the snapshot in place, resolved equals the snapshot values.
			expect(created.resolved.firstName).toBe("Ada");
			expect(created.resolved.email).toBe(email);
		} finally {
			await cleanup([userId]);
		}
	});

	test("existing profiles are snapshots: later Base Identity changes do not propagate", async () => {
		const { userId, email } = await seedUser();
		const newEmail = `${randomUUID()}-new@example.com`;
		try {
			const profile = await createProfile(userId, {
				type: "social",
				name: "Work",
				description: "",
			});

			await updateBaseIdentity(
				userId,
				normalizeIdentityAttributes({
					firstName: "Augusta",
					lastName: "King",
					email: newEmail,
				}),
			);

			const after = await getProfile(userId, profile.id);
			expect(after.attributes.firstName).toBe("Ada");
			expect(after.attributes.email).toBe(email);
			// Stored profile values win over the changed Base Identity.
			expect(after.resolved.firstName).toBe("Ada");
			expect(after.resolved.email).toBe(email);
		} finally {
			await cleanup([userId]);
		}
	});

	test("blank profile attributes fall back to the Base Identity", async () => {
		const { userId, email } = await seedUser();
		const newEmail = `${randomUUID()}-new@example.com`;
		try {
			const profile = await createProfile(userId, {
				type: "social",
				name: "Work",
			});
			expect(profile.resolved.email).toBe(email);

			await updateBaseIdentity(
				userId,
				normalizeIdentityAttributes({
					firstName: "Ada",
					lastName: "Lovelace",
					email: newEmail,
				}),
			);

			// Blanking a profile value re-inherits from the (now updated) Base Identity.
			const updated = await updateProfileAttribute(
				userId,
				profile.id,
				"email",
				"",
			);
			expect(updated.attributes.email).toBe("");
			expect(updated.resolved.email).toBe(newEmail);
		} finally {
			await cleanup([userId]);
		}
	});

	test("at most one profile per Profile Type, but different types coexist", async () => {
		const { userId } = await seedUser();
		try {
			await createProfile(userId, { type: "social", name: "Work" });
			await expect(
				createProfile(userId, { type: "social", name: "Work Copy" }),
			).rejects.toMatchObject({ status: "CONFLICT" });

			const banking = await createProfile(userId, {
				type: "banking",
				name: "Bank",
			});
			expect(banking.type).toBe("banking");

			const listed = await listProfiles(userId);
			expect(listed).toHaveLength(2);
		} finally {
			await cleanup([userId]);
		}
	});

	test("metadata edits update name and description and persist", async () => {
		const { userId } = await seedUser();
		try {
			const created = await createProfile(
				userId,
				normalizeCreateProfileInput({
					type: "school",
					name: "  Uni  ",
					description: "  Lecturers  ",
				}),
			);
			expect(created.name).toBe("Uni");
			expect(created.description).toBe("Lecturers");

			const updated = await updateProfileMetadata(userId, created.id, {
				name: "Alumni",
				description: "",
			});
			expect(updated).toMatchObject({ name: "Alumni", description: "" });

			const fetched = await getProfile(userId, created.id);
			expect(fetched.name).toBe("Alumni");
			expect(fetched.description).toBe("");
		} finally {
			await cleanup([userId]);
		}
	});

	test("per-attribute edits validate values and allow blanking required fields", async () => {
		const { userId } = await seedUser();
		try {
			const created = await createProfile(userId, {
				type: "social",
				name: "Work",
			});

			const updated = await updateProfileAttribute(
				userId,
				created.id,
				"bio",
				"Hello there",
			);
			expect(updated.attributes.bio).toBe("Hello there");
			expect(updated.resolved.bio).toBe("Hello there");

			await expect(
				updateProfileAttribute(userId, created.id, "email", "not-an-email"),
			).rejects.toMatchObject({ status: "BAD_REQUEST" });
			await expect(
				updateProfileAttribute(userId, created.id, "portfolioUrl", "ftp://x"),
			).rejects.toMatchObject({ status: "BAD_REQUEST" });
			await expect(
				updateProfileAttribute(userId, created.id, "phone", "123"),
			).rejects.toMatchObject({ status: "BAD_REQUEST" });

			// Blanking even a catalogue-required field is allowed on a profile:
			// it means "inherit from the Base Identity".
			const blanked = await updateProfileAttribute(
				userId,
				created.id,
				"firstName",
				"",
			);
			expect(blanked.attributes.firstName).toBe("");
			expect(blanked.resolved.firstName).toBe("Ada");
		} finally {
			await cleanup([userId]);
		}
	});

	test("rejects malformed ids and unknown boundary input", async () => {
		const { userId } = await seedUser();
		try {
			await expect(getProfile(userId, "not-a-uuid")).rejects.toMatchObject({
				status: "BAD_REQUEST",
			});
			await expect(
				updateProfileMetadata(userId, "not-a-uuid", { name: "X" }),
			).rejects.toMatchObject({ status: "BAD_REQUEST" });
			await expect(
				updateProfileAttribute(userId, "not-a-uuid", "bio", "x"),
			).rejects.toMatchObject({ status: "BAD_REQUEST" });
			await expect(deleteProfile(userId, "not-a-uuid")).rejects.toMatchObject({
				status: "BAD_REQUEST",
			});

			// A well-formed but unknown id is NOT_FOUND.
			await expect(getProfile(userId, randomUUID())).rejects.toMatchObject({
				status: "NOT_FOUND",
			});

			expect(() => normalizeCreateProfileInput({ name: "X" })).toThrow(
				'Invalid option: expected one of "social"',
			);
			expect(() =>
				normalizeCreateProfileInput({ type: "fishing", name: "X" }),
			).toThrow('Invalid option: expected one of "social"');
			expect(() => normalizeUpdateAttributeInput({ key: "bio" })).toThrow(
				"Profile id must be a valid uuid",
			);
			expect(() =>
				normalizeUpdateMetadataInput({ type: "social", name: "X", id: "nope" }),
			).toThrow("Profile id must be a valid uuid");
			expect(() => normalizeProfileId("nope")).toThrow(
				"Profile id must be a valid uuid",
			);
		} finally {
			await cleanup([userId]);
		}
	});

	test("deleting a profile cascades to its attributes; deleting a user cascades to profile attributes", async () => {
		const { userId } = await seedUser();
		const profile = await createProfile(userId, {
			type: "social",
			name: "Work",
		});
		await updateProfileAttribute(userId, profile.id, "bio", "x");

		await deleteProfile(userId, profile.id);
		const profileRows = await pool.query(
			'SELECT 1 FROM "contextual_profiles" WHERE "id" = $1',
			[profile.id],
		);
		const attrRows = await pool.query(
			'SELECT 1 FROM "profile_attributes" WHERE "profile_id" = $1',
			[profile.id],
		);
		expect(profileRows.rowCount).toBe(0);
		expect(attrRows.rowCount).toBe(0);

		const second = await createProfile(userId, {
			type: "banking",
			name: "Bank",
		});
		await pool.query('DELETE FROM "user" WHERE "id" = $1', [userId]);
		const secondProfileRows = await pool.query(
			'SELECT 1 FROM "contextual_profiles" WHERE "id" = $1',
			[second.id],
		);
		const secondAttrRows = await pool.query(
			'SELECT 1 FROM "profile_attributes" WHERE "profile_id" = $1',
			[second.id],
		);
		expect(secondProfileRows.rowCount).toBe(0);
		expect(secondAttrRows.rowCount).toBe(0);
	});

	test("profiles are scoped to their owner (cross-user isolation)", async () => {
		const alice = await seedUser({ firstName: "Alice", lastName: "A" });
		const bob = await seedUser({ firstName: "Bob", lastName: "B" });
		try {
			const profile = await createProfile(alice.userId, {
				type: "social",
				name: "Alice Work",
			});

			expect(await listProfiles(bob.userId)).toHaveLength(0);
			await expect(getProfile(bob.userId, profile.id)).rejects.toMatchObject({
				status: "NOT_FOUND",
			});
			await expect(
				updateProfileMetadata(bob.userId, profile.id, { name: "Hijacked" }),
			).rejects.toMatchObject({ status: "NOT_FOUND" });
			await expect(
				updateProfileAttribute(bob.userId, profile.id, "bio", "hacked"),
			).rejects.toMatchObject({ status: "NOT_FOUND" });
			await expect(deleteProfile(bob.userId, profile.id)).rejects.toMatchObject(
				{ status: "NOT_FOUND" },
			);

			const intact = await getProfile(alice.userId, profile.id);
			expect(intact.name).toBe("Alice Work");
			expect(intact.resolved.firstName).toBe("Alice");
			expect(intact.attributes.bio).toBe("");
		} finally {
			await cleanup([alice.userId, bob.userId]);
		}
	}, 30_000);
});
