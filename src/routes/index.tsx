import { createFileRoute } from "@tanstack/react-router";

import { messages } from "#/lib/i18n";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<header className="grid max-w-3xl gap-4">
				<h1 className="font-display text-4xl leading-tight font-bold tracking-tight text-sea-ink sm:text-5xl">
					{messages.home.title}
				</h1>
				<p className="text-lg leading-relaxed text-sea-ink-soft sm:text-xl">
					{messages.home.lede}
				</p>
			</header>

			<section
				className="grid max-w-3xl gap-3 border-t border-line pt-6 sm:pt-10"
				aria-labelledby="heyme-what"
			>
				<h2
					id="heyme-what"
					className="font-display text-3xl font-bold text-sea-ink"
				>
					{messages.home.heading}
				</h2>
				<p className="text-lg leading-relaxed text-sea-ink-soft">
					{messages.home.body}
				</p>
			</section>
		</div>
	);
}
