import { afterEach, expect, mock, spyOn, test } from "bun:test";

import { db } from "#/db";
import { consentGrants } from "#/db/schema";
import { auth } from "#/lib/auth";
import { getConsentBoundUserInfoClaims } from "#/lib/consent-claims";
import * as consentGrantsModule from "#/lib/consent-grants";
import { approveConsentGrant } from "#/lib/consent-grants.server";
import { getAppContext, getSuggestedProfileId } from "#/lib/consent-preview";
import * as identityModule from "#/lib/identity";

const REDIRECT_URI = "https://bank.example.com/callback";

afterEach(() => {
	mock.restore();
});

test("suggestProfileId selects the correct matching contextual profile", () => {
	const profiles = [
		{ id: "profile-social", type: "social", name: "Social Identity" },
		{ id: "profile-banking", type: "banking", name: "Banking Identity" },
	];

	const applicationProfileType = getAppContext({ profileType: "banking" });
	expect(applicationProfileType).toBe("banking");
	expect(getSuggestedProfileId(applicationProfileType, profiles)).toBe(
		"profile-banking",
	);
});

test("an edit entered during approval is released in the Consent Grant", async () => {
	spyOn(identityModule, "getBaseIdentity").mockResolvedValue({
		firstName: "Chell",
		lastName: "Kannan",
	});
	spyOn(consentGrantsModule, "validateOauthQuery").mockResolvedValue(undefined);

	spyOn(db, "select").mockReturnValue({
		from: () => ({
			where: () => ({ limit: async () => [{ clientId: "banking-client-id" }] }),
		}),
	});

	let insertedGrant;
	const transaction = {
		select: () => ({
			from: () => ({ where: () => ({ limit: async () => [] }) }),
		}),
		insert: (table) => ({
			values: (values) => {
				if (table === consentGrants) insertedGrant = values;
				return { onConflictDoNothing: async () => ({}) };
			},
		}),
	};
	spyOn(db, "transaction").mockImplementation(async (callback) => callback(transaction));

	spyOn(auth.api, "oauth2Consent").mockResolvedValue({
		redirect: true,
		url: `${REDIRECT_URI}?code=test-code&state=some-state`,
	});

	const oauthQuery = new URLSearchParams({
		client_id: "banking-client-id",
		redirect_uri: REDIRECT_URI,
		response_type: "code",
		scope: "profile",
		state: "some-state",
	}).toString();

	await approveConsentGrant(
		{
			oauthQuery,
			selectedProfileId: null,
			approvedKeys: ["firstName", "lastName"],
			edits: { lastName: "Dharan" },
		},
		{ user: { id: "user-1", email: "chelle@example.com", emailVerified: true } },
		new Headers(),
	);

	expect(insertedGrant.releasedAttributes).toEqual({
		firstName: "Chell",
		lastName: "Dharan",
	});
	expect(insertedGrant.source).toEqual({ kind: "base" });
});

test("user info endpoint returns only the attributes the identity holder agreed to release", async () => {
	spyOn(db, "select").mockReturnValue({
		from: () => ({
			where: () => ({
				limit: async () => [
					{
						clientId: "bank-client-id",
						scopes: ["openid", "profile"],
						releasedAttributes: { firstName: "Chell", lastName: "Kannan" },
						authEmail: "chell@example.com",
						emailVerified: true,
					},
				],
			}),
		}),
	});

	const claims = await getConsentBoundUserInfoClaims({
		sub: "user-1",
		clientId: "bank-client-id",
		referenceId: "reference-1",
		scopes: ["openid", "profile"],
	});

	const released = Object.fromEntries(
		Object.entries(claims).filter(([, value]) => value !== undefined),
	);
	expect(released).toEqual({ given_name: "Chell", family_name: "Kannan" });
});
