import { createFileRoute } from "@tanstack/react-router";

import { auth } from "#/lib/auth";

export const Route = createFileRoute("/.well-known/openid-configuration")({
	server: {
		handlers: {
			GET: ({ request }) => auth.handler(request),
		},
	},
});
