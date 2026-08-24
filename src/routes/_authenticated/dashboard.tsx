import { createFileRoute } from "@tanstack/react-router";

import { messages } from "#/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: Dashboard,
});

function Dashboard() {
	const { session } = Route.useRouteContext();
	const user = session.user;

	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<header className="grid max-w-3xl gap-3">
				<h1 className="font-display text-4xl leading-tight font-bold tracking-tight text-sea-ink sm:text-5xl">
					{messages.dashboard.title}
				</h1>
				<p className="text-lg leading-relaxed text-sea-ink-soft sm:text-xl">
					{messages.dashboard.lede}
				</p>
			</header>

			<section
				className="grid max-w-3xl gap-3 border-t border-line pt-6 sm:pt-10"
				aria-labelledby="dashboard-status"
			>
				<h2
					id="dashboard-status"
					className="font-display text-2xl font-bold text-sea-ink"
				>
					{user.name
						? messages.auth.signedInAs.replace("{name}", user.name)
						: messages.auth.signedInAsEmail.replace("{email}", user.email)}
				</h2>
				<p className="text-base leading-relaxed text-sea-ink-soft">
					{messages.dashboard.body}
				</p>
			</section>
		</div>
	);
}
