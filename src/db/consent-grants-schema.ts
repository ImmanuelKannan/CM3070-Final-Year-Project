import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import type { ConsentDecision, ConsentGrantSource } from "#/lib/consent-grants";

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
			.references(() => oauthClient.clientId, { onDelete: "restrict" }),
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
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("consent_grants_user_reference_idx").on(
			table.userId,
			table.referenceId,
		),
	],
);

export const consentRequests = pgTable(
	"consent_requests",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		referenceId: text("reference_id").notNull(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "restrict" }),
		clientName: text("client_name").notNull(),
		scopes: jsonb("scopes").$type<string[]>().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("consent_requests_user_reference_idx").on(
			table.userId,
			table.referenceId,
		),
		index("consent_requests_user_created_at_idx").on(
			table.userId,
			table.createdAt,
		),
	],
);

export const consentRevocations = pgTable(
	"consent_revocations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "restrict" }),
		clientName: text("client_name").notNull(),
		scopes: jsonb("scopes").$type<string[]>().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("consent_revocations_user_id_idx").on(table.userId),
		index("consent_revocations_client_id_idx").on(table.clientId),
	],
);

export const consentDecisions = pgTable(
	"consent_decisions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		referenceId: text("reference_id").notNull(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "restrict" }),
		canonicalQuery: text("canonical_query").notNull(),
		canonicalScopes: jsonb("canonical_scopes").$type<string[]>().notNull(),
		decision: text("decision").$type<ConsentDecision>().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("consent_decisions_user_reference_idx").on(
			table.userId,
			table.referenceId,
		),
		check(
			"consent_decisions_decision_check",
			sql`${table.decision} in ('approved', 'rejected')`,
		),
	],
);
