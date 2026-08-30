import { UserCircle } from "lucide-react";

import { messages } from "#/lib/i18n";

type Props = {
	name: string;
	email: string;
	image: string | null | undefined;
};

function getInitials(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return "";
	const parts = trimmed.split(/\s+/).slice(0, 2);
	return parts
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("")
		.slice(0, 2);
}

export function ProfileSummaryCard({ name, email, image }: Props) {
	const displayName = name.trim() || messages.profiles.summaryNameFallback;
	const initials = getInitials(displayName);
	const avatarAlt = messages.auth.avatarAlt.replace("{name}", displayName);

	return (
		<section
			className="flex items-center gap-5 rounded-2xl border border-line bg-bg-surface p-6 sm:p-8"
			aria-label={displayName}
		>
			{image ? (
				<img
					src={image}
					alt={avatarAlt}
					className="h-16 w-16 flex-shrink-0 rounded-full border border-line object-cover sm:h-20 sm:w-20"
				/>
			) : initials ? (
				<span
					aria-hidden="true"
					className="inline-flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-lagoon text-xl font-bold text-foam sm:h-20 sm:w-20 sm:text-2xl"
				>
					{initials}
				</span>
			) : (
				<UserCircle
					aria-hidden="true"
					className="h-16 w-16 flex-shrink-0 text-sea-ink-soft sm:h-20 sm:w-20"
				/>
			)}

			<div className="min-w-0">
				<h2 className="font-display text-2xl font-bold text-sea-ink sm:text-3xl">
					{displayName}
				</h2>
				{email ? (
					<p className="mt-0.5 text-sm text-sea-ink-soft">{email}</p>
				) : null}
			</div>
		</section>
	);
}
