import { afterEach, expect, mock, spyOn, test } from "bun:test";

import { db } from "#/db";
import { consentDecisions } from "#/db/schema";
import { auth } from "#/lib/auth";
import * as consentGrantsModule from "#/lib/consent-grants";
import { rejectConsentGrant } from "#/lib/consent-grants.server";

const REDIRECT_URI = "https://aurorabanking.example.com/callback";
const CLIENT_ID = "some-banking-client-id";
const STATE = "state-123";
const USER = { id: "user-1", email: "chell@example.com", emailVerified: true };

const oauthQuery = new URLSearchParams({
	client_id: CLIENT_ID,
	redirect_uri: REDIRECT_URI,
	response_type: "code",
	scope: "openid profile email",
	state: STATE,
}).toString();

afterEach(() => {
	mock.restore();
});

function setUpMocksForConsentDecision() {
	spyOn(consentGrantsModule, "validateOauthQuery").mockResolvedValue(undefined);

	spyOn(db, "select").mockReturnValue({
		from: () => ({
			where: () => ({ limit: async () => [{ clientId: CLIENT_ID }] }),
		}),
	});

	const captured = { insertedDecision: undefined };
	const transaction = {
		select: () => ({
			from: () => ({ where: () => ({ limit: async () => [] }) }),
		}),
		insert: (table) => ({
			values: (values) => {
				if (table === consentDecisions) captured.insertedDecision = values;
				return {};
			},
		}),
	};

	spyOn(db, "transaction").mockImplementation(async (callback) =>
		callback(transaction),
	);

	const calls = [];
	spyOn(auth.api, "oauth2Consent").mockImplementation(async (options) => {
		calls.push(options.body);
		return options.body.accept
			? { redirect: true, url: `${REDIRECT_URI}?code=test-code&state=${STATE}` }
			: {
					redirect: true,
					url: `${REDIRECT_URI}?error=access_denied&state=${STATE}`,
				};
	});

	return { captured, calls };
}

test("rejecting the flow returns access_denied without an authorization code", async () => {
	const { calls } = setUpMocksForConsentDecision();

	const result = await rejectConsentGrant(
		{ oauthQuery },
		{ user: USER },
		new Headers(),
	);

	expect(calls).toEqual([{ accept: false, oauth_query: oauthQuery }]);
	expect(result.redirect).toBe(true);
	const redirectUrl = new URL(result.url);
	expect(redirectUrl.searchParams.get("error")).toBe("access_denied");
	expect(redirectUrl.searchParams.get("code")).toBeNull();
});

test("the rejected consent decision is recorded in the DB transaction", async () => {
	const { captured } = setUpMocksForConsentDecision();

	await rejectConsentGrant({ oauthQuery }, { user: USER }, new Headers());

	expect(captured.insertedDecision).toBeDefined();
	expect(captured.insertedDecision.decision).toBe("rejected");
	expect(captured.insertedDecision.userId).toBe(USER.id);
	expect(captured.insertedDecision.clientId).toBe(CLIENT_ID);
	expect(captured.insertedDecision.canonicalScopes).toEqual([
		"email",
		"openid",
		"profile",
	]);
});
