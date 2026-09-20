import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "#/components/ui/input";
import { messages } from "#/lib/i18n";
import {
	PROFILE_TYPE_LABELS,
	PROFILE_TYPES,
	type ProfileType,
} from "#/lib/profile-catalogue";
import { cn } from "#/lib/utils";

type Props = {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: {
		type: ProfileType;
		name: string;
		description: string;
	}) => Promise<void>;
};

export function AddProfileModal({ open, onClose, onSubmit }: Props) {
	const dialogRef = useRef<HTMLDialogElement | null>(null);
	const [type, setType] = useState<ProfileType | "">("");
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState(false);
	const [generalError, setGeneralError] = useState("");

	const titleId = useId();
	const typeId = useId();
	const nameId = useId();
	const descriptionId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
		}
		if (!open && dialog.open) {
			dialog.close();
		}
	}, [open]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		const handleClose = () => {
			setType("");
			setName("");
			setDescription("");
			setErrors({});
			setGeneralError("");
			onClose();
		};
		dialog.addEventListener("close", handleClose);
		return () => dialog.removeEventListener("close", handleClose);
	}, [onClose]);

	useEffect(() => {
		if (!open) return;
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		dialogRef.current?.addEventListener("keydown", handleKey);
		return () => dialogRef.current?.removeEventListener("keydown", handleKey);
	}, [open, onClose]);

	function clearError(field: keyof typeof errors) {
		setErrors((prev) => {
			if (!(field in prev)) return prev;
			const next = { ...prev };
			delete next[field];
			return next;
		});
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (submitting) return;

		const nextErrors: Record<string, string> = {};
		if (!type) nextErrors.type = messages.profiles.profileTypePlaceholder;
		if (!name.trim()) nextErrors.name = messages.profiles.nameRequired;

		if (Object.keys(nextErrors).length > 0) {
			setErrors(nextErrors);
			return;
		}

		setErrors({});
		setGeneralError("");
		setSubmitting(true);
		try {
			await onSubmit({
				type: type as ProfileType,
				name: name.trim(),
				description: description.trim(),
			});
		} catch (err) {
			const message =
				err instanceof Error && err.message.trim() !== ""
					? err.message
					: messages.profiles.modalErrorBody;
			setGeneralError(message);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: native <dialog> handles Esc via showModal()
		<dialog
			ref={dialogRef}
			aria-labelledby={titleId}
			className="m-auto w-full max-w-md rounded-2xl border border-line bg-bg-surface p-0 text-sea-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<form onSubmit={handleSubmit} className="grid gap-0">
				<div className="flex items-center justify-between border-b border-line px-6 py-4">
					<h2
						id={titleId}
						className="font-display text-lg font-bold text-sea-ink"
					>
						{messages.profiles.modalAddTitle}
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label={messages.profiles.modalClose}
						className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sea-ink-soft transition-colors hover:bg-bg-base hover:text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						<X aria-hidden="true" className="h-4 w-4" />
					</button>
				</div>

				<div className="grid gap-5 px-6 py-5">
					{generalError ? (
						<div
							role="alert"
							aria-live="assertive"
							className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
						>
							<p className="font-semibold">
								{messages.profiles.modalErrorHeading}
							</p>
							<p>{generalError}</p>
						</div>
					) : null}

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
								setType(event.target.value as ProfileType | "");
								clearError("type");
							}}
							className={cn(
								"w-full appearance-none rounded-lg border border-line px-3.5 py-2.5 pr-9 text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
								errors.type && "border-destructive",
							)}
						>
							<option value="">
								{messages.profiles.profileTypePlaceholder}
							</option>
							{PROFILE_TYPES.map((value) => (
								<option key={value} value={value}>
									{PROFILE_TYPE_LABELS[value]}
								</option>
							))}
						</select>
						<p className="mt-1 text-xs text-sea-ink-soft">
							{messages.profiles.profileTypeHint}
						</p>
						{errors.type ? (
							<p
								role="alert"
								className="mt-1 text-xs font-semibold text-destructive"
							>
								{errors.type}
							</p>
						) : null}
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
								clearError("name");
							}}
							className={cn(errors.name && "border-destructive")}
							placeholder={messages.profiles.namePlaceholder}
							maxLength={100}
							required
						/>
						{errors.name ? (
							<p
								role="alert"
								className="mt-1 text-xs font-semibold text-destructive"
							>
								{errors.name}
							</p>
						) : null}
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
							onChange={(event) => setDescription(event.target.value)}
							className="w-full min-h-20 resize-y rounded-lg border border-line px-3.5 py-2.5 text-sea-ink placeholder:text-sea-ink-soft focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
							placeholder={messages.profiles.descriptionPlaceholder}
							rows={3}
							maxLength={500}
						/>
					</div>
				</div>

				<div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center justify-center rounded-lg border border-line bg-bg-surface px-4 py-2.5 font-semibold text-sea-ink no-underline transition-colors hover:bg-lagoon/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						{messages.profiles.modalCancel}
					</button>
					<button
						type="submit"
						disabled={submitting}
						className="inline-flex items-center justify-center rounded-lg bg-sea-ink px-4 py-2.5 font-semibold text-foam no-underline transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
					>
						{submitting
							? messages.profiles.creatingProfile
							: messages.profiles.createProfile}
					</button>
				</div>
			</form>
		</dialog>
	);
}
