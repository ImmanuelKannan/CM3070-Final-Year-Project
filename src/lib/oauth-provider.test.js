import { describe, expect, test } from "bun:test";

import { pool } from "#/db";
import { ALLOWED_ATTRIBUTE_KEYS } from "#/lib/profile-catalogue";
import { auth } from "./auth";

const BASE = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

describe("OAuth/OIDC discovery documents", () => {
	test("OpenID configuration is served at its standard location", async () => {
		const res = await auth.handler(
			new Request(`${BASE}/.well-known/openid-configuration`),
		);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("application/json");

		const body = await res.json();
		expect(body.issuer).toBe(BASE);
		expect(body.authorization_endpoint).toBe(
			`${BASE}/api/auth/oauth2/authorize`,
		);
		expect(body.token_endpoint).toBe(`${BASE}/api/auth/oauth2/token`);
		expect(body.jwks_uri).toBe(`${BASE}/api/auth/jwks`);
		expect(body.userinfo_endpoint).toBe(`${BASE}/api/auth/oauth2/userinfo`);
		expect(body.scopes_supported).toEqual([
			...new Set([
				"openid",
				"profile",
				"email",
				"offline_access",
				...ALLOWED_ATTRIBUTE_KEYS,
			]),
		]);
		// Dynamic client registration is disabled, so no registration endpoint
		// is advertised.
		expect(body.registration_endpoint).toBeUndefined();
	});

	test("OAuth authorization server metadata is served", async () => {
		const res = await auth.handler(
			new Request(`${BASE}/.well-known/oauth-authorization-server`),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.issuer).toBe(BASE);
		expect(body.authorization_endpoint).toBe(
			`${BASE}/api/auth/oauth2/authorize`,
		);
	});

	test("JWKS returns signing keys", async () => {
		const res = await auth.handler(new Request(`${BASE}/api/auth/jwks`));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(Array.isArray(body.keys)).toBe(true);
		expect(body.keys.length).toBeGreaterThan(0);
		for (const key of body.keys) {
			expect(key.kid).toBeTruthy();
			expect(key.kty).toBeTruthy();
		}
	});
});

describe("OAuth provider persistence contract", () => {
	test("provider and key tables exist with the expected columns", async () => {
		const result = await pool.query(
			`SELECT table_name, column_name
			 FROM information_schema.columns
			 WHERE table_schema = 'public'
			   AND table_name IN (
			     'oauth_client',
			     'oauth_consent',
			     'oauth_access_token',
			     'oauth_refresh_token',
			     'jwks'
			   )
			 ORDER BY table_name, column_name`,
		);

		const columns = new Map();
		for (const row of result.rows) {
			if (!columns.has(row.table_name)) columns.set(row.table_name, []);
			columns.get(row.table_name).push(row.column_name);
		}

		expect(columns.get("oauth_client")).toContain("client_id");
		expect(columns.get("oauth_client")).toContain("redirect_uris");
		expect(columns.get("oauth_consent")).toContain("scopes");
		expect(columns.get("oauth_access_token")).toContain("token");
		expect(columns.get("oauth_refresh_token")).toContain("token");
		expect(columns.get("jwks")).toContain("public_key");
		expect(columns.get("jwks")).toContain("private_key");
	});
});
