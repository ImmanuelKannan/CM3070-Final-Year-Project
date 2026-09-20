import { Link } from "@tanstack/react-router";

import { messages } from "#/lib/i18n";

export function SkipLink() {
	return (
		<a
			className="absolute -top-20 left-2 z-50 rounded-lg bg-sea-ink px-3.5 py-2 font-semibold text-foam no-underline focus:top-2 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
			href="#main-content"
		>
			{messages.nav.skipToContent}
		</a>
	);
}

export function SiteHeader() {
	return (
		<header className="border-b border-line bg-bg-surface">
			<div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4">
				<Link
					to="/"
					className="inline-flex items-center gap-2.5 font-extrabold tracking-tight text-sea-ink no-underline hover:text-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					aria-label={messages.nav.brandLabel}
				>
					<span
						className="inline-flex size-8 items-center justify-center rounded-lg bg-sea-ink font-display text-sm font-bold lowercase text-foam"
						aria-hidden="true"
					>
						hm
					</span>
					<span className="font-display text-xl font-bold">
						{messages.brand.name}
					</span>
				</Link>
			</div>
		</header>
	);
}