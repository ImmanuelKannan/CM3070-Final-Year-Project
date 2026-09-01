import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#/db";
import { resolveOAuthProviderConsentReference } from "#/lib/consent-grants";
import { ALLOWED_ATTRIBUTE_KEYS } from "#/lib/profile-catalogue";
import { normalizeRegistrationName } from "#/lib/registration";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg", transaction: true }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		maxPasswordLength: 128,
	},
	user: {
		additionalFields: {
			firstName: { type: "string", required: true, returned: false },
			lastName: { type: "string", required: true, returned: false },
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const firstName = normalizeRegistrationName(
						user.firstName,
						"First name",
					);
					const lastName = normalizeRegistrationName(
						user.lastName,
						"Last name",
					);

					return {
						data: {
							...user,
							firstName,
							lastName,
							name: `${firstName} ${lastName}`,
						},
					};
				},
			},
		},
	},
	plugins: [
		jwt({
			jwt: {
				issuer: process.env.BETTER_AUTH_URL,
			},
		}),
		oauthProvider({
			loginPage: "/sign-in",
			consentPage: "/oauth/consent",
			scopes: [
				"openid",
				"profile",
				"email",
				"offline_access",
				...ALLOWED_ATTRIBUTE_KEYS,
			],
			allowDynamicClientRegistration: false,
			silenceWarnings: {
				oauthAuthServerConfig: true,
				openidConfig: true,
			},
			postLogin: {
				page: "/oauth/consent",
				shouldRedirect: () => false,
				consentReferenceId: async ({ user, scopes }) =>
					resolveOAuthProviderConsentReference(user.id, scopes),
			},
		}),
		tanstackStartCookies(),
	],
});
