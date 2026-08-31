import { del, put } from "@vercel/blob";

import type { ProfilePictureStorage } from "#/lib/profile-picture";
import { PROFILE_PICTURES_PREFIX } from "#/lib/profile-picture";

export const profilePictureStorage: ProfilePictureStorage = {
	async put(file, pathname) {
		const { url } = await put(pathname, file, {
			access: "public",
			addRandomSuffix: false,
			contentType: file.type,
		});
		return url;
	},
	async delete(urlOrPathname) {
		await del(urlOrPathname);
	},
	isManagedUrl(url, userPrefix) {
		try {
			const { hostname, pathname } = new URL(url);
			const hostSuffix =
				process.env.BLOB_HOST_SUFFIX ?? ".blob.vercel-storage.com";
			return (
				hostname.endsWith(hostSuffix) &&
				userPrefix.startsWith(PROFILE_PICTURES_PREFIX) &&
				pathname.startsWith(`/${userPrefix}`)
			);
		} catch {
			return false;
		}
	},
};
