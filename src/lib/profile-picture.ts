import { createHash, randomUUID } from "node:crypto";
import { APIError } from "better-auth/api";

import { getBaseIdentity, updateBaseIdentity } from "#/lib/identity";
import {
	PROFILE_PICTURE_TYPES,
	type ProfilePictureMime,
	validateProfilePictureMetadata,
} from "#/lib/profile-picture-rules";

export const PROFILE_PICTURES_PREFIX = "profile-pictures/";

export interface ProfilePictureStorage {
	put(file: Blob, pathname: string): Promise<string>;
	delete(urlOrPathname: string): Promise<void>;
	isManagedUrl(url: string, userPrefix: string): boolean;
}

/**
  * Get magic byte reference for different formats from https://en.wikipedia.org/wiki/List_of_file_signatures
  */
function isAllowedMagicByteSequence(mime: ProfilePictureMime, bytes: Uint8Array): boolean {
	switch (mime) {
		case "image/jpeg":
			return (
				bytes.length >= 3 &&
				bytes[0] === 0xff &&
				bytes[1] === 0xd8 &&
				bytes[2] === 0xff
			);
		case "image/png":
			return (
				bytes.length >= 8 &&
				bytes[0] === 0x89 &&
				bytes[1] === 0x50 &&
				bytes[2] === 0x4e &&
				bytes[3] === 0x47 &&
				bytes[4] === 0x0d &&
				bytes[5] === 0x0a &&
				bytes[6] === 0x1a &&
				bytes[7] === 0x0a
			);
		case "image/webp": {
			if (bytes.length < 12) return false;
			const ascii = (start: number, end: number) =>
				String.fromCharCode(...bytes.slice(start, end));
			return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
		}
	}
}

export async function validateProfilePicture(input: unknown): Promise<{
	file: Blob;
	ext: string;
}> {
	if (!(input instanceof Blob)) {
		throw new APIError("BAD_REQUEST", {
			message: 'Upload a file in the multipart field named "file"',
		});
	}
	const metadata = validateProfilePictureMetadata(input);
	if (!metadata.ok) {
		throw new APIError("BAD_REQUEST", { message: metadata.message });
	}
	const head = new Uint8Array(await input.slice(0, 12).arrayBuffer());
	if (!isAllowedMagicByteSequence(metadata.mime, head)) {
		throw new APIError("BAD_REQUEST", {
			message: "File content isn't valid",
		});
	}
	return {
		file: input,
		ext: PROFILE_PICTURE_TYPES[metadata.mime].ext,
	};
}

/**
 * Object names are scoped to a sha256 of the user id plus a random UUID for security
* */
export function profilePictureUserPrefix(userId: string): string {
	const namespace = createHash("sha256").update(userId).digest("hex");
	return `${PROFILE_PICTURES_PREFIX}${namespace}/`;
}

export function profilePictureObjectPath(userId: string, ext: string): string {
	return `${profilePictureUserPrefix(userId)}${randomUUID()}.${ext}`;
}

/**
 * Uploads a validated picture, then persists the URL as the Base Identity
 * `profilePicture` and mirrors it to Better Auth's `user.image` atomically.
 * Storage failures never touch the database; a persistence failure removes the
 * freshly uploaded blob; a replaced managed blob is removed best-effort.
 */
export async function uploadProfilePicture(
	userId: string,
	input: unknown,
	storage: ProfilePictureStorage,
): Promise<string> {
	const { file, ext } = await validateProfilePicture(input);
	const previousUrl = (await getBaseIdentity(userId)).profilePicture;
	const pathname = profilePictureObjectPath(userId, ext);

	let url: string;
	try {
		url = await storage.put(file, pathname);
	} catch {
		throw new APIError("BAD_GATEWAY", {
			message: "Storage is unavailable. Your profile was not changed.",
		});
	}

	try {
		await updateBaseIdentity(userId, { profilePicture: url });
	} catch (error) {
		await storage.delete(pathname).catch(() => {});
		throw error;
	}

	if (
		previousUrl !== url &&
		storage.isManagedUrl(previousUrl, profilePictureUserPrefix(userId))
	) {
		await storage.delete(previousUrl).catch(() => {});
	}

	return url;
}
