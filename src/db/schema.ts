import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema.ts";

export * from "./auth-schema.ts";

export const identityAttributes = pgTable(
	"identity_attributes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		key: text("key").notNull(),
		value: text("value").notNull().default(""),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("identity_attributes_user_key_idx").on(table.userId, table.key),
		index("identity_attributes_user_id_idx").on(table.userId),
	],
);
