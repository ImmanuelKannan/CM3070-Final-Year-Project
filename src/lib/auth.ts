import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
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
	plugins: [tanstackStartCookies()],
});
