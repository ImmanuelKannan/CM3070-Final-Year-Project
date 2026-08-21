import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"] });

const connectionString = process.env.DATABASE_URL_DIRECT;

if (!connectionString) {
	throw new Error(
		"DATABASE_URL_DIRECT is not set — migrations need the direct (non-pooled) Neon endpoint (see .env.example)",
	);
}

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: connectionString,
	},
});
