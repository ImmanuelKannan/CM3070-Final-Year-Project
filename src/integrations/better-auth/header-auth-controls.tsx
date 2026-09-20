import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "#/lib/auth-client";
import { messages } from "#/lib/i18n";

const AVATAR_SIZE = "size-9";

function avatarInitial(name: string, email: string): string {
	const source = name?.trim() || email;
	return source ? source.charAt(0).toUpperCase() : "?";
}

function Avatar({
	name,
	email,
	image,
}: {
	name: string | null | undefined;
	email: string;
	image: string | null | undefined;
}) {
	if (image) {
		return (
			<img
				src={image}
				alt={messages.auth.avatarAlt.replace("{name}", name?.trim() || email)}
				className={`${AVATAR_SIZE} rounded-full border border-line object-cover`}
			/>
		);
	}
	return (
		<span
			aria-hidden="true"
			className={`${AVATAR_SIZE} inline-flex items-center justify-center rounded-full border border-line bg-bg-base text-sm font-semibold text-sea-ink-soft`}
		>
			{avatarInitial(name ?? "", email)}
		</span>
	);
}

export function HeaderAuthControls() {
	const { data: session, isPending } = authClient.useSession();
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [signOutError, setSignOutError] = useState(false);

	if (isPending) {
		return (
			<div
				aria-hidden="true"
				className={`${AVATAR_SIZE} animate-pulse rounded-full bg-bg-base`}
			/>
		);
	}

	if (session?.user) {
		const { user } = session;
		const display = user.name?.trim() || user.email;

		async function handleSignOut() {
			if (isSigningOut) return;
			setIsSigningOut(true);
			setSignOutError(false);

			try {
				const { error } = await authClient.signOut();
				if (error) {
					setSignOutError(true);
					return;
				}
				window.location.assign("/");
			} catch {
				setSignOutError(true);
			} finally {
				setIsSigningOut(false);
			}
		}

		return (
			<div className="grid justify-items-end gap-1">
				<div className="flex items-center gap-2">
					<Link
						to="/"
						aria-label={messages.nav.dashboard}
						className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-semibold text-sea-ink no-underline hover:bg-lagoon/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						<Avatar name={user.name} email={user.email} image={user.image} />
						<span className="hidden text-sm sm:inline">{display}</span>
					</Link>
					<button
						type="button"
						onClick={handleSignOut}
						disabled={isSigningOut}
						className="inline-flex items-center justify-center rounded-lg border border-line bg-bg-surface px-3 py-2 text-sm font-semibold text-sea-ink transition-colors hover:bg-lagoon/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSigningOut ? messages.nav.signingOut : messages.nav.signOut}
					</button>
				</div>
				{signOutError ? (
					<p role="alert" className="text-xs font-semibold text-destructive">
						{messages.auth.signOutError}
					</p>
				) : null}
			</div>
		);
	}

	return (
		<Link
			to="/sign-in"
			className="inline-flex items-center justify-center rounded-lg bg-sea-ink px-3.5 py-2 text-sm font-semibold text-foam no-underline transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
		>
			{messages.nav.signIn}
		</Link>
	);
}
