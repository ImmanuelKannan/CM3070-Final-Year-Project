import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
	beforeLoad: ({ context }) => {
		throw redirect({
			to:
				context.session.user.accountKind === "developer"
					? "/developer"
					: "/profiles",
		});
	},
});
