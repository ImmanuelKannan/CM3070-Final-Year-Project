import { createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Pencil } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { getSession } from "#/lib/auth.functions";
import {
	approveConsentGrant,
	rejectConsentGrant,
} from "#/lib/consent-grants.functions";
import {
	applyOverriddenAttributes,
	type PreviewAttribute,
} from "#/lib/consent-preview";
import {
	type ConsentPreviewResult,
	getConsentPreview,
} from "#/lib/consent-preview.functions";
import { messages } from "#/lib/i18n";
import {
	ATTRIBUTE_FIELDS,
	PROFILE_TYPE_LABELS,
	validateAttribute,
} from "#/lib/profile-catalogue";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/oauth/consent")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) throw redirect({ to: "/sign-in" });
		if (session.user.accountKind !== "identity_holder") {
			throw redirect({ to: "/developer" });
		}
	},
	validateSearch: () => ({}),
	component: ConsentPage,
});

function getErrorMessage(err: unknown, fallbackMessage: string): string {
	if (err && typeof err === "object" && "message" in err) {
		const message = (err as { message: unknown }).message;
		if (typeof message === "string" && message.trim() !== "") return message;
	}
	return fallbackMessage;
}

function ConsentPage() {
	const routerSearch = useRouterState({
		select: (state) => state.location.searchStr,
	});

	const rawSearchQuery =
		typeof window === "undefined" ? routerSearch : window.location.search;

	const oauthQuery = rawSearchQuery.startsWith("?") ? rawSearchQuery.slice(1) : rawSearchQuery;

	return <ConsentRequest key={oauthQuery} oauthQuery={oauthQuery} />;
}

function ConsentRequest({ oauthQuery }: { oauthQuery: string }) {
	const getPreviewFn = useServerFn(getConsentPreview);
	const approveGrantFn = useServerFn(approveConsentGrant);
	const rejectGrantFn = useServerFn(rejectConsentGrant);
	const sourceSelectId = useId();
	const hasAppliedSuggestedProfile = useRef(false);

	const [preview, setPreview] = useState<ConsentPreviewResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pendingDecision, setPendingDecision] = useState<
		"approve" | "reject" | null
	>(null);
	const [selectedProfileId, setSelectedProfileId] = useState("default");

	const [edits, setEdits] = useState<Record<string, string>>({});
	const [editingKey, setEditingKey] = useState<string | null>(null);
	const [editDraft, setEditDraft] = useState("");
	const [editError, setEditError] = useState<string | null>(null);

	const [excludedAttributes, setExcludedAttributes] = useState<Set<string>>(new Set());
	const approvedKeys =
		preview?.requestedKeys.filter((key) => !excludedAttributes.has(key)) ?? [];

	useEffect(() => {
		if (!oauthQuery) {
			setError(messages.consent.errorBody);
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);

		(async () => {
			try {
				const result = await getPreviewFn({
					data: {
						oauthQuery,
						selectedProfileId:
							selectedProfileId === "default" ? null : selectedProfileId,
					},
				});
				if (cancelled) return;
				if (!hasAppliedSuggestedProfile.current && result.suggestedProfileId) {
					hasAppliedSuggestedProfile.current = true;
					setSelectedProfileId(result.suggestedProfileId);
					return;
				}
				hasAppliedSuggestedProfile.current = true;
				setPreview(result);
				setLoading(false);
			} catch (err) {
				if (!cancelled) {
					setError(getErrorMessage(err, messages.consent.errorBody));
					setLoading(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [oauthQuery, selectedProfileId, getPreviewFn]);

	const displayAttributes = useMemo(
		() => (preview ? applyOverriddenAttributes(preview.attributes, edits) : []),
		[preview, edits],
	);

	const currentValue = (key: string): string =>
		displayAttributes.find((a) => a.key === key)?.value ?? "";

	const startEditingField = (key: string) => {
		setEditingKey(key);
		setEditDraft(currentValue(key));
		setEditError(null);
	};

	const cancelEditingField = () => {
		setEditingKey(null);
		setEditDraft("");
		setEditError(null);
	};

	const toggleAttributeInclusion = (key: string) => {
		const wasIncluded = !excludedAttributes.has(key);
		setExcludedAttributes((prev) => {
			const next = new Set(prev);
			if (wasIncluded) next.add(key);
			else next.delete(key);
			return next;
		});
		if (!wasIncluded) return;
		setEdits((prev) => {
			if (!(key in prev)) return prev;
			const next = { ...prev };
			delete next[key];
			return next;
		});
		if (editingKey === key) cancelEditingField();
	};

	const saveEditedField = () => {
		if (!editingKey) return;
		const trimmed = editDraft.trim();
		const original =
			preview?.attributes.find((a) => a.key === editingKey)?.value ?? "";

		if (trimmed === "" || trimmed === original) {
			// Empty or unchanged means "revert to the resolved source value".
			setEdits((prev) => {
				const next = { ...prev };
				delete next[editingKey];
				return next;
			});
			setEditingKey(null);
			setEditDraft("");
			setEditError(null);
			return;
		}

		const fieldError = validateAttribute(editingKey, trimmed);
		if (fieldError) {
			setEditError(fieldError);
			return;
		}

		setEdits((prev) => ({ ...prev, [editingKey]: trimmed }));
		setEditingKey(null);
		setEditDraft("");
		setEditError(null);
	};

	const handleDecision = async (decision: "approve" | "reject") => {
		if (pendingDecision !== null) return;
		setPendingDecision(decision);
		setError(null);
		try {
			const data =
				decision === "approve"
					? await approveGrantFn({
							data: {
								oauthQuery,
								selectedProfileId:
									selectedProfileId === "default" ? null : selectedProfileId,
								edits,
								approvedKeys,
							},
						})
					: await rejectGrantFn({ data: { oauthQuery } });

			if (!data.redirect) throw new Error(messages.consent.errorBody);
			window.location.href = data.url;
		} catch (err) {
			setError(getErrorMessage(err, messages.consent.errorBody));
			setPendingDecision(null);
		}
	};

	const clientName = preview?.client.name?.trim() || preview?.client.id || "";
	const hasRequestedAttributes = (preview?.requestedKeys.length ?? 0) > 0;
	const selectedAttributesCount = approvedKeys.length;
	const isConsentBLocked =
		loading ||
		!!error ||
		editingKey !== null ||
		(hasRequestedAttributes && selectedAttributesCount === 0);

	return (
		<div className="mx-auto grid w-full max-w-lg gap-6 px-4">
			<header className="flex flex-col items-center gap-3 text-center">
				{preview?.client.icon ? (
					<img
						src={preview.client.icon}
						alt=""
						className="size-14 rounded-full object-contain"
					/>
				) : preview ? (
					<div className="flex size-14 items-center justify-center rounded-full bg-lagoon text-xl font-bold text-foam">
						{clientName.charAt(0).toUpperCase()}
					</div>
				) : null}
				<div>
					<h1 className="font-display text-2xl font-bold text-sea-ink">
						{clientName || messages.consent.title}
					</h1>
				</div>
			</header>

			{loading && !preview ? (
				<output className="text-center text-sm text-sea-ink-soft">
					{messages.consent.loading}
				</output>
			) : error ? (
				<div
					role="alert"
					className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
				>
					<p className="font-semibold">{messages.consent.errorHeading}</p>
					<p>{error}</p>
				</div>
			) : preview ? (
				<>
					{hasRequestedAttributes ? (
						<section
							className="grid gap-3 rounded-2xl border border-line bg-bg-surface p-5"
							aria-busy={loading}
						>
							<div>
								<h2
									id="requested-heading"
									className="font-display text-lg font-bold text-sea-ink"
								>
									{messages.consent.requestedHeading}
								</h2>
								<p className="mt-0.5 text-sm text-sea-ink-soft">
									{messages.consent.requestedDetailsMessage.replace("{client}", clientName)}
								</p>
							</div>

							<div className="grid gap-2">
								<label
									htmlFor={sourceSelectId}
									className="text-sm font-semibold text-sea-ink"
								>
									{messages.consent.sourceHeading}
								</label>
								<select
									id={sourceSelectId}
									value={selectedProfileId}
									onChange={(event) => setSelectedProfileId(event.target.value)}
									className="w-full rounded-lg border border-line bg-bg-surface px-3.5 py-2.5 pr-9 text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
								>
									<option value="default">
										{messages.consent.baseIdentity}
									</option>
									{preview.profiles.map((profile) => (
										<option key={profile.id} value={profile.id}>
											{`${profile.name} (${PROFILE_TYPE_LABELS[profile.type]})`}
										</option>
									))}
								</select>
							</div>

							<div>
								<h3 className="mt-1 text-sm font-semibold text-sea-ink">
									{messages.consent.sharingCount
										.replace("{selected}", String(selectedAttributesCount))
										.replace("{total}", String(preview.requestedKeys.length))}
								</h3>
							</div>

							<ul className="grid gap-1">
								{displayAttributes.map((attr) => (
									<AttributeRow
										key={attr.key}
										attribute={attr}
										editing={editingKey === attr.key}
										draft={editDraft}
										editError={editError}
										isIncluded={!excludedAttributes.has(attr.key)}
										onToggleInclude={() => toggleAttributeInclusion(attr.key)}
										onStartEdit={() => startEditingField(attr.key)}
										onCancelEdit={cancelEditingField}
										onSaveEdit={saveEditedField}
										onDraftChange={setEditDraft}
									/>
								))}
							</ul>
						</section>
					) : (
						<section className="grid gap-1 rounded-2xl border border-line bg-bg-surface p-5">
							<h2 className="font-display text-lg font-bold text-sea-ink">
								{messages.consent.noAttributesTitle}
							</h2>
							<p className="mt-1 text-sm text-sea-ink-soft">
								{messages.consent.noAttributesBody}
							</p>
						</section>
					)}

					<div className="flex items-center justify-end gap-3">
						<output className="sr-only">
							{pendingDecision === "approve"
								? messages.consent.allowing
								: pendingDecision === "reject"
									? messages.consent.rejecting
									: ""}
						</output>
						<button
							type="button"
							onClick={() => void handleDecision("reject")}
							disabled={pendingDecision !== null}
							aria-busy={pendingDecision === "reject"}
							className="inline-flex items-center justify-center rounded-lg border border-line bg-bg-surface px-4 py-2.5 font-semibold text-sea-ink transition-colors hover:bg-bg-base focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
						>
							{pendingDecision === "reject"
								? messages.consent.rejecting
								: messages.consent.deny}
						</button>
						<button
							type="button"
							onClick={() => void handleDecision("approve")}
							disabled={pendingDecision !== null || isConsentBLocked}
							aria-busy={pendingDecision === "approve"}
							className="inline-flex items-center justify-center rounded-lg bg-sea-ink px-4 py-2.5 font-semibold text-foam no-underline transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
						>
							{pendingDecision === "approve"
								? messages.consent.allowing
								: messages.consent.allow}
						</button>
					</div>
				</>
			) : null}
		</div>
	);
}

function AttributeRow({
	attribute,
	editing,
	draft,
	editError,
	isIncluded,
	onToggleInclude,
	onStartEdit,
	onCancelEdit,
	onSaveEdit,
	onDraftChange,
}: {
	attribute: PreviewAttribute;
	editing: boolean;
	draft: string;
	editError: string | null;
	isIncluded: boolean;
	onToggleInclude: () => void;
	onStartEdit: () => void;
	onCancelEdit: () => void;
	onSaveEdit: () => void;
	onDraftChange: (value: string) => void;
}) {
	const field = ATTRIBUTE_FIELDS[attribute.key];
	const inputId = useId();
	const errorId = `${inputId}-error`;
	const empty = attribute.value.trim() === "";

	if (editing) {
		return (
			<li className="rounded-lg border border-lagoon bg-bg-base/40 p-3">
				<div className="mb-1.5 flex items-center gap-3">
					<AttributeInclusionToggle
						attribute={attribute}
						isIncluded={isIncluded}
						onToggleInclude={onToggleInclude}
					/>
					<label
						htmlFor={inputId}
						className="block text-sm font-semibold text-sea-ink"
					>
						{attribute.label}
					</label>
				</div>
				<div className="grid gap-2">
					<EditInput
						id={inputId}
						fieldType={field?.type}
						options={field?.options}
						placeholder={field?.placeholder}
						value={draft}
						onChange={onDraftChange}
					/>
					{editError ? (
						<p
							id={errorId}
							role="alert"
							className="text-xs font-semibold text-destructive"
						>
							{editError}
						</p>
					) : null}
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onSaveEdit}
							className="inline-flex items-center justify-center rounded-lg bg-sea-ink px-3 py-1.5 text-sm font-semibold text-foam transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
						>
							{messages.consent.save}
						</button>
						<button
							type="button"
							onClick={onCancelEdit}
							className="inline-flex items-center justify-center rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-sea-ink transition-colors hover:bg-bg-base focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
						>
							{messages.consent.cancel}
						</button>
					</div>
				</div>
			</li>
		);
	}

	return (
		<li className="flex items-center gap-3 px-3 py-2.5">
			<AttributeInclusionToggle
				attribute={attribute}
				isIncluded={isIncluded}
				onToggleInclude={onToggleInclude}
			/>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold text-sea-ink">
					{attribute.label}
				</p>
				<p className={cn("truncate text-sm", empty && "text-sea-ink-soft")}>
					{empty ? messages.consent.notProvided : attribute.value}
				</p>
			</div>
			{isIncluded ? (
				<button
					type="button"
					onClick={onStartEdit}
					className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm font-semibold text-sea-ink transition-colors hover:bg-bg-base focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
				>
					<Pencil className="h-3.5 w-3.5" />
					{messages.consent.edit}
				</button>
			) : null}
		</li>
	);
}

function AttributeInclusionToggle({
	attribute,
	isIncluded,
	onToggleInclude,
}: {
	attribute: PreviewAttribute;
	isIncluded: boolean;
	onToggleInclude: () => void;
}) {
	return (
		<label className="inline-flex cursor-pointer items-center">
			<input
				type="checkbox"
				checked={isIncluded}
				onChange={onToggleInclude}
				className="size-4 cursor-pointer accent-lagoon-deep"
			/>
			<span className="sr-only">
				{messages.consent.shareLabel.replace("{label}", attribute.label)}
			</span>
		</label>
	);
}

function EditInput({
	id,
	fieldType,
	options,
	placeholder,
	value,
	onChange,
}: {
	id: string;
	fieldType: string | undefined;
	options: readonly string[] | undefined;
	placeholder: string | undefined;
	value: string;
	onChange: (value: string) => void;
}) {
	const classes =
		"w-full rounded-lg border border-line bg-bg-surface px-3.5 py-2.5 text-sea-ink placeholder:text-sea-ink-soft focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

	if (fieldType === "textarea") {
		return (
			<textarea
				id={id}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				rows={3}
				className={cn(classes, "min-h-20 resize-y")}
			/>
		);
	}

	if (fieldType === "select") {
		return (
			<select
				id={id}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={cn(classes, "pr-9")}
			>
				<option value="">{placeholder ?? ""}</option>
				{options?.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		);
	}

	return (
		<input
			id={id}
			type={fieldType ?? "text"}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			className={classes}
		/>
	);
}
