import { createFileRoute, Link } from "@tanstack/react-router";
import { Link2 } from "lucide-react";

import { listAuthorizedApps } from "#/lib/authorized-apps.functions";
import { formatDateTime } from "#/lib/format-date";
import { messages } from "#/lib/i18n";
import { getLabelText } from "#/lib/permission-label";
import { ATTRIBUTE_LABELS } from "#/lib/profile-catalogue";

export const Route = createFileRoute("/_authenticated/authorized-apps/")({
	loader: async () => ({ authorizedApps: await listAuthorizedApps() }),
	pendingComponent: AuthorizedAppsPending,
	component: AuthorizedAppsIndex,
});

function AuthorizedAppsHeader() {
	return (
		<header className="grid gap-3">
			<h1 className="font-display text-4xl font-bold tracking-tight text-sea-ink sm:text-5xl">
				{messages.authorizedApps.title}
			</h1>
			<p className="max-w-3xl text-base leading-relaxed text-sea-ink-soft sm:text-lg">
				{messages.authorizedApps.pageText}
			</p>
		</header>
	);
}

function AuthorizedAppsPending() {
	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<AuthorizedAppsHeader />
			<output className="rounded-2xl border border-line bg-bg-surface p-6 text-sm text-sea-ink-soft">
				{messages.authorizedApps.loading}
			</output>
		</div>
	);
}

function AuthorizedAppsIndex() {
	const { authorizedApps } = Route.useLoaderData();

	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<AuthorizedAppsHeader />
			{authorizedApps.length === 0 ? (
				<EmptyState />
			) : (
				<ul className="grid gap-3">
					{authorizedApps.map((authorizedApp) => (
						<AuthorizedAppRow
							key={authorizedApp.clientId}
							authorizedApp={authorizedApp}
						/>
					))}
				</ul>
			)}
		</div>
	);
}

function EmptyState() {
	return (
		<section className="grid gap-3 rounded-2xl border border-line bg-bg-surface p-8 text-center">
			<span
				aria-hidden="true"
				className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-bg-base text-lagoon-deep"
			>
				<Link2 className="h-5 w-5" />
			</span>
			<p className="text-base font-semibold text-sea-ink">
				{messages.authorizedApps.empty}
			</p>
			<p className="text-sm text-sea-ink-soft">
				{messages.authorizedApps.emptyHint}
			</p>
		</section>
	);
}

function AuthorizedAppRow({
	authorizedApp,
}: {
	authorizedApp: Awaited<ReturnType<typeof listAuthorizedApps>>[number];
}) {
	const displayName = authorizedApp.name?.trim() || authorizedApp.clientId;
	const sharedEntries = sortedEntries(authorizedApp.releasedAttributes);
	const lastShared = messages.authorizedApps.lastShared.replace(
		"{when}",
		formatDateTime(authorizedApp.latestGrantAt),
	);

	return (
		<li>
			<Link
				to="/authorized-apps/$clientId"
				params={{ clientId: authorizedApp.clientId }}
				className="group grid gap-3 rounded-2xl border border-line bg-bg-surface p-5 no-underline transition-colors hover:border-lagoon/40 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
				aria-label={displayName}
			>
				<header className="flex items-center gap-3">
					<span
						aria-hidden="true"
						className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-lagoon text-base font-bold text-foam"
					>
						{displayName.charAt(0).toUpperCase()}
					</span>
					<div className="min-w-0">
						<p className="truncate font-display text-lg font-bold text-sea-ink">
							{displayName}
						</p>
						<p className="text-xs text-sea-ink-soft">{lastShared}</p>
					</div>
				</header>

				{authorizedApp.scopes.length > 0 ? (
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-sea-ink-soft">
							{messages.authorizedApps.scopesHeading}
						</p>
						<ul className="mt-1.5 flex flex-wrap gap-1.5">
							{authorizedApp.scopes.map((scope) => (
								<li
									key={scope}
									className="max-w-full break-all rounded-full border border-line bg-bg-base px-2.5 py-0.5 text-xs font-semibold text-sea-ink"
								>
									{getLabelText(scope)}
								</li>
							))}
						</ul>
					</div>
				) : null}

				{sharedEntries.length > 0 ? (
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-sea-ink-soft">
							{messages.authorizedApps.attributesHeading}
						</p>
						<dl className="mt-1.5 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
							{sharedEntries.map(([key, value]) => (
								<div key={key} className="flex justify-between gap-3">
									<dt className="text-sea-ink-soft">
										{ATTRIBUTE_LABELS[key] ?? key}
									</dt>
									<dd className="truncate font-semibold text-sea-ink">
										{value}
									</dd>
								</div>
							))}
						</dl>
					</div>
				) : null}
			</Link>
		</li>
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
