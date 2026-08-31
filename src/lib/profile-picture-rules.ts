import { z } from "zod";

export const PROFILE_PICTURE_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_PICTURE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

export const PROFILE_PICTURE_TYPES = {
	"image/jpeg": { ext: "jpg" },
	"image/png": { ext: "png" },
	"image/webp": { ext: "webp" },
} as const;

export type ProfilePictureMime = (typeof PROFILE_PICTURE_MIME_TYPES)[number];

const profilePictureSizeSchema = z
	.number()
	.max(PROFILE_PICTURE_MAX_BYTES, "Image must be 2 MiB or smaller");
const profilePictureTypeSchema = z.enum(PROFILE_PICTURE_MIME_TYPES, {
	error: "Only JPEG, PNG, or WebP images are supported",
});

export function validateProfilePictureMetadata(file: {
	size: number;
	type: string;
}):
	| { ok: true; mime: ProfilePictureMime }
	| {
			ok: false;
			reason: "type" | "size";
			message: string;
	  } {
	const size = profilePictureSizeSchema.safeParse(file.size);
	if (!size.success) {
		return { ok: false, reason: "size", message: size.error.issues[0].message };
	}
	const type = profilePictureTypeSchema.safeParse(file.type);
	if (!type.success) {
		return { ok: false, reason: "type", message: type.error.issues[0].message };
	}
	return { ok: true, mime: type.data };
}
