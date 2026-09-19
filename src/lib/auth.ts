import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#/db";
import {
	getConsentBoundUserInfoClaims,
	suppressIdentityTokenClaims,
} from "#/lib/consent-claims";
import { resolveOAuthProviderConsentReference } from "#/lib/consent-grants";
import { ALLOWED_ATTRIBUTE_KEYS } from "#/lib/profile-catalogue";
import {
	normalizeAccountKind,
	normalizeRegistrationCompanyName,
	normalizeRegistrationName,
} from "#/lib/registration";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg", transaction: true }),
	disabledPaths: ["/oauth2/create-client"],
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		maxPasswordLength: 128,
	},
	user: {
		additionalFields: {
			firstName: { type: "string", required: false, returned: false },
			lastName: { type: "string", required: false, returned: false },
			accountKind: {
				type: "string",
				required: true,
				returned: true,
				defaultValue: "identity_holder",
			},
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const accountKind = normalizeAccountKind(user.accountKind);
					const email = user.email.trim().toLowerCase();

					if (accountKind === "developer") {
						const companyName = normalizeRegistrationCompanyName(user.name);
						return {
							data: {
								...user,
								accountKind,
								email,
								firstName: null,
								lastName: null,
								name: companyName,
							},
						};
					}

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
							accountKind,
							email,
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
			clientPrivileges: ({ user }) => user?.accountKind === "developer",
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
			customAccessTokenClaims: ({ referenceId }) =>
				referenceId ? { referenceId } : {},
			customIdTokenClaims: suppressIdentityTokenClaims,
			customUserInfoClaims: ({ scopes, jwt }) =>
				getConsentBoundUserInfoClaims({
					sub: jwt.sub,
					clientId: jwt.client_id ?? jwt.azp,
					referenceId: jwt.referenceId,
					scopes,
				}),
		}),
		tanstackStartCookies(),
	],
});
