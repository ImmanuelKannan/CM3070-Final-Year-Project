import { describe, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";

import { pool } from "#/db";
import { updateBaseIdentity } from "./identity";
import {
	profilePictureObjectPath,
	profilePictureUserPrefix,
	uploadProfilePicture,
	validateProfilePicture,
} from "./profile-picture";
import {
	PROFILE_PICTURE_MAX_BYTES,
	validateProfilePictureMetadata,
} from "./profile-picture-rules";

const insertUser = `
	INSERT INTO "user" ("id", "name", "first_name", "last_name", "email")
	VALUES ($1, $2, $3, $4, $5)
`;

async function seedUser(overrides = {}) {
	const userId = randomUUID();
	const firstName = overrides.firstName ?? "Ada";
	const lastName = overrides.lastName ?? "Lovelace";
	await pool.query(insertUser, [
		userId,
		`${firstName} ${lastName}`,
		firstName,
		lastName,
		`${userId}@example.com`,
	]);
	return { userId };
}

// --- Valid image payloads ---------------------------------------------------

const JPEG_BYTES = new Uint8Array([
	0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0,
]);
const PNG_BYTES = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);
const WEBP_BYTES = new Uint8Array([
	...new TextEncoder().encode("RIFF"),
	0,
	0,
	0,
	0,
	...new TextEncoder().encode("WEBP"),
]);

function jpegFile() {
	return new File([JPEG_BYTES], "photo.jpg", { type: "image/jpeg" });
}
function pngFile() {
	return new File([PNG_BYTES], "photo.png", { type: "image/png" });
}
function webpFile() {
	return new File([WEBP_BYTES], "photo.webp", { type: "image/webp" });
}

// --- In-memory storage double ----------------------------------------------

function fakeStorage({ failPut = false } = {}) {
	const puts = [];
	const deletes = [];
	return {
		puts,
		deletes,
		async put(file, pathname) {
			if (failPut) throw new Error("blob store is down");
			puts.push({ pathname, size: file.size });
			return `https://store.public.blob.vercel-storage.com/${pathname}`;
		},
		async delete(target) {
			deletes.push(target);
		},
		isManagedUrl(url, userPrefix) {
			try {
				const { hostname, pathname } = new URL(url);
				return (
					hostname.endsWith(".blob.vercel-storage.com") &&
					pathname.startsWith(`/${userPrefix}`)
				);
			} catch {
				return false;
			}
		},
	};
}

async function profilePictureOf(userId) {
	const rows = await pool.query(
		'SELECT "value" FROM "identity_attributes" WHERE "user_id" = $1 AND "key" = $2',
		[userId, "profilePicture"],
	);
	return rows.rowCount ? rows.rows[0].value : null;
}

// --- Validation -------------------------------------------------------------

describe("validateProfilePicture", () => {
	test("accepts JPEG, PNG, and WebP with the matching extension", async () => {
		expect((await validateProfilePicture(jpegFile())).ext).toBe("jpg");
		expect((await validateProfilePicture(pngFile())).ext).toBe("png");
		expect((await validateProfilePicture(webpFile())).ext).toBe("webp");
	});

	test("rejects missing or non-blob input", async () => {
		await expect(validateProfilePicture(null)).rejects.toThrow(
			'multipart field named "file"',
		);
		await expect(validateProfilePicture("photo.jpg")).rejects.toThrow(
			'multipart field named "file"',
		);
	});

	test("rejects unsupported MIME types", async () => {
		const gif = new File([JPEG_BYTES], "photo.gif", { type: "image/gif" });
		await expect(validateProfilePicture(gif)).rejects.toThrow(
			"Only JPEG, PNG, or WebP images are supported",
		);
	});

	test("rejects payloads over 2 MiB", async () => {
		const big = new Blob([new Uint8Array(PROFILE_PICTURE_MAX_BYTES + 1)], {
			type: "image/jpeg",
		});
		await expect(validateProfilePicture(big)).rejects.toThrow(
			"Image must be 2 MiB or smaller",
		);
	});

	test("rejects content that does not match the declared type", async () => {
		const disguised = new File([PNG_BYTES], "photo.jpg", {
			type: "image/jpeg",
		});
		await expect(validateProfilePicture(disguised)).rejects.toThrow(
			"File content isn't valid",
		);
	});
});

// --- Object paths -----------------------------------------------------------

describe("validateProfilePictureMetadata", () => {
	test("accepts supported MIME types within the size limit", () => {
		expect(validateProfilePictureMetadata(jpegFile())).toMatchObject({
			ok: true,
			mime: "image/jpeg",
		});
		expect(validateProfilePictureMetadata(pngFile())).toMatchObject({
			ok: true,
			mime: "image/png",
		});
		expect(validateProfilePictureMetadata(webpFile())).toMatchObject({
			ok: true,
			mime: "image/webp",
		});
	});

	test("rejects unsupported MIME types", () => {
		const gif = new File([JPEG_BYTES], "photo.gif", { type: "image/gif" });
		expect(validateProfilePictureMetadata(gif)).toMatchObject({
			ok: false,
			reason: "type",
		});
	});

	test("rejects payloads over 2 MiB", () => {
		const big = new File(
			[new Uint8Array(PROFILE_PICTURE_MAX_BYTES + 1)],
			"photo.jpg",
			{ type: "image/jpeg" },
		);
		expect(validateProfilePictureMetadata(big)).toMatchObject({
			ok: false,
			reason: "size",
		});
	});
});

describe("profilePictureObjectPath", () => {
	test("is scoped to the user and randomized", () => {
		const userId = randomUUID();
		const namespace = createHash("sha256").update(userId).digest("hex");
		const first = profilePictureObjectPath(userId, "jpg");
		const second = profilePictureObjectPath(userId, "jpg");

		for (const path of [first, second]) {
			expect(path).toMatch(
				new RegExp(`^profile-pictures/${namespace}/[0-9a-f-]{36}\\.jpg$`),
			);
		}
		expect(first).not.toBe(second);

		const otherNamespace = createHash("sha256")
			.update("someone-else")
			.digest("hex");
		expect(profilePictureObjectPath("someone-else", "jpg")).toMatch(
			new RegExp(`^profile-pictures/${otherNamespace}/`),
		);
		expect(profilePictureObjectPath(userId, "webp")).toMatch(
			/^profile-pictures\/[0-9a-f]{64}\/[0-9a-f-]{36}\.webp$/,
		);
	});
});

// --- Upload flow ------------------------------------------------------------

describe("uploadProfilePicture", () => {
	test("storage failure leaves the profile untouched", async () => {
		const { userId } = await seedUser();
		const storage = fakeStorage({ failPut: true });
		try {
			await expect(
				uploadProfilePicture(userId, jpegFile(), storage),
			).rejects.toThrow(
				"Storage is unavailable. Your profile was not changed.",
			);

			expect(await profilePictureOf(userId)).toBeNull();
			const user = await pool.query(
				'SELECT "image" FROM "user" WHERE "id" = $1',
				[userId],
			);
			expect(user.rows[0].image).toBeNull();
			expect(storage.deletes).toEqual([]);
		} finally {
			await pool.query('DELETE FROM "user" WHERE "id" = $1', [userId]);
		}
	}, 15000);

	test("persistence failure deletes the freshly uploaded blob", async () => {
		const storage = fakeStorage();
		const userId = randomUUID(); // no user row -> the tag insert fails the FK
		await expect(
			uploadProfilePicture(userId, jpegFile(), storage),
		).rejects.toThrow();

		expect(storage.puts).toHaveLength(1);
		expect(storage.deletes).toEqual([storage.puts[0].pathname]);
		expect(
			(
				await pool.query(
					'SELECT 1 FROM "identity_attributes" WHERE "user_id" = $1',
					[userId],
				)
			).rowCount,
		).toBe(0);
	}, 15000);

	test("successful upload replaces the previous managed picture", async () => {
		const { userId } = await seedUser();
		const storage = fakeStorage();
		const oldUrl = `https://old.public.blob.vercel-storage.com/${profilePictureUserPrefix(userId)}old.jpg`;
		try {
			await updateBaseIdentity(userId, { profilePicture: oldUrl });

			const url = await uploadProfilePicture(userId, jpegFile(), storage);
			expect(url).toBe(
				`https://store.public.blob.vercel-storage.com/${storage.puts[0].pathname}`,
			);

			expect(await profilePictureOf(userId)).toBe(url);
			const user = await pool.query(
				'SELECT "image" FROM "user" WHERE "id" = $1',
				[userId],
			);
			expect(user.rows[0].image).toBe(url);
			// Old managed blob removed, fresh blob kept.
			expect(storage.deletes).toEqual([oldUrl]);
		} finally {
			await pool.query('DELETE FROM "user" WHERE "id" = $1', [userId]);
		}
	}, 15000);

	test("previous external and other-user picture URLs are never deleted", async () => {
		const { userId } = await seedUser();
		const storage = fakeStorage();
		try {
			for (const profilePicture of [
				"https://example.com/avatar.jpg",
				`https://store.public.blob.vercel-storage.com/${profilePictureUserPrefix("another-user")}avatar.jpg`,
			]) {
				await updateBaseIdentity(userId, { profilePicture });
				await uploadProfilePicture(userId, pngFile(), storage);
			}
			expect(storage.deletes).toEqual([]);
		} finally {
			await pool.query('DELETE FROM "user" WHERE "id" = $1', [userId]);
		}
	}, 15000);
});
