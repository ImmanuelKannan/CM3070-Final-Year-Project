import { getRequestHeaders } from "@tanstack/react-start/server";
import { APIError } from "better-auth/api";

import { auth } from "#/lib/auth";

export async function getUserIdFromRequest(
	errorMessage = "Sign in to continue",
): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) {
		throw new APIError("UNAUTHORIZED", { message: errorMessage });
	}
	return session.user.id;
}

export async function getSessionFromRequest() {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	return session ?? null;
}
