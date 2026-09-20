import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Input } from "#/components/ui/input";
import type { ProfileView } from "#/lib/contextual-profiles";
import { messages } from "#/lib/i18n";
import {
	PROFILE_TYPE_LABELS,
	PROFILE_TYPES,
	type ProfileType,
} from "#/lib/profile-catalogue";
import { cn } from "#/lib/utils";

import { IdentityDataTabs } from "./IdentityDataTabs";

type Props = {
	profile: ProfileView;
	open: boolean;
	onClose: () => void;
	onMetadataSave: (data: {
		type: ProfileType;
		name: string;
		description: string;
	}) => Promise<void>;
	onAttributeSave: (key: string, value: string) => Promise<void>;
	isMetadataPending: boolean;
	metadataError: string | null;
	loading?: boolean;
};

export function ContextProfileAttributesModal({
	profile,
	open,
	onClose,
	onMetadataSave,
	onAttributeSave,
	isMetadataPending,
	metadataError,
	loading = false,
}: Props) {
	const dialogRef = useRef<HTMLDialogElement | null>(null);

	const [type, setType] = useState<ProfileType>(profile.type);
	const [name, setName] = useState(profile.name);
	const [description, setDescription] = useState(profile.description);
	const [savedFlag, setSavedFlag] = useState(false);

	const titleId = useId();
	const typeId = useId();
	const nameId = useId();
	const descriptionId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	useEffect(() => {
		if (!open) return;
		setType(profile.type);
		setName(profile.name);
		setDescription(profile.description);
		setSavedFlag(false);
	}, [open, profile.type, profile.name, profile.description]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		const handleClose = () => onClose();
		dialog.addEventListener("close", handleClose);
		return () => dialog.removeEventListener("close", handleClose);
	}, [onClose]);

	const handleMetadataSubmit = useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			if (isMetadataPending) return;
			if (
				type === profile.type &&
				name.trim() === profile.name &&
				description === profile.description
			) {
				return;
			}
			setSavedFlag(false);
			try {
				await onMetadataSave({
					type,
					name: name.trim(),
					description: description.trim(),
				});
				setSavedFlag(true);
			} catch {
				// The parent exposes the server message through metadataError.
			}
		},
		[isMetadataPending, type, name, description, profile, onMetadataSave],
	);

	const modalTitle = messages.profiles.modalEditTitle.replace(
		"{name}",
		profile.name,
	);

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: native <dialog> handles Esc via showModal()
		<dialog
			ref={dialogRef}
			aria-labelledby={titleId}
			className="m-auto w-full max-w-3xl rounded-2xl border border-line bg-bg-surface p-0 text-sea-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div className="grid max-h-[90vh] grid-rows-[auto_1fr_auto]">
				<div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
					<div>
						<h2
							id={titleId}
							className="font-display text-lg font-bold text-sea-ink"
						>
							{modalTitle}
						</h2>
						<p className="mt-0.5 text-xs text-sea-ink-soft">
							{messages.profiles.modalEditSubtitle}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label={messages.profiles.modalClose}
						className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sea-ink-soft transition-colors hover:bg-bg-base hover:text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						<X aria-hidden="true" className="h-4 w-4" />
					</button>
				</div>

				<div
					className={cn(
						"grid gap-5 overflow-y-auto px-6 py-5",
						loading && "opacity-60",
					)}
					aria-busy={loading}
					inert={loading}
				>
					<form
						onSubmit={handleMetadataSubmit}
						className="grid gap-4 rounded-2xl border border-line bg-bg-base/40 p-4 sm:p-5"
					>
						<div>
							<h3 className="font-display text-sm font-bold text-sea-ink">
								{messages.profiles.modalMetadataHeading}
							</h3>
							<p className="mt-1 text-xs text-sea-ink-soft">
								{messages.profiles.modalMetadataLede}
							</p>
						</div>

						{metadataError ? (
							<div
								role="alert"
								aria-live="assertive"
								className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
							>
								<p className="font-semibold">
									{messages.profiles.modalErrorHeading}
								</p>
								<p>{metadataError}</p>
							</div>
						) : null}

						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<label
									htmlFor={typeId}
									className="mb-1.5 block text-sm font-semibold text-sea-ink"
								>
									{messages.profiles.profileTypeLabel}
								</label>
								<select
									id={typeId}
									value={type}
									onChange={(event) => {
										setType(event.target.value as ProfileType);
										setSavedFlag(false);
									}}
									className="w-full appearance-none rounded-lg border border-line px-3.5 py-2.5 pr-9 text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
								>
									{PROFILE_TYPES.map((value) => (
										<option key={value} value={value}>
											{PROFILE_TYPE_LABELS[value]}
										</option>
									))}
								</select>
							</div>

							<div>
								<label
									htmlFor={nameId}
									className="mb-1.5 block text-sm font-semibold text-sea-ink"
								>
									{messages.profiles.nameLabel}
								</label>
								<Input
									id={nameId}
									type="text"
									value={name}
									onChange={(event) => {
										setName(event.target.value);
										setSavedFlag(false);
									}}
									maxLength={100}
								/>
							</div>
						</div>

						<div>
							<label
								htmlFor={descriptionId}
								className="mb-1.5 block text-sm font-semibold text-sea-ink"
							>
								{messages.profiles.descriptionLabel}
							</label>
							<textarea
								id={descriptionId}
								value={description}
								onChange={(event) => {
									setDescription(event.target.value);
									setSavedFlag(false);
								}}
								maxLength={500}
								rows={3}
								className="w-full min-h-20 resize-y rounded-lg border border-line px-3.5 py-2.5 text-sea-ink placeholder:text-sea-ink-soft focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
								placeholder={messages.profiles.descriptionPlaceholder}
							/>
						</div>

						<div className="flex items-center justify-between gap-3">
							<output
								aria-live="polite"
								className={cn(
									"text-sm font-semibold text-palm transition-opacity",
									savedFlag && !isMetadataPending && !metadataError
										? "opacity-100"
										: "opacity-0",
								)}
							>
								{messages.profiles.modalSaved}
							</output>
							<button
								type="submit"
								disabled={isMetadataPending}
								className="ml-auto inline-flex items-center justify-center rounded-lg bg-sea-ink px-4 py-2.5 font-semibold text-foam no-underline transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isMetadataPending
									? messages.profiles.modalSaving
									: messages.profiles.modalSave}
							</button>
						</div>
					</form>

					<IdentityDataTabs
						attributes={profile.attributes}
						resolved={profile.resolved}
						emptyHint={messages.profiles.inheritHint}
						onAttributeChange={() => undefined}
						onSaveAttribute={onAttributeSave}
					/>

					{loading ? (
						<output aria-live="polite" className="text-sm text-sea-ink-soft">
							{messages.profiles.modalLoading}
						</output>
					) : null}
				</div>

				<div className="flex justify-end border-t border-line px-6 py-4">
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center justify-center rounded-lg bg-sea-ink px-4 py-2.5 font-semibold text-foam no-underline transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						{messages.profiles.modalDone}
					</button>
				</div>
			</div>
		</dialog>
	);
}
