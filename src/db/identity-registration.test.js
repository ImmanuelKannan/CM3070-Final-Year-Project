import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { pool } from "./index";

const insertUser = `
	INSERT INTO "user" ("id", "name", "first_name", "last_name", "email")
	VALUES ($1, $2, $3, $4, $5)
`;

test("identity initialization rolls back and can be retried without duplicates", async () => {
	const client = await pool.connect();
	const userId = randomUUID();
	const email = `${userId}@example.com`;

	try {
		await client.query("BEGIN");
		await client.query(`
			ALTER TABLE "identity_attributes"
			ADD CONSTRAINT "test_reject_first_name"
			CHECK ("key" <> 'firstName') NOT VALID
		`);
		await client.query("SAVEPOINT failed_registration");

		await expect(
			client.query(insertUser, [
				userId,
				"Ada Lovelace",
				"Ada",
				"Lovelace",
				email,
			]),
		).rejects.toThrow();
		await client.query("ROLLBACK TO SAVEPOINT failed_registration");

		const failedUser = await client.query(
			' SELECT 1 FROM "user" WHERE "id" = $1',
			[userId],
		);
		expect(failedUser.rowCount).toBe(0);

		await client.query(
			'ALTER TABLE "identity_attributes" DROP CONSTRAINT "test_reject_first_name"',
		);
		await client.query(insertUser, [
			userId,
			"Ada Lovelace",
			"Ada",
			"Lovelace",
			email,
		]);

		const attributes = await client.query(
			' SELECT "key", "value" FROM "identity_attributes" WHERE "user_id" = $1 ORDER BY "key"',
			[userId],
		);
		expect(attributes.rows).toEqual([
			{ key: "email", value: email },
			{ key: "firstName", value: "Ada" },
			{ key: "lastName", value: "Lovelace" },
		]);
	} finally {
		await client.query("ROLLBACK");
		client.release();
	}
});
