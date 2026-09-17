import { Link, useRouter } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ClipboardList, Code2, Link2, LogOut, Users } from "lucide-react";
import { useState } from "react";

import { authClient } from "#/lib/auth-client";
import { messages } from "#/lib/i18n";

type NavItem = {
	to: "/profiles" | "/history" | "/authorized-apps" | "/developer";
	label: string;
	icon: LucideIcon;
	kind: "identity_holder" | "developer";
};

const NAV_ITEMS: readonly NavItem[] = [
	{
		to: "/profiles",
		label: messages.nav.profiles,
		icon: Users,
		kind: "identity_holder",
	},
	{
		to: "/history",
		label: messages.nav.history,
		icon: ClipboardList,
		kind: "identity_holder",
	},
	{
		to: "/authorized-apps",
		label: messages.nav.connectedApps,
		icon: Link2,
		kind: "identity_holder",
	},
	{
		to: "/developer",
		label: messages.nav.developer,
		icon: Code2,
		kind: "developer",
	},
] as const;

function avatarInitial(name: string | null | undefined, email: string): string {
	const source = name?.trim() || email;
	return source ? source.charAt(0).toUpperCase() : "?";
}

export function Sidebar() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [signOutError, setSignOutError] = useState(false);

	const user = session?.user;
	const accountKind = user?.accountKind;
	const navItems = NAV_ITEMS.filter((item) => item.kind === accountKind);

	async function handleSignOut() {
		if (isSigningOut) return;
		setIsSigningOut(true);
		setSignOutError(false);
		try {
			const { error } = await authClient.signOut();
			if (error) {
				setSignOutError(true);
				return;
			}
			await router.navigate({ to: "/" });
		} catch {
			setSignOutError(true);
		} finally {
			setIsSigningOut(false);
		}
	}

	const userName = user?.name ?? messages.sidebar.userFallback;
	const userEmail = user?.email ?? "";
	const displayName = user?.name?.trim() || userEmail;
	const showAccountSkeleton = isPending;

	return (
		<aside
			aria-label={messages.sidebar.menuLabel}
			className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-b border-line bg-bg-surface px-4 py-4 md:h-full md:w-64 md:gap-0 md:border-b-0 md:border-r md:px-0 md:py-0"
		>
			<SidebarBrand accountKind={accountKind} />
			<SidebarNav items={navItems} />
			<SidebarAccount
				name={userName}
				email={userEmail}
				displayName={displayName}
				image={user?.image ?? null}
				loading={showAccountSkeleton}
				isSigningOut={isSigningOut}
				signOutError={signOutError}
				onSignOut={handleSignOut}
			/>
		</aside>
	);
}

function SidebarBrand({ accountKind }: { accountKind?: string }) {
	return (
		<Link
			to={accountKind === "developer" ? "/developer" : "/profiles"}
			className="inline-flex items-center gap-2.5 font-extrabold tracking-tight text-sea-ink no-underline hover:text-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring md:border-b md:border-line md:px-5 md:py-4"
			aria-label={messages.nav.brandLabel}
		>
			<span
				className="inline-flex size-8 items-center justify-center rounded-lg bg-sea-ink font-display text-sm font-bold lowercase text-foam"
				aria-hidden="true"
			>
				hm
			</span>
			<span className="font-display text-lg font-bold md:text-base">
				{messages.sidebar.brandLabel}
			</span>
		</Link>
	);
}

function SidebarNav({ items }: { items: readonly NavItem[] }) {
	return (
		<nav
			aria-label={messages.nav.appNavLabel}
			className="w-full md:flex md:flex-1 md:flex-col md:items-stretch md:overflow-y-auto md:px-3 md:py-4"
		>
			<ul className="grid w-full grid-cols-2 gap-1 md:flex md:flex-col md:items-stretch">
				{items.map((item) => (
					<li key={item.label} className="min-w-0 md:w-full">
						<SidebarNavLink item={item} />
					</li>
				))}
			</ul>
		</nav>
	);
}

function SidebarNavLink({ item }: { item: NavItem }) {
	const Icon = item.icon;
	return (
		<Link
			to={item.to}
			activeOptions={{ exact: item.to === "/profiles" }}
			className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-sea-ink-soft no-underline transition-colors hover:bg-lagoon/10 hover:text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring aria-[current=page]:bg-lagoon/20 aria-[current=page]:text-sea-ink md:py-2.5"
		>
			<Icon className="size-4" aria-hidden="true" />
			{item.label}
		</Link>
	);
}

type SidebarAccountProps = {
	name: string;
	email: string;
	displayName: string;
	image: string | null;
	loading: boolean;
	isSigningOut: boolean;
	signOutError: boolean;
	onSignOut: () => void;
};

function SidebarAccount({
	name,
	email,
	displayName,
	image,
	loading,
	isSigningOut,
	signOutError,
	onSignOut,
}: SidebarAccountProps) {
	return (
		<div className="flex flex-row items-center gap-3 md:flex-col md:items-stretch md:gap-3 md:border-t md:border-line md:p-4">
			{loading ? (
				<div
					aria-hidden="true"
					className="size-9 animate-pulse rounded-full bg-bg-base"
				/>
			) : image ? (
				<img
					src={image}
					alt={messages.auth.avatarAlt.replace("{name}", name || email)}
					className="size-9 rounded-full border border-line object-cover"
				/>
			) : (
				<span
					aria-hidden="true"
					className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-bg-base text-sm font-semibold text-sea-ink-soft"
				>
					{avatarInitial(name, email)}
				</span>
			)}
			<div className="min-w-0 flex-1 md:flex-none">
				<p className="truncate text-sm font-semibold text-sea-ink">
					{displayName || name}
				</p>
				{email ? (
					<p className="truncate text-xs text-sea-ink-soft">{email}</p>
				) : null}
			</div>
			<button
				type="button"
				onClick={onSignOut}
				disabled={loading || isSigningOut}
				aria-label={messages.nav.signOut}
				className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-bg-surface px-3 py-2 text-sm font-semibold text-sea-ink transition-colors hover:bg-lagoon/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
			>
				<LogOut className="size-4" aria-hidden="true" />
				<span className="hidden md:inline">
					{isSigningOut ? messages.nav.signingOut : messages.nav.signOut}
				</span>
			</button>
			{signOutError ? (
				<p
					role="alert"
					className="text-xs font-semibold text-destructive md:basis-full"
				>
					{messages.auth.signOutError}
				</p>
			) : null}
		</div>
	);
}
