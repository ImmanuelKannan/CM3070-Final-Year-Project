import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#/db";
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
			jwks: {
				disablePrivateKeyEncryption: process.env.NODE_ENV === "development",
			},
			jwt: {
				issuer: process.env.BETTER_AUTH_URL,
			},
		}),
		oauthProvider({
			loginPage: "/sign-in",
			consentPage: "/oauth/consent",
			scopes: ["openid", "profile", "email", "offline_access"],
			allowDynamicClientRegistration: false,
			silenceWarnings: {
				oauthAuthServerConfig: true,
				openidConfig: true,
			},
		}),
		tanstackStartCookies(),
	],
});
