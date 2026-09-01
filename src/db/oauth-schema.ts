import {
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { session, user } from "./auth-schema";

export const oauthClient = pgTable(
	"oauth_client",
	{
		id: text("id").primaryKey(),
		clientId: text("client_id").notNull().unique(),
		clientSecret: text("client_secret"),
		disabled: boolean("disabled"),
		skipConsent: boolean("skip_consent"),
		enableEndSession: boolean("enable_end_session"),
		subjectType: text("subject_type"),
		scopes: jsonb("scopes").$type<string[]>(),
		userId: text("user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
		name: text("name"),
		uri: text("uri"),
		icon: text("icon"),
		contacts: jsonb("contacts").$type<string[]>(),
		tos: text("tos"),
		policy: text("policy"),
		softwareId: text("software_id"),
		softwareVersion: text("software_version"),
		softwareStatement: text("software_statement"),
		redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
		postLogoutRedirectUris: jsonb("post_logout_redirect_uris").$type<
			string[]
		>(),
		tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
		grantTypes: jsonb("grant_types").$type<string[]>(),
		responseTypes: jsonb("response_types").$type<string[]>(),
		public: boolean("public"),
		type: text("type"),
		requirePKCE: boolean("require_pkce"),
		referenceId: text("reference_id"),
		metadata: jsonb("metadata").$type<Record<string, unknown>>(),
	},
	(table) => [index("oauth_client_user_id_idx").on(table.userId)],
);

export const oauthRefreshToken = pgTable(
	"oauth_refresh_token",
	{
		id: text("id").primaryKey(),
		token: text("token").notNull().unique(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "cascade" }),
		sessionId: text("session_id").references(() => session.id, {
			onDelete: "set null",
		}),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		referenceId: text("reference_id"),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }),
		revoked: timestamp("revoked", { withTimezone: true }),
		authTime: timestamp("auth_time", { withTimezone: true }),
		scopes: jsonb("scopes").$type<string[]>().notNull(),
	},
	(table) => [
		index("oauth_refresh_token_client_id_idx").on(table.clientId),
		index("oauth_refresh_token_session_id_idx").on(table.sessionId),
		index("oauth_refresh_token_user_id_idx").on(table.userId),
	],
);

export const oauthAccessToken = pgTable(
	"oauth_access_token",
	{
		id: text("id").primaryKey(),
		token: text("token").unique(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "cascade" }),
		sessionId: text("session_id").references(() => session.id, {
			onDelete: "set null",
		}),
		userId: text("user_id").references(() => user.id, {
			onDelete: "cascade",
		}),
		referenceId: text("reference_id"),
		refreshId: text("refresh_id").references(() => oauthRefreshToken.id, {
			onDelete: "cascade",
		}),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }),
		scopes: jsonb("scopes").$type<string[]>().notNull(),
	},
	(table) => [
		index("oauth_access_token_client_id_idx").on(table.clientId),
		index("oauth_access_token_session_id_idx").on(table.sessionId),
		index("oauth_access_token_user_id_idx").on(table.userId),
		index("oauth_access_token_refresh_id_idx").on(table.refreshId),
	],
);

export const oauthConsent = pgTable(
	"oauth_consent",
	{
		id: text("id").primaryKey(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "cascade" }),
		userId: text("user_id").references(() => user.id, {
			onDelete: "cascade",
		}),
		referenceId: text("reference_id"),
		scopes: jsonb("scopes").$type<string[]>().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("oauth_consent_client_id_idx").on(table.clientId),
		index("oauth_consent_user_id_idx").on(table.userId),
		uniqueIndex("oauth_consent_client_user_reference_idx").on(
			table.clientId,
			table.userId,
			table.referenceId,
		),
	],
);

export const jwks = pgTable("jwks", {
	id: text("id").primaryKey(),
	publicKey: text("public_key").notNull(),
	privateKey: text("private_key").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }),
});
