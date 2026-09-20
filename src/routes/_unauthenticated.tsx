import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/_unauthenticated")({
  beforeLoad: async () => {
    const session = await getSession();

    if (session) {
      throw redirect({ to: "/" });
    }
	},
	component: Outlet,
});
