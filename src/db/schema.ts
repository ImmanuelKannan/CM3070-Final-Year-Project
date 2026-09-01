import { sql } from "drizzle-orm";
import {
	check,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema.ts";

export * from "./auth-schema.ts";
export * from "./consent-grants-schema.ts";
export * from "./oauth-schema.ts";

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

export const contextualProfiles = pgTable(
	"contextual_profiles",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		type: text("type").notNull(),
		name: text("name").notNull(),
		description: text("description").notNull().default(""),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("contextual_profiles_user_type_idx").on(
			table.userId,
			table.type,
		),
		check(
			"contextual_profiles_type_check",
			sql`${table.type} in ('social', 'banking', 'school', 'others')`,
		),
		index("contextual_profiles_user_id_idx").on(table.userId),
	],
);

export const profileAttributes = pgTable(
	"profile_attributes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		profileId: uuid("profile_id")
			.notNull()
			.references(() => contextualProfiles.id, { onDelete: "cascade" }),
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
		uniqueIndex("profile_attributes_profile_key_idx").on(
			table.profileId,
			table.key,
		),
		index("profile_attributes_profile_id_idx").on(table.profileId),
	],
);
