import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";

import {
	getAuthorizedApps,
	revokeAuthorizedApp,
} from "#/lib/authorized-apps.functions";
import { formatDateTime } from "#/lib/format-date";
import { messages } from "#/lib/i18n";
import { getLabelText } from "#/lib/permission-label";
import { ATTRIBUTE_LABELS } from "#/lib/profile-catalogue";

function isNotFound(err: unknown): boolean {
	if (!err || typeof err !== "object") return false;
	return (err as { status?: unknown }).status === "NOT_FOUND";
}

type AuthorizedAppDetail = NonNullable<
	Awaited<ReturnType<typeof getAuthorizedApps>>
>;

export const Route = createFileRoute(
	"/_authenticated/authorized-apps/$clientId",
)({
	loader: async ({ params }) => {
		try {
			const authorizedApp = await getAuthorizedApps({
				data: params.clientId,
			});
			return { authorizedApp, notFound: false as const };
		} catch (err) {
			if (isNotFound(err)) {
				return { authorizedApp: null, notFound: true as const };
			}
			throw err;
		}
	},
	pendingComponent: AuthorizedAppDetailPending,
	component: AuthorizedAppDetailPage,
});

function AuthorizedAppDetailPending() {
	return (
		<div className="mx-auto grid w-full max-w-3xl gap-8 px-4 sm:gap-10">
			<BackLink />
			<output className="rounded-2xl border border-line bg-bg-surface p-6 text-sm text-sea-ink-soft">
				{messages.authorizedApps.loading}
			</output>
		</div>
	);
}

function AuthorizedAppDetailPage() {
	const data = Route.useLoaderData();
	if (data.notFound) return <NotFoundView />;
	return <AuthorizedAppDetail authorizedApp={data.authorizedApp} />;
}

function NotFoundView() {
	return (
		<div className="mx-auto grid w-full max-w-2xl gap-6 px-4">
			<BackLink />
			<section className="grid gap-2 rounded-2xl border border-line bg-bg-surface p-6 text-center sm:p-8">
				<h1 className="font-display text-2xl font-bold text-sea-ink">
					{messages.authorizedApps.notFoundHeading}
				</h1>
				<p className="text-sm text-sea-ink-soft">
					{messages.authorizedApps.notFoundBody}
				</p>
			</section>
		</div>
	);
}

function BackLink() {
	return (
		<Link
			to="/authorized-apps"
			className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-sea-ink-soft no-underline transition-colors hover:text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
		>
			<ArrowLeft aria-hidden="true" className="h-4 w-4" />
			{messages.authorizedApps.backToList}
		</Link>
	);
}

function AuthorizedAppDetail({
	authorizedApp,
}: {
	authorizedApp: AuthorizedAppDetail;
}) {
	const navigate = useNavigate();
	const revokeServerFn = useServerFn(revokeAuthorizedApp);

	const [revoking, setRevoking] = useState(false);
	const [revokeError, setRevokeError] = useState(false);

	const displayName = authorizedApp.name?.trim() || authorizedApp.clientId;
	const sharedEntries = sortedEntries(authorizedApp.releasedAttributes);
	const latestGrantLabel = messages.authorizedApps.lastShared.replace(
		"{when}",
		formatDateTime(authorizedApp.latestGrantAt),
	);

	async function handleRevoke() {
		if (
			revoking ||
			!window.confirm(
				[
					messages.authorizedApps.revokeConfirmTitle.replace(
						"{name}",
						displayName,
					),
					messages.authorizedApps.revokeConfirmBody,
				].join("\n\n"),
			)
		)
			return;

		setRevokeError(false);
		setRevoking(true);
		try {
			await revokeServerFn({ data: authorizedApp.clientId });
			await navigate({ to: "/authorized-apps" });
		} catch {
			setRevokeError(true);
		} finally {
			setRevoking(false);
		}
	}

	return (
		<div className="mx-auto grid w-full max-w-3xl gap-8 px-4 sm:gap-10">
			<BackLink />

			<header className="grid gap-4">
				<div className="flex items-center gap-4">
					<span
						aria-hidden="true"
						className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-lagoon text-lg font-bold text-foam"
					>
						{displayName.charAt(0).toUpperCase()}
					</span>
					<div className="min-w-0">
						<h1 className="break-words font-display text-3xl font-bold text-sea-ink sm:text-4xl">
							{displayName}
						</h1>
						<p className="text-sm text-sea-ink-soft">{latestGrantLabel}</p>
					</div>
				</div>
				<dl className="grid gap-3 rounded-2xl border border-line bg-bg-surface p-4 sm:grid-cols-2 sm:p-5">
					<div>
						<dt className="text-xs font-semibold uppercase tracking-wide text-sea-ink-soft">
							{messages.authorizedApps.detailAppClientLabel}
						</dt>
						<dd className="mt-0.5 break-all font-mono text-sm text-sea-ink">
							{authorizedApp.clientId}
						</dd>
					</div>
				</dl>
			</header>

			<section
				className="grid gap-2"
				aria-labelledby="authorized-app-scopes-heading"
			>
				<h2
					id="authorized-app-scopes-heading"
					className="font-display text-lg font-bold text-sea-ink"
				>
					{messages.authorizedApps.scopesHeading}
				</h2>
				{authorizedApp.scopes.length > 0 ? (
					<ul className="flex flex-wrap gap-1.5">
						{authorizedApp.scopes.map((scope) => (
							<li
								key={scope}
								className="max-w-full break-all rounded-full border border-line bg-bg-surface px-2.5 py-0.5 text-xs font-semibold text-sea-ink"
							>
								{getLabelText(scope)}
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-sea-ink-soft">—</p>
				)}
			</section>

			<section
				className="grid gap-2"
				aria-labelledby="authorized-app-attributes-heading"
			>
				<h2
					id="authorized-app-attributes-heading"
					className="font-display text-lg font-bold text-sea-ink"
				>
					{messages.authorizedApps.attributesHeading}
				</h2>
				{sharedEntries.length > 0 ? (
					<dl className="grid gap-2 rounded-2xl border border-line bg-bg-surface p-4 sm:p-5">
						{sharedEntries.map(([key, value]) => (
							<div
								key={key}
								className="flex flex-col gap-0.5 border-b border-line/60 pb-2 last:border-b-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-6"
							>
								<dt className="text-sm text-sea-ink-soft">
									{ATTRIBUTE_LABELS[key] ?? key}
								</dt>
								<dd className="break-all text-sm font-semibold text-sea-ink">
									{value}
								</dd>
							</div>
						))}
					</dl>
				) : (
					<p className="text-sm text-sea-ink-soft">
						{messages.authorizedApps.noAttributes}
					</p>
				)}
			</section>

			<div className="grid justify-items-end gap-2 border-t border-line pt-6">
				<button
					type="button"
					onClick={() => {
						void handleRevoke();
					}}
					disabled={revoking}
					aria-busy={revoking}
					className="inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-bg-surface px-4 py-2.5 font-semibold text-destructive no-underline transition-colors hover:bg-destructive/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
				>
					<Trash2 aria-hidden="true" className="h-4 w-4" />
					{revoking
						? messages.authorizedApps.revoking
						: messages.authorizedApps.revoke}
				</button>
				{revokeError ? (
					<p role="alert" className="text-sm font-semibold text-destructive">
						{messages.authorizedApps.revokeErrorBody}
					</p>
				) : null}
			</div>
		</div>
	);
}

function sortedEntries(
	record: Record<string, string>,
): Array<[string, string]> {
	const label = (key: string): string =>
		ATTRIBUTE_LABELS[key] ?? key.toLowerCase();
	return Object.entries(record).sort(([a], [b]) =>
		label(a).localeCompare(label(b)),
	);
}
