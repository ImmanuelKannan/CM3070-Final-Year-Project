import { createFileRoute } from "@tanstack/react-router";
import { APIError } from "better-auth/api";

import { auth } from "#/lib/auth";
import { uploadProfilePicture } from "#/lib/profile-picture";
import { profilePictureStorage } from "#/lib/profile-picture-storage";

export const Route = createFileRoute("/api/profile-picture")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({
					headers: request.headers,
				});
				if (!session) {
					return Response.json(
						{ error: "Sign in to upload a profile picture" },
						{ status: 401 },
					);
				}
				if (session.user.accountKind !== "identity_holder") {
					return Response.json(
						{ error: "Developer accounts cannot upload profile pictures" },
						{ status: 403 },
					);
				}

				let form: FormData;
				try {
					form = await request.formData();
				} catch {
					return Response.json(
						{ error: 'Expected a multipart upload with a "file" field' },
						{ status: 400 },
					);
				}

				try {
					const url = await uploadProfilePicture(
						session.user.id,
						form.get("file"),
						profilePictureStorage,
					);
					return Response.json({ url });
				} catch (error) {
					if (error instanceof APIError) {
						return Response.json(
							{ error: error.message },
							{ status: error.statusCode },
						);
					}
					return Response.json(
						{ error: "Upload failed. Your profile was not changed." },
						{ status: 500 },
					);
				}
			},
		},
	},
});
