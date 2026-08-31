import { config } from "dotenv";

// bun test loads `.env` but not `.env.local`; the latter holds local
// BETTER_AUTH_* values that the OAuth provider plugin needs at init time.
config({ path: [".env.local", ".env"] });
