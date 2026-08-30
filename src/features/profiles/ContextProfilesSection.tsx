import { Plus } from "lucide-react";
import { useId } from "react";
import { messages } from "#/lib/i18n";
import type { ProfileType } from "#/lib/profile-catalogue";

import { ContextProfileCard } from "./ContextProfileCard";

type ProfileSummary = {
	id: string;
	type: ProfileType;
	name: string;
	description: string;
};

type Props = {
	profiles: ProfileSummary[];
	onAddClick: () => void;
	onEdit: (profile: ProfileSummary) => void;
	onDelete: (profile: ProfileSummary) => void;
};

export function ContextProfilesSection({
	profiles,
	onAddClick,
	onEdit,
	onDelete,
}: Props) {
	const headingId = useId();

	return (
		<section aria-labelledby={headingId} className="grid gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2
						id={headingId}
						className="font-display text-2xl font-bold text-sea-ink sm:text-3xl"
					>
						{messages.profiles.contextHeading}
					</h2>
					<p className="mt-1 text-sm text-sea-ink-soft">
						{messages.profiles.contextLede}
					</p>
				</div>
				<button
					type="button"
					onClick={onAddClick}
					className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-sea-ink px-4 py-2.5 font-semibold text-foam no-underline transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
				>
					<Plus aria-hidden="true" className="h-4 w-4" />
					{messages.profiles.addProfile}
				</button>
			</div>

			{profiles.length === 0 ? (
				<div className="rounded-2xl border border-line bg-bg-surface p-6 text-center sm:p-8">
					<p className="text-sm text-sea-ink-soft">{messages.profiles.empty}</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{profiles.map((profile) => (
						<ContextProfileCard
							key={profile.id}
							profile={profile}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					))}
				</div>
			)}
		</section>
	);
}
