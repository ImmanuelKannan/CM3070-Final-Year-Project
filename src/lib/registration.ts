import { APIError } from "better-auth/api";
import { z } from "zod";

export const REGISTRATION_NAME_MAX_LENGTH = 100;

export function registrationNameSchema(label: "First name" | "Last name") {
	return z
		.string({ error: `${label} is required` })
		.trim()
		.min(1, `${label} is required`)
		.max(
			REGISTRATION_NAME_MAX_LENGTH,
			`${label} must be ${REGISTRATION_NAME_MAX_LENGTH} characters or fewer`,
		);
}

export function normalizeRegistrationName(
	value: unknown,
	label: "First name" | "Last name",
): string {
	const result = registrationNameSchema(label).safeParse(value);
	if (!result.success) {
		throw new APIError("BAD_REQUEST", {
			message: result.error.issues[0].message,
		});
	}
	return result.data;
}
