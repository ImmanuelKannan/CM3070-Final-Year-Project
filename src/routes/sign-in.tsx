import { createFileRoute, redirect } from "@tanstack/react-router";
import { useId, useState } from "react";
import { getSession } from "#/lib/auth.functions";
import { authClient } from "#/lib/auth-client";
import { messages } from "#/lib/i18n";

export const Route = createFileRoute("/sign-in")({
	beforeLoad: async () => {
		if (await getSession()) throw redirect({ to: "/dashboard" });
	},
	component: SignIn,
});

function SignIn() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	const emailId = useId();
	const passwordId = useId();
	const errorId = useId();

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (isPending) return;
		setIsPending(true);
		setError(null);

		try {
			const { error: signInError } = await authClient.signIn.email({
				email: email.trim(),
				password,
			});

			if (signInError) {
				setError(messages.auth.signIn.errorBody);
				return;
			}

			window.location.assign("/dashboard");
		} catch {
			setError(messages.auth.signIn.errorBody);
		} finally {
			setIsPending(false);
		}
	}

	return (
		<div className="mx-auto grid w-full max-w-md gap-8 px-4">
			<header className="grid gap-2">
				<h1 className="font-display text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
					{messages.auth.signIn.title}
				</h1>
				<p className="text-base leading-relaxed text-sea-ink-soft">
					{messages.auth.signIn.lede}
				</p>
			</header>

			<form
				className="grid gap-5 rounded-2xl border border-line bg-bg-surface p-6"
				onSubmit={handleSubmit}
			>
				{error ? (
					<div
						id={errorId}
						role="alert"
						aria-live="assertive"
						className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
					>
						<p className="font-semibold">{messages.auth.signIn.errorHeading}</p>
						<p>{error}</p>
					</div>
				) : null}

				<div className="grid gap-1.5">
					<label htmlFor={emailId} className="font-semibold text-sea-ink">
						{messages.auth.signIn.emailLabel}
					</label>
					<input
						id={emailId}
						name="email"
						type="email"
						autoComplete="email"
						inputMode="email"
						required
						placeholder={messages.auth.signIn.emailPlaceholder}
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						disabled={isPending}
						aria-describedby={error ? errorId : undefined}
						className="w-full rounded-lg border border-line bg-bg-base px-3.5 py-2.5 text-sea-ink placeholder:text-sea-ink-soft focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
					/>
				</div>

				<div className="grid gap-1.5">
					<label htmlFor={passwordId} className="font-semibold text-sea-ink">
						{messages.auth.signIn.passwordLabel}
					</label>
					<input
						id={passwordId}
						name="password"
						type="password"
						autoComplete="current-password"
						required
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						disabled={isPending}
						aria-describedby={error ? errorId : undefined}
						className="w-full rounded-lg border border-line bg-bg-base px-3.5 py-2.5 text-sea-ink placeholder:text-sea-ink-soft focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
					/>
				</div>

				<button
					type="submit"
					disabled={isPending}
					className="inline-flex items-center justify-center rounded-lg bg-sea-ink px-4 py-2.5 font-semibold text-foam no-underline transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isPending
						? messages.auth.signIn.submitting
						: messages.auth.signIn.submit}
				</button>
			</form>
		</div>
	);
}
