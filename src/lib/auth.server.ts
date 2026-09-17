import { getRequestHeaders } from "@tanstack/react-start/server";
import { APIError } from "better-auth/api";

import { auth } from "#/lib/auth";
import type { AccountKind } from "#/lib/registration";

export async function getSessionFromRequest() {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	return session ?? null;
}

export async function requireAccountKind(
	kind: AccountKind,
	errorMessage: string,
): Promise<string> {
	const session = await getSessionFromRequest();
	if (!session) {
		throw new APIError("UNAUTHORIZED", { message: "Sign in to continue" });
	}
	if (session.user.accountKind !== kind) {
		throw new APIError("FORBIDDEN", { message: errorMessage });
	}
	return session.user.id;
}
