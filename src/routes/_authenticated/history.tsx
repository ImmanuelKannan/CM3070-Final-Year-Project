import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	CheckCircle,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Info,
	Search,
	Trash2,
	XCircle,
} from "lucide-react";
import { z } from "zod";

import type {
	ConsentHistory,
	ConsentHistoryEvent,
} from "#/lib/consent-history";
import { getConsentHistory } from "#/lib/consent-history.functions";
import { getRequestedIdentityAttributeKeys } from "#/lib/consent-preview";
import { formatDateTime } from "#/lib/format-date";
import { messages } from "#/lib/i18n";
import { getLabelText } from "#/lib/permission-label";
import { ATTRIBUTE_LABELS } from "#/lib/profile-catalogue";

type ConsentHistoryEventConfig = {
	label: string;
	message: string;
	icon: LucideIcon;
	iconClass: string;
	badgeClass: string;
};

const CONSENT_HISTORY_EVENT_CONFIG: Record<
	ConsentHistoryEvent["type"],
	ConsentHistoryEventConfig
> = {
	requested: {
		label: messages.history.requested,
		message: messages.history.eventRequested,
		icon: Info,
		iconClass: "text-lagoon-deep",
		badgeClass: "bg-lagoon/10 text-lagoon-deep",
	},
	approved: {
		label: messages.history.approved,
		message: messages.history.eventApproved,
		icon: CheckCircle,
		iconClass: "text-palm",
		badgeClass: "bg-palm/10 text-palm",
	},
	rejected: {
		label: messages.history.rejected,
		message: messages.history.eventRejected,
		icon: XCircle,
		iconClass: "text-destructive",
		badgeClass: "bg-destructive/10 text-destructive",
	},
	revoked: {
		label: messages.history.revoked,
		message: messages.history.eventRevoked,
		icon: Trash2,
		iconClass: "text-lagoon-deep",
		badgeClass: "bg-lagoon/10 text-lagoon-deep",
	},
};

export const Route = createFileRoute("/_authenticated/history")({
	beforeLoad: ({ context }) => {
		if (context.session.user.accountKind !== "identity_holder") {
			throw redirect({ to: "/" });
		}
	},
	validateSearch: z.object({
		search: z.string().max(200).optional(),
		page: z.coerce.number().int().min(1).max(10_000).catch(1),
	}),
	loaderDeps: ({ search }) => ({
		search: search.search?.trim() || undefined,
		page: search.page,
	}),
	loader: async ({ deps }): Promise<ConsentHistory> =>
		getConsentHistory({
			data: {
				search: deps.search,
				page: deps.page,
			},
		}),
	pendingComponent: HistoryPending,
	errorComponent: HistoryError,
	component: HistoryPage,
});

function HistoryHeader() {
	return (
		<header className="grid gap-3">
			<h1 className="font-display text-4xl font-bold tracking-tight text-sea-ink sm:text-5xl">
				{messages.history.title}
			</h1>
			<p className="max-w-2xl text-base leading-relaxed text-sea-ink-soft sm:text-lg">
				{messages.history.pageText}
			</p>
		</header>
	);
}

function HistoryPending() {
	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<HistoryHeader />
			<output className="rounded-2xl border border-line bg-bg-surface p-6 text-sm text-sea-ink-soft">
				{messages.history.loading}
			</output>
		</div>
	);
}

function HistoryError() {
	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<HistoryHeader />
			<section
				role="alert"
				className="grid gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive"
			>
				<h2 className="font-display text-xl font-bold">
					{messages.history.errorHeading}
				</h2>
				<p className="text-sm">{messages.history.errorBody}</p>
			</section>
		</div>
	);
}

function HistoryPage() {
	const history = Route.useLoaderData();
	const routeSearch = Route.useSearch();
	const search = routeSearch.search?.trim() ?? "";
	const page = history.page;

	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<HistoryHeader />
			<Summary summary={history.summary} />
			<div className="grid gap-6">
				<search>
					<form
						method="get"
						action="/history"
						className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
					>
						<div className="grid gap-1.5">
							<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
								<label
									htmlFor="history-search"
									className="text-sm font-semibold text-sea-ink"
								>
									{messages.history.searchLabel}
								</label>
								{search ? (
									<Link
										to="/history"
										search={{ search: undefined, page: 1 }}
										className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-lagoon-deep underline underline-offset-4 hover:text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
									>
										{messages.history.clearSearch}
									</Link>
								) : null}
							</div>
							<div className="relative">
								<Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-sea-ink-soft" />
								<input
									id="history-search"
									name="search"
									type="search"
									defaultValue={routeSearch.search ?? ""}
									placeholder={messages.history.searchPlaceholder}
									className="min-h-11 w-full rounded-lg border border-line bg-bg-base px-3.5 py-2.5 pl-10 text-sea-ink placeholder:text-sea-ink-soft focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
								/>
							</div>
						</div>
						<button
							type="submit"
							className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-sea-ink px-4 py-2.5 font-semibold text-foam transition-colors hover:bg-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
						>
							<Search className="size-4" />
							{messages.history.search}
						</button>
					</form>
				</search>

				{history.events.length === 0 ? (
					<EmptyHistory hasSearch={search.length > 0} />
				) : (
					<Timeline events={history.events} />
				)}

				<Pagination
					page={page}
					search={search}
					hasPrevious={history.hasPrevious}
					hasNext={history.hasNext}
				/>
			</div>
		</div>
	);
}

function Summary({ summary }: { summary: ConsentHistory["summary"] }) {
	const items = [
		{
			label: messages.history.totalDecisions,
			value: summary.totalDecisions,
			icon: Info,
			iconClass: "text-sea-ink",
		},
		{
			label: messages.history.approved,
			value: summary.approved,
			icon: CheckCircle,
			iconClass: "text-palm",
		},
		{
			label: messages.history.rejected,
			value: summary.rejected,
			icon: XCircle,
			iconClass: "text-destructive",
		},
		{
			label: messages.history.revoked,
			value: summary.revoked,
			icon: Trash2,
			iconClass: "text-lagoon-deep",
		},
	] as const;

	return (
		<section className="grid gap-3 rounded-2xl border border-line bg-bg-surface p-4 sm:p-5">
			<h2
				id="history-summary-heading"
				className="font-display text-xl font-bold text-sea-ink"
			>
				{messages.history.summaryHeading}
			</h2>
			<dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{items.map((item) => {
					const Icon = item.icon;
					return (
						<div key={item.label} className="grid gap-1">
							<dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sea-ink-soft">
								<Icon className={`size-4 ${item.iconClass}`} />
								{item.label}
							</dt>
							<dd className="text-xl font-bold text-sea-ink">{item.value}</dd>
						</div>
					);
				})}
			</dl>
		</section>
	);
}

function EmptyHistory({ hasSearch }: { hasSearch: boolean }) {
	return (
		<section className="grid gap-2 rounded-2xl border border-line bg-bg-surface p-8 text-center">
			<span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-bg-base text-lagoon-deep">
				{hasSearch ? (
					<Search className="size-5" />
				) : (
					<Info className="size-5" />
				)}
			</span>
			<h2 className="font-display text-xl font-bold text-sea-ink">
				{hasSearch
					? messages.history.noMatchHeading
					: messages.history.emptyHeading}
			</h2>
			<p className="text-sm text-sea-ink-soft">
				{hasSearch ? messages.history.noMatchBody : messages.history.emptyBody}
			</p>
		</section>
	);
}

function Timeline({ events }: { events: ConsentHistory["events"] }) {
	return (
		<section className="grid gap-4">
			<h2
				id="history-timeline-heading"
				className="font-display text-xl font-bold text-sea-ink"
			>
				{messages.history.timelineHeading}
			</h2>
			<div className="relative">
				<div className="absolute bottom-4 left-4 top-4 w-px bg-line sm:bottom-5 sm:left-5 sm:top-5" />
				<ol className="grid gap-3">
					{events.map((event) => (
						<EventRow key={event.id} event={event} />
					))}
				</ol>
			</div>
		</section>
	);
}

function EventRow({ event }: { event: ConsentHistoryEvent }) {
	const config = CONSENT_HISTORY_EVENT_CONFIG[event.type];
	const Icon = config.icon;
	const appName = event.clientName.trim() || event.clientId;
	const message = config.message.replace("{app}", appName);

	return (
		<li className="relative pl-10 sm:pl-12">
			<span className="absolute left-0 top-3 inline-flex size-8 items-center justify-center rounded-full border border-line bg-bg-base sm:size-10">
				<Icon className={`size-4 sm:size-5 ${config.iconClass}`} />
			</span>
			<details className="group rounded-2xl border border-line bg-bg-surface">
				<summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 rounded-2xl p-4 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&::-webkit-details-marker]:hidden">
					<span className="min-w-0">
						<span className="block break-words font-display text-base font-bold text-sea-ink">
							{message}
						</span>
						<span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sea-ink-soft">
							<span
								className={`rounded-full px-2 py-0.5 font-semibold ${config.badgeClass}`}
							>
								{config.label}
							</span>
							<EventTime value={event.createdAt} />
						</span>
					</span>
					<ChevronDown className="mt-0.5 size-5 shrink-0 text-sea-ink-soft transition-transform group-open:rotate-180" />
				</summary>
				<div className="grid gap-3 border-t border-line p-4">
					<h3 className="font-display text-sm font-bold text-sea-ink">
						{messages.history.detailsHeading}
					</h3>
					<EventDetails event={event} appName={appName} />
				</div>
			</details>
		</li>
	);
}

function EventDetails({
	event,
	appName,
}: {
	event: ConsentHistoryEvent;
	appName: string;
}) {
	const requestedAttributes =
		event.type === "approved"
			? getRequestedIdentityAttributeKeys(event.scopes)
			: [];
	return (
		<dl className="grid gap-3 text-sm">
			<DetailRow label={messages.history.appLabel}>
				<span className="break-words">{appName}</span>
			</DetailRow>
			<DetailRow label={messages.history.identifierLabel}>
				<span className="break-all font-mono">{event.clientId}</span>
			</DetailRow>
			<DetailRow label={messages.history.permissionsLabel}>
				{event.scopes.length > 0 ? (
					<ul className="flex flex-wrap gap-1.5">
						{event.scopes.map((scope) => (
							<li
								key={scope}
								className="max-w-full break-all rounded-full border border-line bg-bg-base px-2.5 py-1 text-xs font-semibold text-sea-ink"
							>
								{getLabelText(scope)}
							</li>
						))}
					</ul>
				) : (
					<span className="text-sea-ink-soft">
						{messages.history.noPermissions}
					</span>
				)}
			</DetailRow>
			<DetailRow label={messages.history.timestampLabel}>
				<EventTime value={event.createdAt} />
			</DetailRow>
			{event.type === "approved" ? (
				<DetailRow label={messages.history.requestedAttributesLabel}>
					{requestedAttributes.length > 0 ? (
						<dl className="grid gap-2">
							{requestedAttributes.map((key) => {
								const value = event.releasedAttributes[key];
								const shared = value !== undefined;
								return (
									<div
										key={key}
										className="grid gap-0.5 border-t border-line first:border-t-0 first:pt-0 sm:grid-cols-[minmax(8rem,auto)_minmax(0,1fr)] sm:gap-3"
									>
										<dt className="text-sea-ink-soft">
											{ATTRIBUTE_LABELS[key] ?? key}
										</dt>
										<dd
											className={
												shared
													? "break-words font-semibold text-sea-ink"
													: "text-sea-ink-soft"
											}
										>
											{shared ? value : messages.history.notShared}
										</dd>
									</div>
								);
							})}
						</dl>
					) : (
						<span className="text-sea-ink-soft">
							{messages.history.emptyRequestedAttributes}
						</span>
					)}
				</DetailRow>
			) : null}
		</dl>
	);
}

function DetailRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid gap-1 sm:grid-cols-[minmax(8rem,auto)_minmax(0,1fr)] sm:gap-4">
			<dt className="font-semibold text-sea-ink-soft">{label}</dt>
			<dd className="min-w-0 text-sea-ink">{children}</dd>
		</div>
	);
}

function EventTime({ value }: { value: ConsentHistoryEvent["createdAt"] }) {
	const date = value instanceof Date ? value : new Date(value);
	return <time dateTime={date.toISOString()}>{formatDateTime(date)}</time>;
}

function Pagination({
	page,
	search,
	hasPrevious,
	hasNext,
}: {
	page: number;
	search: string;
	hasPrevious: boolean;
	hasNext: boolean;
}) {
	const previousSearch = { search: search || undefined, page: page - 1 };
	const nextSearch = { search: search || undefined, page: page + 1 };

	return (
		<nav>
			<div className="flex flex-wrap items-center justify-between gap-2">
				{hasPrevious ? (
					<Link
						to="/history"
						search={previousSearch}
						className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-bg-surface px-3.5 py-2 text-sm font-semibold text-sea-ink no-underline transition-colors hover:bg-lagoon/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						<ChevronLeft className="size-4" />
						{messages.history.previous}
					</Link>
				) : (
					<span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-bg-surface px-3.5 py-2 text-sm font-semibold text-sea-ink-soft opacity-60">
						<ChevronLeft className="size-4" />
						{messages.history.previous}
					</span>
				)}
				<span className="inline-flex min-h-11 items-center rounded-lg bg-bg-base px-3.5 py-2 text-sm font-semibold text-sea-ink">
					{messages.history.page.replace("{page}", String(page))}
				</span>
				{hasNext ? (
					<Link
						to="/history"
						search={nextSearch}
						className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-bg-surface px-3.5 py-2 text-sm font-semibold text-sea-ink no-underline transition-colors hover:bg-lagoon/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						{messages.history.next}
						<ChevronRight className="size-4" />
					</Link>
				) : (
					<span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-bg-surface px-3.5 py-2 text-sm font-semibold text-sea-ink-soft opacity-60">
						{messages.history.next}
						<ChevronRight className="size-4" />
					</span>
				)}
			</div>
		</nav>
	);
}
