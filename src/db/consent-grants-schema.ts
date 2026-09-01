import {
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import type { ConsentGrantSource } from "#/lib/consent-grants";

import { user } from "./auth-schema.ts";
import { oauthClient } from "./oauth-schema.ts";

export const consentGrants = pgTable(
	"consent_grants",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		referenceId: text("reference_id").notNull(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "cascade" }),
		canonicalQuery: text("canonical_query").notNull(),
		scopes: jsonb("scopes").$type<string[]>().notNull(),
		source: jsonb("source").$type<ConsentGrantSource>().notNull(),
		releasedAttributes: jsonb("released_attributes")
			.$type<Record<string, string>>()
			.notNull(),
		authEmail: text("auth_email").notNull(),
		emailVerified: boolean("email_verified").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("consent_grants_user_reference_idx").on(
			table.userId,
			table.referenceId,
		),
	],
);
