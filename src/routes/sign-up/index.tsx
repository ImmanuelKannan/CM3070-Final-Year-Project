import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { messages } from "#/lib/i18n";

export const Route = createFileRoute("/sign-up/")({
	beforeLoad: async () => {
		const session = await getSession();
		if (session) {
			throw redirect({
				to:
					session.user.accountKind === "developer" ? "/developer" : "/profiles",
			});
		}
	},
	component: SignUpChooser,
});

function SignUpChooser() {
	return (
		<div className="mx-auto grid w-full max-w-2xl gap-8 px-4">
			<header className="grid gap-2">
				<h1 className="font-display text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
					{messages.auth.signUp.title}
				</h1>
				<p className="text-base leading-relaxed text-sea-ink-soft">
					{messages.auth.signUp.chooseLede}
				</p>
			</header>

			<div className="grid gap-4 sm:grid-cols-2">
				<AccountKindCard
					to="/sign-up/identity-holder"
					label={messages.auth.signUp.choiceIdentity}
					hint={messages.auth.signUp.choiceIdentityHint}
				/>
				<AccountKindCard
					to="/sign-up/developer"
					label={messages.auth.signUp.choiceDeveloper}
					hint={messages.auth.signUp.choiceDeveloperHint}
				/>
			</div>

			<p className="text-center text-sm text-sea-ink-soft">
				{messages.auth.signUp.hasAccount}{" "}
				<a
					href="/sign-in"
					className="font-semibold text-sea-ink underline decoration-line underline-offset-4 hover:text-lagoon-deep focus-visible:rounded-sm focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
				>
					{messages.auth.signUp.signIn}
				</a>
			</p>
		</div>
	);
}

function AccountKindCard({
	to,
	label,
	hint,
}: {
	to: "/sign-up/identity-holder" | "/sign-up/developer";
	label: string;
	hint: string;
}) {
	return (
		<Link
			to={to}
			className="grid gap-1 rounded-2xl border border-line bg-bg-surface p-6 no-underline transition-colors hover:border-lagoon/50 hover:bg-lagoon/5 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
		>
			<span className="font-display text-lg font-bold text-sea-ink">
				{label}
			</span>
			<span className="text-sm leading-relaxed text-sea-ink-soft">{hint}</span>
			<span className="mt-3 text-sm font-semibold text-lagoon-deep">
				{messages.auth.signUp.getStarted} →
			</span>
		</Link>
	);
}
