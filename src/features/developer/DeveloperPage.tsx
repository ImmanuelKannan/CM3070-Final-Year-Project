import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { MultiselectAttribute } from "#/components/multiselect-attribute";
import { Input } from "#/components/ui/input";
import { messages } from "#/lib/i18n";
import type {
	OAuthClientProfileType,
	OAuthClientSummary,
} from "#/lib/oauth-clients";
import {
	createOAuthClientFn,
	deleteOAuthClientFn,
	rotateOAuthClientSecretFn,
} from "#/lib/oauth-clients.functions";
import {
	APPLICATION_CONTEXTS,
	ATTRIBUTE_LABELS,
	PROFILE_TYPE_LABELS,
} from "#/lib/profile-catalogue";

type ClientCredentials = {
	clientId: string;
	clientSecret: string;
};

type FormField = "name" | "profileType" | "redirectUris";

type RotateState =
	| { stage: "confirm"; client: OAuthClientSummary }
	| { stage: "rotating"; client: OAuthClientSummary }
	| { stage: "success"; client: OAuthClientSummary; clientSecret: string }
	| { stage: "error"; client: OAuthClientSummary; error: string };

function getErrorMessage(error: unknown, fallback: string): string {
	if (error && typeof error === "object" && "message" in error) {
		const message = (error as { message: unknown }).message;
		if (typeof message === "string" && message.trim() !== "") return message;
	}
	return fallback;
}

function DeveloperHeader() {
	return (
		<header className="grid gap-3">
			<h1 className="font-display text-4xl font-bold tracking-tight text-sea-ink sm:text-5xl">
				{messages.developer.title}
			</h1>
			<p className="max-w-[70ch] text-base leading-relaxed text-sea-ink-soft sm:text-lg">
				{messages.developer.pageText}
			</p>
		</header>
	);
}

export function DeveloperPending() {
	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<DeveloperHeader />
			<output className="rounded-2xl border border-line bg-bg-surface p-6 text-sm text-sea-ink-soft">
				{messages.developer.loading}
			</output>
		</div>
	);
}

export function DeveloperError() {
	const router = useRouter();

	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<DeveloperHeader />
			<section className="grid gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
				<h2 className="font-display text-xl font-bold">
					{messages.developer.listErrorHeading}
				</h2>
				<p className="text-sm">{messages.developer.listErrorBody}</p>
				<button
					type="button"
					onClick={() => {
						void router.invalidate();
					}}
					className="mt-1 inline-flex min-h-10 items-center justify-center rounded-lg border border-destructive/40 px-3.5 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:w-fit"
				>
					{messages.developer.retry}
				</button>
			</section>
		</div>
	);
}

export function DeveloperPage({
	initialClients,
}: {
	initialClients: OAuthClientSummary[];
}) {
	const createOauthClient = useServerFn(createOAuthClientFn);
	const deleteOauthClient = useServerFn(deleteOAuthClientFn);
	const rotateOauthClientSecret = useServerFn(rotateOAuthClientSecretFn);

	const [clients, setClients] = useState<OAuthClientSummary[]>(initialClients);
	const [name, setName] = useState("");
	const [profileType, setProfileType] = useState<OAuthClientProfileType | "">(
		"",
	);
	const [redirectUris, setRedirectUris] = useState("");
	const [requestedAttributeData, setRequestedAttributeData] = useState<
		string[]
	>([]);
	const [formErrors, setFormErrors] = useState<
		Partial<Record<FormField, string>>
	>({});
	const [createError, setCreateError] = useState<string | null>(null);
	const [isCreatingClient, setIsCreatingClient] = useState(false);
	const [credentials, setCredentials] = useState<ClientCredentials | null>(
		null,
	);
	const [isCopied, setIsCopied] = useState<string | null>(null);
	const [copyError, setCopyError] = useState<string | null>(null);
	const [isDeletingClientId, setIsDeletingClientId] = useState<string | null>(
		null,
	);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [rotateState, setRotateState] = useState<RotateState | null>(null);

	const nameId = useId();
	const profileTypeId = useId();
	const redirectUrisId = useId();

	function clearFormError(field: FormField) {
		setFormErrors((previous) => {
			if (!(field in previous)) return previous;
			const next = { ...previous };
			delete next[field];
			return next;
		});
	}

	async function handleCreate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (isCreatingClient || isDeletingClientId !== null) return;

		const redirectUriList = redirectUris
			.split("\n")
			.map((uri) => uri.trim())
			.filter(Boolean);
		const nextErrors: Partial<Record<FormField, string>> = {};

		if (!name.trim()) nextErrors.name = messages.developer.appNameRequired;
		if (!profileType) {
			nextErrors.profileType = messages.developer.profileTypeRequired;
		}
		if (redirectUriList.length === 0) {
			nextErrors.redirectUris = messages.developer.redirectUrisRequired;
		}
		if (Object.keys(nextErrors).length > 0) {
			setFormErrors(nextErrors);
			return;
		}

		setFormErrors({});
		setCreateError(null);
		setIsCreatingClient(true);
		try {
			const created = await createOauthClient({
				data: {
					name: name.trim(),
					profileType: profileType as OAuthClientProfileType,
					redirectUris: redirectUriList,
					requestedAttributeData,
				},
			});
			const { client_secret, ...clientSummary } = created;
			setClients((previous) => [...previous, clientSummary]);
			setCredentials({
				clientId: created.client_id,
				clientSecret: client_secret,
			});
			setIsCopied(null);
			setCopyError(null);
			setName("");
			setProfileType("");
			setRedirectUris("");
			setRequestedAttributeData([]);
			setFormErrors({});
		} catch (error) {
			setCreateError(
				getErrorMessage(error, messages.developer.createErrorBody),
			);
		} finally {
			setIsCreatingClient(false);
		}
	}

	async function handleDelete(client: OAuthClientSummary) {
		if (
			isCreatingClient ||
			isDeletingClientId ||
			!window.confirm(
				[
					messages.developer.deleteConfirmTitle.replace(
						"{name}",
						getClientName(client),
					),
					messages.developer.deleteConfirmBody,
				].join("\n\n"),
			)
		)
			return;

		setDeleteError(null);
		setIsDeletingClientId(client.client_id);
		try {
			await deleteOauthClient({ data: client.client_id });
		} catch (error) {
			setDeleteError(
				getErrorMessage(error, messages.developer.deleteErrorBody),
			);
			setIsDeletingClientId(null);
			return;
		}

		setClients((previous) =>
			previous.filter((item) => item.client_id !== client.client_id),
		);
		if (credentials?.clientId === client.client_id) {
			setCredentials(null);
			setIsCopied(null);
			setCopyError(null);
		}
		setIsDeletingClientId(null);
	}

	async function handleCopy(value: string) {
		setCopyError(null);
		try {
			if (!navigator.clipboard) throw new Error("Clipboard unavailable");
			await navigator.clipboard.writeText(value);
			setIsCopied(value);
		} catch {
			setIsCopied(null);
			setCopyError(messages.developer.copyError);
		}
	}

	async function handleSecretRotation() {
		if (!rotateState || (rotateState.stage !== "confirm" && rotateState.stage !== "error")) {
			return;
		}

		const client = rotateState.client;
		setRotateState({ stage: "rotating", client });

		try {
			const result = await rotateOauthClientSecret({ data: client.client_id });
			if (credentials?.clientId === client.client_id) {
				setCredentials(null);
				setIsCopied(null);
				setCopyError(null);
			}
			setRotateState({
				stage: "success",
				client,
				clientSecret: result.client_secret,
			});
		} catch (error) {
			setRotateState({
				stage: "error",
				client,
				error: getErrorMessage(error, messages.developer.rotateErrorBody),
			});
		}
	}

	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<DeveloperHeader />

			<section className="grid gap-5 rounded-2xl border border-line bg-bg-surface p-5 sm:p-7">
				<header className="grid gap-1.5">
					<h2 className="font-display text-2xl font-bold text-sea-ink">
						{messages.developer.createHeading}
					</h2>
					<p className="text-sm leading-relaxed text-sea-ink-soft">
						{messages.developer.createText}
					</p>
				</header>

				{createError ? (
					<section className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
						<h3 className="text-sm font-semibold">
							{messages.developer.createErrorHeading}
						</h3>
						<p className="text-sm">{createError}</p>
					</section>
				) : null}

				<form onSubmit={handleCreate} className="grid gap-5">
					<div className="grid gap-5 sm:grid-cols-2">
						<div className="grid gap-1.5">
							<label htmlFor={nameId} className="font-semibold text-sea-ink">
								{messages.developer.appNameLabel}
							</label>
							<Input
								id={nameId}
								type="text"
								value={name}
								onChange={(event) => {
									setName(event.target.value);
									clearFormError("name");
								}}
								placeholder={messages.developer.appNamePlaceholder}
								maxLength={100}
								required
								className="min-h-11"
							/>
							{formErrors.name ? (
								<p className="text-sm font-semibold text-destructive">
									{formErrors.name}
								</p>
							) : null}
						</div>

						<div className="grid gap-1.5">
							<label
								htmlFor={profileTypeId}
								className="font-semibold text-sea-ink"
							>
								{messages.developer.profileTypeLabel}
							</label>
							<select
								id={profileTypeId}
								value={profileType}
								onChange={(event) => {
									setProfileType(
										event.target.value as OAuthClientProfileType | "",
									);
									clearFormError("profileType");
								}}
								required
								className="min-h-11 w-full rounded-lg border border-line px-3.5 py-2.5 text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
							>
								<option value="">
									{messages.developer.profileTypePlaceholder}
								</option>
								{APPLICATION_CONTEXTS.map((value) => (
									<option key={value} value={value}>
										{PROFILE_TYPE_LABELS[value]}
									</option>
								))}
							</select>
							{formErrors.profileType ? (
								<p className="text-sm font-semibold text-destructive">
									{formErrors.profileType}
								</p>
							) : null}
						</div>

						<div className="grid gap-1.5 sm:col-span-2">
							<label
								htmlFor={redirectUrisId}
								className="font-semibold text-sea-ink"
							>
								{messages.developer.redirectUrisLabel}
							</label>
							<textarea
								id={redirectUrisId}
								value={redirectUris}
								onChange={(event) => {
									setRedirectUris(event.target.value);
									clearFormError("redirectUris");
								}}
								placeholder={messages.developer.redirectUrisPlaceholder}
								rows={5}
								required
								className="min-h-32 w-full resize-y rounded-lg border border-line px-3.5 py-2.5 font-mono text-sm text-sea-ink placeholder:font-sans placeholder:text-sea-ink-soft focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
							/>
							<p className="text-xs text-sea-ink-soft">
								{messages.developer.redirectUrisHint}
							</p>
							{formErrors.redirectUris ? (
								<p className="text-sm font-semibold text-destructive">
									{formErrors.redirectUris}
								</p>
							) : null}
						</div>

						<div className="grid gap-1.5 sm:col-span-2">
							<MultiselectAttribute
								value={requestedAttributeData}
								onValueChange={setRequestedAttributeData}
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={isCreatingClient || isDeletingClientId !== null}
						className="inline-flex min-h-11 items-center justify-center rounded-lg bg-sea-ink px-4 py-2.5 font-semibold text-foam transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
					>
						{isCreatingClient
							? messages.developer.creatingClient
							: messages.developer.createClient}
					</button>
				</form>
			</section>

			{credentials ? (
				<section className="grid gap-4 rounded-2xl border border-palm/40 bg-palm/5 p-5 sm:p-7">
					<header className="grid gap-1.5">
						<h2 className="font-display text-2xl font-bold text-sea-ink">
							{messages.developer.credentialsHeading}
						</h2>
						<p className="text-base leading-relaxed text-sea-ink-soft">
							{messages.developer.credentialsText}
						</p>
					</header>
					<div className="grid gap-3">
						<CredentialRow
							label={messages.developer.clientIdLabel}
							value={credentials.clientId}
							copied={isCopied === credentials.clientId}
							onCopy={() => {
								void handleCopy(credentials.clientId);
							}}
						/>
						<CredentialRow
							label={messages.developer.clientSecretLabel}
							value={credentials.clientSecret}
							copied={isCopied === credentials.clientSecret}
							onCopy={() => {
								void handleCopy(credentials.clientSecret);
							}}
						/>
					</div>
					{copyError ? (
						<output className="text-sm font-semibold text-destructive">
							{copyError}
						</output>
					) : isCopied ? (
						<output className="text-sm font-semibold text-palm">
							{messages.developer.copied}
						</output>
					) : null}
				</section>
			) : null}

			<section className="grid gap-4 border-t border-line pt-6 sm:pt-10">
				<header className="grid gap-1.5">
					<h2 className="font-display text-2xl font-bold text-sea-ink">
						{messages.developer.listHeading}
					</h2>
					<p className="text-sm text-sea-ink-soft">
						{messages.developer.listText}
					</p>
				</header>

				{deleteError ? (
					<section className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
						<h3 className="text-sm font-semibold">
							{messages.developer.deleteErrorHeading}
						</h3>
						<p className="text-sm">{deleteError}</p>
					</section>
				) : null}

				{clients.length === 0 ? (
					<section className="grid gap-2 rounded-2xl border border-line bg-bg-surface p-8 text-center">
						<h3 className="font-display text-xl font-bold text-sea-ink">
							{messages.developer.emptyHeading}
						</h3>
						<p className="text-sm text-sea-ink-soft">
							{messages.developer.emptyBody}
						</p>
					</section>
				) : (
					<ul className="grid gap-3">
						{clients.map((client) => (
							<ClientRow
								key={client.client_id}
								client={client}
								deleting={isDeletingClientId === client.client_id}
								deleteDisabled={isCreatingClient || isDeletingClientId !== null}
								onDelete={() => {
									void handleDelete(client);
								}}
								rotateDisabled={isCreatingClient || isDeletingClientId !== null}
								onRotate={() => {
									setIsCopied(null);
									setCopyError(null);
									setRotateState({ stage: "confirm", client });
								}}
							/>
						))}
					</ul>
				)}
			</section>

			{rotateState ? (
				<RotateClientSecretDialog
					state={rotateState}
					isSecretCopied={
						rotateState.stage === "success" &&
						isCopied === rotateState.clientSecret
					}
					copyError={copyError}
					onClose={() => {
						setRotateState(null);
						setIsCopied(null);
						setCopyError(null);
					}}
					onConfirm={() => {
						void handleSecretRotation();
					}}
					onCopySecret={() => {
						if (rotateState.stage === "success") {
							void handleCopy(rotateState.clientSecret);
						}
					}}
				/>
			) : null}
		</div>
	);
}

function CredentialRow({
	label,
	value,
	copied,
	onCopy,
}: {
	label: string;
	value: string;
	copied: boolean;
	onCopy: () => void;
}) {
	return (
		<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
			<div className="grid gap-1.5">
				<p className="text-sm font-semibold text-sea-ink">{label}</p>
				<code className="block break-all rounded-lg border border-line bg-bg-surface px-3 py-2.5 font-mono text-sm text-sea-ink">
					{value}
				</code>
			</div>
			<button
				type="button"
				onClick={onCopy}
				className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-bg-surface px-4 py-2.5 text-sm font-semibold text-sea-ink transition-colors hover:bg-lagoon/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:min-h-10"
			>
				{copied ? messages.developer.copied : messages.developer.copy}
			</button>
		</div>
	);
}

function ClientRow({
	client,
	deleting,
	deleteDisabled,
	onDelete,
	rotateDisabled,
	onRotate,
}: {
	client: OAuthClientSummary;
	deleting: boolean;
	deleteDisabled: boolean;
	onDelete: () => void;
	rotateDisabled: boolean;
	onRotate: () => void;
}) {
	return (
		<li className="grid gap-4 rounded-2xl border border-line bg-bg-surface p-5 sm:p-6">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="break-words font-display text-lg font-bold leading-tight text-sea-ink">
						{getClientName(client)}
					</h3>
					<p className="mt-1 text-sm text-sea-ink-soft">
						{getProfileTypeLabel(client.metadata?.profileType)}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={onRotate}
						disabled={rotateDisabled}
						className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-bg-surface px-3.5 py-2 text-sm font-semibold text-sea-ink transition-colors hover:bg-lagoon/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
					>
						{messages.developer.rotateClient}
					</button>
					<button
						type="button"
						onClick={onDelete}
						disabled={deleteDisabled}
						className="inline-flex min-h-10 items-center justify-center rounded-lg border border-destructive/40 px-3.5 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
					>
						{deleting
							? messages.developer.deletingClient
							: messages.developer.deleteClient}
					</button>
				</div>
			</header>

			<dl className="grid gap-3 border-t border-line/60 pt-4 sm:grid-cols-2">
				<div className="min-w-0">
					<dt className="text-xs font-semibold uppercase tracking-wide text-sea-ink-soft">
						{messages.developer.clientIdLabel}
					</dt>
					<dd className="mt-1 break-all font-mono text-sm text-sea-ink">
						{client.client_id}
					</dd>
				</div>
				<div className="min-w-0 sm:col-span-2">
					<dt className="text-xs font-semibold uppercase tracking-wide text-sea-ink-soft">
						{messages.developer.redirectUrisHeading}
					</dt>
					<dd>
						<ul className="mt-1 grid gap-1">
							{client.redirect_uris.map((uri) => (
								<li
									key={uri}
									className="break-all font-mono text-sm text-sea-ink"
								>
									{uri}
								</li>
							))}
						</ul>
					</dd>
				</div>
				<div className="min-w-0 sm:col-span-2">
					<dt className="text-xs font-semibold uppercase text-sea-ink-soft">
						{messages.developer.identityAttributeSelectLabel}
					</dt>
					<dd>
						<ul className="mt-1 grid gap-1">
							{client.requested_attribute_data.map((key) => (
								<li key={key} className="text-sm text-sea-ink">
									{ATTRIBUTE_LABELS[key] ?? key}
								</li>
							))}
						</ul>
					</dd>
				</div>
			</dl>
		</li>
	);
}

function getClientName(client: OAuthClientSummary): string {
	return client.client_name?.trim() || messages.developer.unnamedClient;
}

function getProfileTypeLabel(
	profileType: OAuthClientProfileType | undefined,
): string {
	return profileType
		? PROFILE_TYPE_LABELS[profileType]
		: messages.developer.profileTypeUnknown;
}

function RotateClientSecretDialog({
	state,
	isSecretCopied,
	copyError,
	onClose,
	onConfirm,
	onCopySecret,
}: {
	state: RotateState;
	isSecretCopied: boolean;
	copyError: string | null;
	onClose: () => void;
	onConfirm: () => void;
	onCopySecret: () => void;
}) {
	const dialogRef = useRef<HTMLDialogElement | null>(null);
	const headingRef = useRef<HTMLHeadingElement | null>(null);
	const titleId = useId();
	const isRotating = state.stage === "rotating" || state.stage === "success";

	useEffect(() => {
		const dialog = dialogRef.current;
		if (dialog && !dialog.open) dialog.showModal();
	}, []);

	useEffect(() => {
		if (state.stage) headingRef.current?.focus();
	}, [state.stage]);

	const clientName = getClientName(state.client);
	const title =
		state.stage === "success"
			? messages.developer.rotateSuccessTitle
			: messages.developer.rotateConfirmTitle.replace("{name}", clientName);

	const cancelButtonClass =
		"inline-flex items-center justify-center rounded-lg border border-line bg-bg-surface px-4 py-2.5 font-semibold text-sea-ink no-underline transition-colors hover:bg-lagoon/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring";
	const dangerButtonClass =
		"inline-flex min-h-10 items-center justify-center rounded-lg border border-destructive/40 bg-bg-surface px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60";
	const primaryButtonClass =
		"inline-flex items-center justify-center rounded-lg bg-sea-ink px-4 py-2.5 font-semibold text-foam no-underline transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

	return (
		<dialog
			ref={dialogRef}
			className="m-auto w-full max-w-md rounded-2xl border border-line bg-bg-surface p-0 text-sea-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
			onClose={onClose}
			onCancel={(event) => {
				event.preventDefault();
                if (!isRotating) {
                  onClose();
                }
  			}}
			onClick={(event) => {
				if (isRotating) return;
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div className="grid gap-0">
				<div className="border-b border-line px-6 py-4">
					<h2
						id={titleId}
						ref={headingRef}
						tabIndex={-1}
						className="font-display text-lg font-bold text-sea-ink focus:outline-none"
					>
						{title}
					</h2>
				</div>

				<div className="grid gap-5 px-6 py-5">
					{state.stage === "confirm" ? (
						<p className="text-sm leading-relaxed text-sea-ink-soft">
							{messages.developer.rotateConfirmBody}
						</p>
					) : null}

					{state.stage === "rotating" ? (
						<p className="text-sm text-sea-ink-soft">
							{messages.developer.rotatingClient}
						</p>
					) : null}

					{state.stage === "success" ? (
						<div className="grid gap-3">
							<p className="text-sm leading-relaxed text-sea-ink-soft">
								{messages.developer.rotateSuccessText}
							</p>
							<CredentialRow
								label={messages.developer.clientSecretLabel}
								value={state.clientSecret}
								copied={isSecretCopied}
								onCopy={onCopySecret}
							/>
							{copyError ? (
								<output className="text-sm font-semibold text-destructive">
									{copyError}
								</output>
							) : isSecretCopied ? (
								<output className="text-sm font-semibold text-palm">
									{messages.developer.copied}
								</output>
							) : null}
						</div>
					) : null}

					{state.stage === "error" ? (
						<section
							role="alert"
							className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
						>
							<h3 className="text-sm font-semibold">
								{messages.developer.rotateErrorHeading}
							</h3>
							<p className="text-sm">{state.error}</p>
						</section>
					) : null}
				</div>

				<div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">
					{state.stage === "confirm" || state.stage === "error" ? (
						<>
							<button
								type="button"
								onClick={onClose}
								className={cancelButtonClass}
							>
								{messages.profiles.modalCancel}
							</button>
							<button
								type="button"
								onClick={onConfirm}
								className={dangerButtonClass}
							>
								{messages.developer.rotateClient}
							</button>
						</>
					) : null}

					{state.stage === "rotating" ? (
						<button
							type="button"
							disabled
							className="inline-flex min-h-10 items-center justify-center rounded-lg border border-destructive/40 bg-bg-surface px-4 py-2.5 text-sm font-semibold text-destructive transition-colors disabled:cursor-not-allowed disabled:opacity-60"
						>
							{messages.developer.rotatingClient}
						</button>
					) : null}

					{state.stage === "success" ? (
						<button
							type="button"
							onClick={onClose}
							className={primaryButtonClass}
						>
							{messages.profiles.modalDone}
						</button>
					) : null}
				</div>
			</div>
		</dialog>
	);
}
