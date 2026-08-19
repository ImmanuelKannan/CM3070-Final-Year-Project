import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#/db";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [tanstackStartCookies()],
});
