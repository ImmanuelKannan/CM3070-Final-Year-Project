import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profiles")({
	beforeLoad: () => {
		throw redirect({ to: "/" });
	},
});
