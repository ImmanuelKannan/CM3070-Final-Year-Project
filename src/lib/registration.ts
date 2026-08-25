import { APIError } from "better-auth/api";

export const REGISTRATION_NAME_MAX_LENGTH = 100;

export function normalizeRegistrationName(
	value: unknown,
	label: "First name" | "Last name",
): string {
	if (typeof value !== "string" || !value.trim()) {
		throw new APIError("BAD_REQUEST", { message: `${label} is required` });
	}

	const normalized = value.trim();
	if (normalized.length > REGISTRATION_NAME_MAX_LENGTH) {
		throw new APIError("BAD_REQUEST", {
			message: `${label} must be ${REGISTRATION_NAME_MAX_LENGTH} characters or fewer`,
		});
	}

	return normalized;
}
