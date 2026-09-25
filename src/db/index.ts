import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
	connectionString,
	max: 5,
	idleTimeoutMillis: 20_000,
	connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
