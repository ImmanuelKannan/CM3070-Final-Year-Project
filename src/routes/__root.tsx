import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import {
	SiteFooter,
	SiteHeader,
	SkipLink,
} from "#/components/site-shell-component";
import { locale, messages } from "#/lib/i18n";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ name: "theme-color", content: "#173a40" },
			{ title: messages.meta.title },
			{ name: "description", content: messages.meta.description },
			{ property: "og:title", content: messages.meta.ogTitle },
			{ property: "og:description", content: messages.meta.description },
			{ property: "og:type", content: "website" },
			{ name: "twitter:card", content: "summary" },
			{ name: "twitter:title", content: messages.meta.ogTitle },
			{ name: "twitter:description", content: messages.meta.description },
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	shellComponent: RootDocument,
});

function useIsAuthenticatedShell(): boolean {
	return useRouterState({
		select: (state) =>
			state.matches.some((match) =>
				match.routeId.startsWith("/_authenticated"),
			),
	});
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const isAuthenticated = useIsAuthenticatedShell();

	return (
		<html lang={locale} className="min-h-full">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-full bg-bg-base font-sans text-sea-ink antialiased">
				{isAuthenticated ? (
					children
				) : (
					<>
						<SkipLink />
						<div className="flex min-h-dvh flex-col">
							<SiteHeader />
							<main
								id="main-content"
								className="flex-1 py-8 focus-visible:outline-none sm:py-12 lg:py-16"
								tabIndex={-1}
							>
								{children}
							</main>
							<SiteFooter />
						</div>
					</>
				)}
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
