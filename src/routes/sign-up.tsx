import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useId, useState } from "react";
import { Input } from "#/components/ui/input";
import { getSession } from "#/lib/auth.functions";
import { authClient } from "#/lib/auth-client";
import { messages } from "#/lib/i18n";

export const Route = createFileRoute("/sign-up")({
	beforeLoad: async () => {
		if (await getSession()) throw redirect({ to: "/dashboard" });
	},
	component: SignUp,
});

function SignUp() {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	const firstNameId = useId();
	const lastNameId = useId();
	const emailId = useId();
	const passwordId = useId();
	const errorId = useId();

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (isPending) return;
		setIsPending(true);
		setError(null);

		const normalizedFirstName = firstName.trim();
		const normalizedLastName = lastName.trim();

		try {
			const { error: signUpError } = await authClient.signUp.email({
				firstName: normalizedFirstName,
				lastName: normalizedLastName,
				name: `${normalizedFirstName} ${normalizedLastName}`,
				email: email.trim(),
				password,
			});

			if (signUpError) {
				setError(messages.auth.signUp.errorBody);
				return;
			}

			window.location.assign("/dashboard");
		} catch {
			setError(messages.auth.signUp.errorBody);
		} finally {
			setIsPending(false);
		}
	}

	const describedBy = error ? errorId : undefined;

	return (
		<div className="mx-auto grid w-full max-w-md gap-8 px-4">
			<header className="grid gap-2">
				<h1 className="font-display text-3xl font-bold tracking-tight text-sea-ink sm:text-4xl">
					{messages.auth.signUp.title}
				</h1>
				<p className="text-base leading-relaxed text-sea-ink-soft">
					{messages.auth.signUp.lede}
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
						<p className="font-semibold">{messages.auth.signUp.errorHeading}</p>
						<p>{error}</p>
					</div>
				) : null}

				<div className="grid gap-5 sm:grid-cols-2">
					<div className="grid gap-1.5">
						<label htmlFor={firstNameId} className="font-semibold text-sea-ink">
							{messages.auth.signUp.firstNameLabel}
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
							disabled={isPending}
							aria-describedby={describedBy}
						/>
					</div>

					<div className="grid gap-1.5">
						<label htmlFor={lastNameId} className="font-semibold text-sea-ink">
							{messages.auth.signUp.lastNameLabel}
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
							disabled={isPending}
							aria-describedby={describedBy}
						/>
					</div>
				</div>

				<div className="grid gap-1.5">
					<label htmlFor={emailId} className="font-semibold text-sea-ink">
						{messages.auth.signUp.emailLabel}
					</label>
					<Input
						id={emailId}
						name="email"
						type="email"
						autoComplete="email"
						inputMode="email"
						required
						placeholder={messages.auth.signUp.emailPlaceholder}
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						disabled={isPending}
						aria-describedby={describedBy}
					/>
				</div>

				<div className="grid gap-1.5">
					<label htmlFor={passwordId} className="font-semibold text-sea-ink">
						{messages.auth.signUp.passwordLabel}
					</label>
					<Input
						id={passwordId}
						name="password"
						type="password"
						autoComplete="new-password"
						required
						minLength={8}
						maxLength={128}
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						disabled={isPending}
						aria-describedby={describedBy}
					/>
					<p className="text-sm text-sea-ink-soft">
						{messages.auth.signUp.passwordHint}
					</p>
				</div>

				<button
					type="submit"
					disabled={isPending}
					className="inline-flex items-center justify-center rounded-lg bg-sea-ink px-4 py-2.5 font-semibold text-foam no-underline transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isPending
						? messages.auth.signUp.submitting
						: messages.auth.signUp.submit}
				</button>

				<p className="text-center text-sm text-sea-ink-soft">
					{messages.auth.signUp.hasAccount}{" "}
					<Link
						to="/sign-in"
						className="font-semibold text-sea-ink underline decoration-line underline-offset-4 hover:text-lagoon-deep focus-visible:rounded-sm focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						{messages.auth.signUp.signIn}
					</Link>
				</p>
			</form>
		</div>
	);
}
