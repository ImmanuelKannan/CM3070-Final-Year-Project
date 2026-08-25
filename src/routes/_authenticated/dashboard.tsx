import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";

import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import { messages } from "#/lib/i18n";
import { getIdentity, updateIdentity } from "#/lib/identity.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
	loader: async () => ({ identity: await getIdentity() }),
	component: Dashboard,
});

function Dashboard() {
	const { identity: initial } = Route.useLoaderData();
	const { session } = Route.useRouteContext();
	const { data: clientSession, refetch: refetchSession } =
		authClient.useSession();

	const [firstName, setFirstName] = useState(initial.firstName);
	const [lastName, setLastName] = useState(initial.lastName);
	const [email, setEmail] = useState(initial.email);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	const statusHeadingId = useId();
	const personalHeadingId = useId();
	const contactHeadingId = useId();
	const firstNameId = useId();
	const lastNameId = useId();
	const emailId = useId();
	const emailHintId = useId();
	const errorId = useId();
	const successId = useId();

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (isPending) return;
		setError(null);
		setSuccess(null);
		setIsPending(true);

		try {
			const result = await updateIdentity({
				data: { firstName, lastName, email },
			});
			setFirstName(result.identity.firstName);
			setLastName(result.identity.lastName);
			setEmail(result.identity.email);
			setSuccess(messages.dashboard.identity.saved);
			void refetchSession().catch(() => undefined);
		} catch {
			setError(messages.dashboard.identity.errorBody);
		} finally {
			setIsPending(false);
		}
	}

	const user = clientSession?.user ?? session.user;

	return (
		<div className="mx-auto grid w-full max-w-3xl gap-8 px-4 sm:gap-12">
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
				aria-labelledby={statusHeadingId}
			>
				<h2
					id={statusHeadingId}
					className="font-display text-2xl font-bold text-sea-ink"
				>
					{user.name
						? messages.auth.signedInAs.replace("{name}", user.name)
						: messages.auth.signedInAsEmail.replace("{email}", user.email)}
				</h2>
				<p className="text-base leading-relaxed text-sea-ink-soft">
					{messages.dashboard.identity.lede}
				</p>
			</section>

			<form
				className="grid max-w-3xl gap-8 border-t border-line pt-6 sm:pt-10"
				onSubmit={handleSubmit}
				onInput={() => setSuccess(null)}
			>
				{error ? (
					<div
						id={errorId}
						role="alert"
						aria-live="assertive"
						className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
					>
						<p className="font-semibold">
							{messages.dashboard.identity.errorHeading}
						</p>
						<p>{error}</p>
					</div>
				) : null}

				{success ? (
					<output
						id={successId}
						aria-live="polite"
						className="text-sm font-semibold text-palm"
					>
						{success}
					</output>
				) : null}

				<fieldset
					className="grid gap-4"
					aria-labelledby={personalHeadingId}
					disabled={isPending}
				>
					<legend
						id={personalHeadingId}
						className="font-display text-xl font-bold text-sea-ink"
					>
						{messages.dashboard.identity.personalHeading}
					</legend>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-1.5">
							<label
								htmlFor={firstNameId}
								className="font-semibold text-sea-ink"
							>
								{messages.dashboard.identity.firstNameLabel}
							</label>
							<Input
								id={firstNameId}
								name="firstName"
								type="text"
								autoComplete="given-name"
								required
								maxLength={100}
								value={firstName}
								onChange={(event) => setFirstName(event.target.value)}
							/>
						</div>
						<div className="grid gap-1.5">
							<label
								htmlFor={lastNameId}
								className="font-semibold text-sea-ink"
							>
								{messages.dashboard.identity.lastNameLabel}
							</label>
							<Input
								id={lastNameId}
								name="lastName"
								type="text"
								autoComplete="family-name"
								required
								maxLength={100}
								value={lastName}
								onChange={(event) => setLastName(event.target.value)}
							/>
						</div>
					</div>
				</fieldset>

				<fieldset
					className="grid gap-4"
					aria-labelledby={contactHeadingId}
					disabled={isPending}
				>
					<legend
						id={contactHeadingId}
						className="font-display text-xl font-bold text-sea-ink"
					>
						{messages.dashboard.identity.contactHeading}
					</legend>
					<div className="grid gap-1.5">
						<label htmlFor={emailId} className="font-semibold text-sea-ink">
							{messages.dashboard.identity.emailLabel}
						</label>
						<Input
							id={emailId}
							name="email"
							type="email"
							autoComplete="email"
							inputMode="email"
							required
							maxLength={254}
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							aria-describedby={emailHintId}
						/>
						<p id={emailHintId} className="text-sm text-sea-ink-soft">
							{messages.dashboard.identity.emailHint}
						</p>
					</div>
				</fieldset>

				<div className="flex flex-wrap items-center gap-3">
					<button
						type="submit"
						disabled={isPending}
						className="inline-flex items-center justify-center rounded-lg bg-sea-ink px-4 py-2.5 font-semibold text-foam no-underline transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isPending
							? messages.dashboard.identity.saving
							: messages.dashboard.identity.save}
					</button>
				</div>
			</form>
		</div>
	);
}
