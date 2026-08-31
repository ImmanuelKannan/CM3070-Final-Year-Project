import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "#/lib/auth";

export const authClient = createAuthClient({
	plugins: [inferAdditionalFields<typeof auth>(), oauthProviderClient()],
});

export const { oauth2 } = authClient;
