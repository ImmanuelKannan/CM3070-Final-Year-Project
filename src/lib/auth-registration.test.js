import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { pool } from "#/db";
import { auth } from "#/lib/auth";

function registration(overrides = {}) {
	const email = `${randomUUID()}@example.com`;
	return {
		name: "ignored by the server",
		firstName: " Ada ",
		lastName: " Lovelace ",
		email,
		password: "correct-horse-battery",
		...overrides,
	};
}

test("registration validates its boundary and creates the base identity", async () => {
	const valid = registration();
	const attemptedEmails = [valid.email];

	try {
		await expect(
			auth.api.signUpEmail({
				body: registration({ firstName: " ", email: attemptedEmails[0] }),
			}),
		).rejects.toThrow("First name is required");
		await expect(
			auth.api.signUpEmail({
				body: registration({
					email: "not-an-email",
				}),
			}),
		).rejects.toThrow();
		await expect(
			auth.api.signUpEmail({
				body: registration({
					email: `${randomUUID()}@example.com`,
					password: "short",
				}),
			}),
		).rejects.toThrow();

		const result = await auth.api.signUpEmail({
			body: valid,
			returnHeaders: true,
		});
		expect(result.response.user.name).toBe("Ada Lovelace");
		expect(result.headers.has("set-cookie")).toBe(true);

		const attributes = await pool.query(
			`SELECT ia."key", ia."value"
			 FROM "identity_attributes" ia
			 JOIN "user" u ON u."id" = ia."user_id"
			 WHERE u."email" = $1
			 ORDER BY ia."key"`,
			[valid.email],
		);
		expect(attributes.rows).toEqual([
			{ key: "email", value: valid.email },
			{ key: "firstName", value: "Ada" },
			{ key: "lastName", value: "Lovelace" },
		]);
	} finally {
		await pool.query('DELETE FROM "user" WHERE "email" = ANY($1)', [
			attemptedEmails,
		]);
	}
});
