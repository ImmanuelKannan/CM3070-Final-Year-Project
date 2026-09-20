import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { Link2, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Input } from "#/components/ui/input";
import { listAuthorizedApps } from "#/lib/authorized-apps.functions";
import { formatDateTime } from "#/lib/format-date";
import { messages } from "#/lib/i18n";
import { getLabelText } from "#/lib/permission-label";
import { ATTRIBUTE_LABELS } from "#/lib/profile-catalogue";

export const Route = createFileRoute("/_authenticated/authorized-apps/")({
	beforeLoad: ({ context }) => {
		if (context.session.user.accountKind !== "identity_holder") {
			throw redirect({ to: "/" });
		}
	},
	validateSearch: z.object({
		q: z.string().max(200).optional(),
	}),
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
	const navigate = useNavigate();
	const { q } = Route.useSearch();
	const query = q?.trim().toLowerCase() ?? "";
	const filteredApps = query
		? authorizedApps.filter(
				(app) =>
					(app.name?.toLowerCase().includes(query) ?? false) ||
					app.clientId.toLowerCase().includes(query),
			)
		: authorizedApps;

	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<AuthorizedAppsHeader />
			{authorizedApps.length === 0 ? (
				<EmptyState hasSearch={false} />
			) : (
				<>
					<SearchBox
						value={q ?? ""}
						onChange={(value) =>
							navigate({
								to: "/authorized-apps",
								search: { q: value || undefined },
								replace: true,
							})
						}
					/>
					{filteredApps.length === 0 ? (
						<EmptyState hasSearch />
					) : (
						<ul className="grid gap-3">
							{filteredApps.map((authorizedApp) => (
								<AuthorizedAppRow
									key={authorizedApp.clientId}
									authorizedApp={authorizedApp}
									searchQuery={q?.trim() || undefined}
								/>
							))}
						</ul>
					)}
				</>
			)}
		</div>
	);
}

function SearchBox({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const [searchDraft, setSearchDraft] = useState(value);
	useEffect(() => {
		setSearchDraft(value);
	}, [value]);
	const isSearching = searchDraft !== value;
	return (
		<search className="grid gap-1.5">
			<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
				<label
					htmlFor="authorized-apps-search"
					className="text-sm font-semibold text-sea-ink"
				>
					{messages.authorizedApps.searchLabel}
				</label>
				{searchDraft ? (
					<Link
						to="/authorized-apps"
						className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-lagoon-deep underline underline-offset-4 hover:text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						{messages.authorizedApps.clearSearch}
					</Link>
				) : null}
			</div>
			<div className="relative">
				<Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-sea-ink-soft" />
				<Input
					id="authorized-apps-search"
					type="search"
					value={searchDraft}
					onChange={(e) => {
						setSearchDraft(e.target.value);
						onChange(e.target.value);
					}}
					placeholder={messages.authorizedApps.searchPlaceholder}
					className="min-h-11 pl-10 pr-9"
				/>
				{isSearching ? (
					<span
						aria-live="polite"
						className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
					>
						<Loader2
							className="h-4 w-4 animate-spin text-lagoon-deep motion-reduce:animate-none"
						/>
						<span className="sr-only">{messages.authorizedApps.searching}</span>
					</span>
				) : null}
			</div>
		</search>
	);
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
	return (
		<section className="grid gap-3 rounded-2xl border border-line bg-bg-surface p-8 text-center">
			<span
				aria-hidden="true"
				className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-bg-base text-lagoon-deep"
			>
				{hasSearch ? (
					<Search className="h-5 w-5" />
				) : (
					<Link2 className="h-5 w-5" />
				)}
			</span>
			<p className="text-base font-semibold text-sea-ink">
				{hasSearch
					? messages.authorizedApps.noMatchHeading
					: messages.authorizedApps.empty}
			</p>
			<p className="text-sm text-sea-ink-soft">
				{hasSearch
					? messages.authorizedApps.noMatchBody
					: messages.authorizedApps.emptyHint}
			</p>
		</section>
	);
}

function AuthorizedAppRow({
	authorizedApp,
	searchQuery,
}: {
	authorizedApp: Awaited<ReturnType<typeof listAuthorizedApps>>[number];
	searchQuery?: string;
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
				search={{ q: searchQuery }}
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
