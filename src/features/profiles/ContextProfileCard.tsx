import { Pencil, Trash2 } from "lucide-react";
import { messages } from "#/lib/i18n";
import { PROFILE_TYPE_LABELS, type ProfileType } from "#/lib/profile-catalogue";

const TYPE_ICONS: Record<ProfileType, string> = {
	social: "👥",
	banking: "🏦",
	school: "🎓",
	employment: "💼",
	healthcare: "🩺",
	government: "🏛️",
	others: "📁",
};

type ProfileSummary = {
	id: string;
	type: ProfileType;
	name: string;
	description: string;
};

type Props = {
	profile: ProfileSummary;
	onEdit: (profile: ProfileSummary) => void;
	onDelete: (profile: ProfileSummary) => void;
};

export function ContextProfileCard({ profile, onEdit, onDelete }: Props) {
	const typeLabel = PROFILE_TYPE_LABELS[profile.type] ?? profile.type;

	return (
		<article className="relative flex flex-col gap-2 rounded-2xl border border-line bg-bg-surface p-5 transition-colors hover:border-lagoon/40">
			<div className="absolute right-3 top-3 flex gap-1 opacity-100">
				<button
					type="button"
					onClick={() => onEdit(profile)}
					aria-label={messages.profiles.editContextualProfile.replace(
						"{name}",
						profile.name,
					)}
					className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sea-ink-soft transition-colors hover:bg-lagoon/10 hover:text-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
				>
					<Pencil aria-hidden="true" className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onClick={() => onDelete(profile)}
					aria-label={messages.profiles.deleteContextualProfile.replace(
						"{name}",
						profile.name,
					)}
					className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sea-ink-soft transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
				>
					<Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
				</button>
			</div>

			<div className="flex items-center gap-3">
				<span
					aria-hidden="true"
					className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-base text-lg"
				>
					{TYPE_ICONS[profile.type] ?? "📁"}
				</span>
				<span className="text-xs font-semibold uppercase tracking-wide text-sea-ink-soft">
					{typeLabel}
				</span>
			</div>

			<h3 className="font-display text-base font-bold text-sea-ink">
				{profile.name}
			</h3>

			{profile.description ? (
				<p className="line-clamp-3 text-sm leading-relaxed text-sea-ink-soft">
					{profile.description}
				</p>
			) : null}
		</article>
	);
}
