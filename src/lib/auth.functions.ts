import { createServerFn } from "@tanstack/react-start";

import { getSessionFromRequest } from "#/lib/auth.server";

export const getSession = createServerFn({ method: "GET" }).handler(async () =>
	getSessionFromRequest(),
);
