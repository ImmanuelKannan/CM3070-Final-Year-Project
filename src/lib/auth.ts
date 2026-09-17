import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#/db";
import { identityAttributes } from "#/db/schema";
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
				after: async (user) => {
					if (user.accountKind === "developer") return;
					await db.insert(identityAttributes).values([
						{ userId: user.id, key: "email", value: user.email },
						{
							userId: user.id,
							key: "firstName",
							value: String(user.firstName ?? ""),
						},
						{
							userId: user.id,
							key: "lastName",
							value: String(user.lastName ?? ""),
						},
					]);
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
