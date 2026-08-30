import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useId, useState } from "react";
import { AddProfileModal } from "#/features/profiles/AddProfileModal";
import { ContextProfileAttributesModal } from "#/features/profiles/ContextProfileAttributesModal";
import { ContextProfilesSection } from "#/features/profiles/ContextProfilesSection";
import { IdentityDataTabs } from "#/features/profiles/IdentityDataTabs";
import { ProfileSummaryCard } from "#/features/profiles/ProfileSummaryCard";
import { authClient } from "#/lib/auth-client";
import type { ProfileView } from "#/lib/contextual-profiles";
import {
	createProfileFn,
	deleteProfileFn,
	getProfileFn,
	listProfilesFn,
	updateProfileAttributeFn,
	updateProfileMetadataFn,
} from "#/lib/contextual-profiles.functions";
import { messages } from "#/lib/i18n";
import { getIdentity, updateIdentityAttribute } from "#/lib/identity.functions";
import type { ProfileType } from "#/lib/profile-catalogue";

export const Route = createFileRoute("/_authenticated/profiles")({
	loader: async () => {
		const [identity, profiles] = await Promise.all([
			getIdentity(),
			listProfilesFn(),
		]);
		return { identity, profiles };
	},
	component: Profiles,
});

type ProfileSummary = {
	id: string;
	type: ProfileType;
	name: string;
	description: string;
};

function setErrorMessage(err: unknown, fallback: string): string {
	if (err && typeof err === "object" && "message" in err) {
		const message = (err as { message: unknown }).message;
		if (typeof message === "string" && message.trim() !== "") return message;
	}
	return fallback;
}

function Profiles() {
	const { identity: initialIdentity, profiles: initialProfiles } =
		Route.useLoaderData();
	const { session } = Route.useRouteContext();
	const { data: clientSession } = authClient.useSession();

	const [identity, setIdentity] =
		useState<Record<string, string>>(initialIdentity);
	const [profiles, setProfiles] = useState<ProfileSummary[]>(initialProfiles);
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [editingProfile, setEditingProfile] = useState<ProfileView | null>(
		null,
	);
	const [editingLoading, setEditingLoading] = useState(false);
	const [metadataPending, setMetadataPending] = useState(false);
	const [metadataError, setMetadataError] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const identityHeadingId = useId();
	const contextHeadingId = useId();

	const getProfileServerFn = useServerFn(getProfileFn);
	const createProfileServerFn = useServerFn(createProfileFn);
	const updateMetadataServerFn = useServerFn(updateProfileMetadataFn);
	const updateAttributeServerFn = useServerFn(updateProfileAttributeFn);
	const deleteProfileServerFn = useServerFn(deleteProfileFn);

	const refreshProfiles = useCallback(async () => {
		setProfiles(await listProfilesFn());
	}, []);

	const handleIdentityAttributeChange = useCallback(
		(key: string, value: string) => {
			setIdentity((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	const handleIdentityAttributeSave = useCallback(
		async (key: string, value: string) => {
			const result = await updateIdentityAttribute({ data: { key, value } });
			setIdentity(result.identity);
			if (key === "firstName" || key === "lastName") {
				void authClient
					.getSession({ fetchOptions: { cache: "no-store" } })
					.catch(() => undefined);
			}
		},
		[],
	);

	const handleCreateProfile = useCallback(
		async (data: { type: ProfileType; name: string; description: string }) => {
			await createProfileServerFn({ data });
			await refreshProfiles();
			setAddModalOpen(false);
		},
		[createProfileServerFn, refreshProfiles],
	);

	const openEditModal = useCallback(
		async (profile: ProfileSummary) => {
			setMetadataError(null);
			setEditingProfile({
				id: profile.id,
				type: profile.type,
				name: profile.name,
				description: profile.description,
				createdAt: new Date(),
				updatedAt: new Date(),
				attributes: {},
				resolved: identity,
			});
			setEditingLoading(true);
			try {
				const full = await getProfileServerFn({ data: profile.id });
				setEditingProfile(full);
			} catch (err) {
				setMetadataError(setErrorMessage(err, messages.profiles.modalErrorBody));
			} finally {
				setEditingLoading(false);
			}
		},
		[getProfileServerFn, identity],
	);

	const closeEditModal = useCallback(() => {
		setEditingProfile(null);
		setEditingLoading(false);
		setMetadataError(null);
	}, []);

	const handleMetadataSave = useCallback(
		async (data: { type: ProfileType; name: string; description: string }) => {
			if (!editingProfile) return;
			setMetadataPending(true);
			setMetadataError(null);
			try {
				const updated = await updateMetadataServerFn({
					data: { id: editingProfile.id, ...data },
				});
				setEditingProfile(updated);
				await refreshProfiles();
			} catch (err) {
				setMetadataError(setErrorMessage(err, messages.profiles.modalErrorBody));
				throw err;
			} finally {
				setMetadataPending(false);
			}
		},
		[editingProfile, updateMetadataServerFn, refreshProfiles],
	);

	const handleProfileAttributeSave = useCallback(
		async (key: string, value: string) => {
			if (!editingProfile) return;
			const updated = await updateAttributeServerFn({
				data: { profileId: editingProfile.id, key, value },
			});
			setEditingProfile(updated);
		},
		[editingProfile, updateAttributeServerFn],
	);

	const handleDeleteProfile = useCallback(
		async (profile: ProfileSummary) => {
			setDeleteError(null);
			const confirmed = window.confirm(
				`Delete "${profile.name}"? This can't be undone.`,
			);
			if (!confirmed) return;
			try {
				await deleteProfileServerFn({ data: profile.id });
				if (editingProfile?.id === profile.id) setEditingProfile(null);
				await refreshProfiles();
			} catch (err) {
				setDeleteError(setErrorMessage(err, messages.profiles.modalErrorBody));
			}
		},
		[deleteProfileServerFn, refreshProfiles, editingProfile],
	);

	const sessionUser = clientSession?.user ?? session.user;
	const displayName = sessionUser?.name?.trim() || sessionUser?.email || "";

	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:gap-12">
			<header className="grid gap-3">
				<h1 className="font-display text-4xl font-bold tracking-tight text-sea-ink sm:text-5xl">
					{messages.profiles.title}
				</h1>
				<p className="max-w-3xl text-base leading-relaxed text-sea-ink-soft sm:text-lg">
					{messages.profiles.pageLede}
				</p>
			</header>

			<ProfileSummaryCard
				name={displayName}
				email={sessionUser?.email ?? ""}
				image={sessionUser?.image ?? null}
			/>

			<section
				className="grid gap-4 border-t border-line pt-6 sm:pt-10"
				aria-labelledby={identityHeadingId}
			>
				<div>
					<h2
						id={identityHeadingId}
						className="font-display text-2xl font-bold text-sea-ink sm:text-3xl"
					>
						{messages.profiles.identityHeading}
					</h2>
					<p className="mt-1 text-sm text-sea-ink-soft">
						{messages.profiles.identityLede}
					</p>
				</div>
				<IdentityDataTabs
					attributes={identity}
					onAttributeChange={handleIdentityAttributeChange}
					onSaveAttribute={handleIdentityAttributeSave}
				/>
			</section>

			<section
				className="grid gap-4 border-t border-line pt-6 sm:pt-10"
				aria-labelledby={contextHeadingId}
			>
				{deleteError ? (
					<div
						role="alert"
						className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
					>
						<p className="font-semibold">
							{messages.profiles.deleteErrorHeading}
						</p>
						<p>{deleteError}</p>
					</div>
				) : null}
				<ContextProfilesSection
					profiles={profiles}
					onAddClick={() => setAddModalOpen(true)}
					onEdit={(profile) => {
						void openEditModal(profile);
					}}
					onDelete={(profile) => {
						void handleDeleteProfile(profile);
					}}
				/>
			</section>

			<AddProfileModal
				open={addModalOpen}
				onClose={() => setAddModalOpen(false)}
				onSubmit={handleCreateProfile}
			/>

			{editingProfile ? (
				<ContextProfileAttributesModal
					profile={editingProfile}
					loading={editingLoading}
					open
					onClose={closeEditModal}
					onMetadataSave={handleMetadataSave}
					onAttributeSave={handleProfileAttributeSave}
					isMetadataPending={metadataPending}
					metadataError={metadataError}
				/>
			) : null}
		</div>
	);
}
