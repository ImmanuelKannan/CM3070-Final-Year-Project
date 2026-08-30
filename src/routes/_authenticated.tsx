import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { Sidebar } from "#/components/sidebar";
import { SkipLink } from "#/components/site-shell-component";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) throw redirect({ to: "/sign-in" });
		return { session };
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	return (
		<div className="flex h-dvh flex-col overflow-hidden bg-bg-base md:flex-row">
			<SkipLink />
			<Sidebar />
			<main
				id="main-content"
				className="min-h-0 flex-1 overflow-y-auto py-8 focus-visible:outline-none sm:py-12 lg:py-16"
				tabIndex={-1}
			>
				<Outlet />
			</main>
		</div>
	);
}
