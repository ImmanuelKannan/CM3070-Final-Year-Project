import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useState } from "react";
import { messages } from "#/lib/i18n";
import {
	type FieldDef,
	PROFILE_TABS,
	type ProfileTab,
	TAB_FIELDS,
	TAB_LABELS,
} from "#/lib/profile-catalogue";
import { cn } from "#/lib/utils";

import { ProfileField } from "./ProfileField";

type Props = {
	activeTab?: ProfileTab;
	onTabChange?: (tab: ProfileTab) => void;
	attributes: Record<string, string>;
	onAttributeChange: (key: string, value: string) => void;
	onSaveAttribute?: (key: string, value: string) => Promise<void>;
	resolved?: Record<string, string>;
	emptyHint?: string;
	identityExtras?: React.ReactNode;
};

function tabIndex(tab: ProfileTab): number {
	return PROFILE_TABS.indexOf(tab);
}

export function IdentityDataTabs({
	activeTab: controlledActiveTab,
	onTabChange: controlledOnTabChange,
	attributes,
	onAttributeChange,
	onSaveAttribute,
	resolved,
	emptyHint,
	identityExtras,
}: Props) {
	const [internalActiveTab, setInternalActiveTab] =
		useState<ProfileTab>("identity");
	const activeTab = controlledActiveTab ?? internalActiveTab;
	const onTabChange = controlledOnTabChange ?? setInternalActiveTab;

	const currentIdx = tabIndex(activeTab);
	const tablistId = useId();

	const goPrev = () => {
		const prev = (currentIdx - 1 + PROFILE_TABS.length) % PROFILE_TABS.length;
		onTabChange(PROFILE_TABS[prev]);
	};
	const goNext = () => {
		const next = (currentIdx + 1) % PROFILE_TABS.length;
		onTabChange(PROFILE_TABS[next]);
	};

	const fields: FieldDef[] = TAB_FIELDS[activeTab];
	const visibleFields = identityExtras
		? fields.filter((field) => field.key !== "profilePicture")
		: fields;

	return (
		<div className="rounded-2xl border border-line bg-bg-surface">
			<div
				role="tablist"
				aria-label="Identity sections"
				id={tablistId}
				className="overflow-x-auto border-b border-line"
			>
				<div className="flex min-w-max px-1 pt-1">
					{PROFILE_TABS.map((tab) => {
						const isActive = tab === activeTab;
						return (
							<button
								key={tab}
								type="button"
								role="tab"
								id={`${tablistId}-tab-${tab}`}
								aria-selected={isActive}
								aria-controls={`${tablistId}-panel-${tab}`}
								tabIndex={isActive ? 0 : -1}
								onClick={() => onTabChange(tab)}
								className={cn(
									"relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring",
									isActive
										? "text-sea-ink"
										: "text-sea-ink-soft hover:text-sea-ink",
								)}
							>
								{TAB_LABELS[tab]}
								{isActive ? (
									<span
										aria-hidden="true"
										className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-lagoon"
									/>
								) : null}
							</button>
						);
					})}
				</div>
			</div>

			<div
				role="tabpanel"
				id={`${tablistId}-panel-${activeTab}`}
				aria-labelledby={`${tablistId}-tab-${activeTab}`}
				className="p-6 sm:p-8"
			>
				{activeTab === "identity" && identityExtras ? (
					<div className="mb-6">{identityExtras}</div>
				) : null}
				<div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
					{visibleFields.map((f) => {
						const span =
							f.type === "textarea" || f.key === "profilePicture"
								? "sm:col-span-2"
								: "";
						const value = attributes[f.key] ?? "";
						return (
							<div key={f.key} className={span}>
								<ProfileField
									field={f}
									value={value}
									onChange={onAttributeChange}
									allAttributes={attributes}
									onSave={onSaveAttribute}
								/>
								{emptyHint && value === "" && resolved ? (
									<p className="mt-1 text-xs text-sea-ink-soft">
										{emptyHint} {resolved[f.key] ? `(${resolved[f.key]})` : ""}
									</p>
								) : null}
							</div>
						);
					})}
				</div>
			</div>

			<div className="flex items-center justify-end border-t border-line px-4 py-3">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={goPrev}
						aria-label={messages.profiles.tabPrevious}
						className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-bg-base text-sea-ink-soft transition-colors hover:bg-lagoon/10 hover:text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						<ChevronLeft aria-hidden="true" className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={goNext}
						aria-label={messages.profiles.tabNext}
						className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-bg-base text-sea-ink-soft transition-colors hover:bg-lagoon/10 hover:text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						<ChevronRight aria-hidden="true" className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
