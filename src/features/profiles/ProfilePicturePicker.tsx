import { AlertCircle, Check, ImagePlus, Loader2, X } from "lucide-react";
import {
	type ChangeEvent,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { messages } from "#/lib/i18n";
import { validateProfilePictureMetadata } from "#/lib/profile-picture-rules";
import { cn } from "#/lib/utils";

type Status = "idle" | "uploading" | "saved" | "error";

type Props = {
	currentUrl: string;
	onUploaded: (url: string) => void;
};

export function ProfilePicturePicker({ currentUrl, onUploaded }: Props) {
	const fileInputId = useId();
	const errorId = useId();
	const statusId = useId();

	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [clientError, setClientError] = useState<string | null>(null);
	const [status, setStatus] = useState<Status>("idle");
	const [serverError, setServerError] = useState<string | null>(null);

	const previewUrlRef = useRef<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const removePreview = useCallback(() => {
		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current);
			previewUrlRef.current = null;
		}
	}, []);

	const acceptPendingFiles = useCallback(
		(file: File) => {
			removePreview();
			const url = URL.createObjectURL(file);
			previewUrlRef.current = url;
			setPendingFile(file);
			setPreviewUrl(url);
			setClientError(null);
			setServerError(null);
			setStatus("idle");
		},
		[removePreview],
	);

	const clearPendingFiles = useCallback(() => {
		removePreview();
		setPendingFile(null);
		setPreviewUrl(null);
		setClientError(null);
		setServerError(null);
		setStatus("idle");
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, [removePreview]);

	useEffect(() => {
		return () => removePreview();
	}, [removePreview]);

	const handleFileChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) {
				clearPendingFiles();
				return;
			}
			const check = validateProfilePictureMetadata(file);
			if (!check.ok) {
				clearPendingFiles();
				setClientError(
					check.reason === "size"
						? messages.profiles.profilePicture.tooLarge
						: messages.profiles.profilePicture.invalidType,
				);
				return;
			}
			acceptPendingFiles(file);
		},
		[acceptPendingFiles, clearPendingFiles],
	);

	const handleUpload = useCallback(async () => {
		if (!pendingFile || status === "uploading") return;
		setStatus("uploading");
		setServerError(null);
		setClientError(null);

		const form = new FormData();
		form.append("file", pendingFile);

		try {
			const res = await fetch("/api/profile-picture", {
				method: "POST",
				body: form,
			});
			const body = (await res.json().catch(() => ({}))) as {
				url?: string;
				error?: string;
			};
			if (!res.ok || !body.url) {
				const message =
					typeof body.error === "string" && body.error.trim() !== ""
						? body.error
						: "Upload failed.";
				setStatus("error");
				setServerError(message);
				return;
			}
			const url = body.url;
			removePreview();
			setPendingFile(null);
			setPreviewUrl(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
			setStatus("saved");
			onUploaded(url);
			setTimeout(() => {
				setStatus((prev) => (prev === "saved" ? "idle" : prev));
			}, 2000);
		} catch {
			setStatus("error");
			setServerError("Upload failed. Check your connection and try again.");
		}
	}, [pendingFile, status, onUploaded, removePreview]);

	const t = messages.profiles.profilePicture;
	const isUploading = status === "uploading";
	const displayedUrl = previewUrl ?? currentUrl;
	const errorMessage = clientError ?? serverError;
	const hasError = errorMessage !== null;
	const ariaDescribedBy = [
		hasError ? errorId : null,
		status === "saved" || status === "uploading" ? statusId : null,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			className={cn(
				"grid gap-4 rounded-xl border border-line bg-bg-base p-4 sm:p-5",
				hasError && "border-destructive",
			)}
		>
			<div className="flex items-start gap-4">
				<div className="flex-shrink-0">
					{displayedUrl ? (
						<img
							src={displayedUrl}
							alt={previewUrl ? t.previewAlt : t.currentAlt}
							className={cn(
								"h-20 w-20 rounded-full border border-line object-cover sm:h-24 sm:w-24",
								previewUrl &&
									"ring-2 ring-lagoon ring-offset-2 ring-offset-bg-surface",
							)}
						/>
					) : (
						<div
							aria-hidden="true"
							className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-bg-surface text-sea-ink-soft sm:h-24 sm:w-24"
						>
							<ImagePlus className="h-8 w-8" />
						</div>
					)}
				</div>
				<div className="grid min-w-0 flex-1 gap-2">
					<div>
						<p className="font-semibold text-sea-ink">{t.heading}</p>
						<p className="text-xs text-sea-ink-soft">{t.lede}</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<input
							ref={fileInputRef}
							id={fileInputId}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							onChange={handleFileChange}
							disabled={isUploading}
							className="peer sr-only"
							aria-describedby={ariaDescribedBy || undefined}
						/>
						<label
							htmlFor={fileInputId}
							aria-disabled={isUploading}
							className={cn(
								"inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-bg-surface px-3 py-2 text-sm font-semibold text-sea-ink transition-colors hover:bg-lagoon/10 peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring",
								isUploading && "cursor-not-allowed opacity-60",
							)}
						>
							<ImagePlus aria-hidden="true" className="h-4 w-4" />
							{pendingFile ? t.change : t.pick}
						</label>
						{pendingFile ? (
							<>
								<button
									type="button"
									onClick={() => void handleUpload()}
									disabled={status === "uploading"}
									className="inline-flex items-center justify-center gap-2 rounded-lg bg-sea-ink px-3 py-2 text-sm font-semibold text-foam transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
								>
									{status === "uploading" ? (
										<>
											<Loader2
												aria-hidden="true"
												className="h-4 w-4 animate-spin"
											/>
											{t.uploading}
										</>
									) : (
										t.upload
									)}
								</button>
								<button
									type="button"
									onClick={clearPendingFiles}
									disabled={status === "uploading"}
									aria-label={t.remove}
									className="inline-flex items-center justify-center rounded-lg border border-line bg-bg-surface px-2.5 py-2 text-sea-ink-soft transition-colors hover:bg-lagoon/10 hover:text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
								>
									<X aria-hidden="true" className="h-4 w-4" />
								</button>
							</>
						) : null}
					</div>
				</div>
			</div>
			{hasError ? (
				<div
					id={errorId}
					role="alert"
					className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
				>
					<AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4" />
					<div className="grid gap-0.5">
						<p className="font-semibold">{t.errorHeading}</p>
						<p>{errorMessage}</p>
					</div>
				</div>
			) : null}
			<div id={statusId} aria-live="polite" className="sr-only">
				{status === "uploading"
					? t.uploading
					: status === "saved"
						? t.saved
						: ""}
			</div>
			{status === "saved" ? (
				<p className="flex items-center gap-2 text-sm text-palm">
					<Check aria-hidden="true" className="h-4 w-4" />
					{t.saved}
				</p>
			) : null}
		</div>
	);
}
