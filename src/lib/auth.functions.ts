import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { APIError } from "better-auth/api";

import { auth } from "#/lib/auth";

export async function getUserIdFromRequest(
	message = "Sign in to continue",
): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) {
		throw new APIError("UNAUTHORIZED", { message });
	}
	return session.user.id;
}

export const getSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		return session ?? null;
	},
);
