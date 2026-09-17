import { APIError } from "better-auth/api";
import { z } from "zod";

export const REGISTRATION_NAME_MAX_LENGTH = 100;

export const ACCOUNT_KINDS = ["identity_holder", "developer"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export function accountKindSchema() {
	return z.enum(ACCOUNT_KINDS, {
		error: "Choose how you want to use HeyMe",
	});
}

export function normalizeAccountKind(value: unknown): AccountKind {
	const result = accountKindSchema().safeParse(value);
	if (!result.success) {
		throw new APIError("BAD_REQUEST", {
			message: result.error.issues[0]?.message ?? "Invalid account kind",
		});
	}
	return result.data;
}

export function normalizeRegistrationCompanyName(value: unknown): string {
	const result = z
		.string({ error: "Company name is required" })
		.trim()
		.min(1, "Company name is required")
		.max(
			REGISTRATION_NAME_MAX_LENGTH,
			`Company name must be ${REGISTRATION_NAME_MAX_LENGTH} characters or fewer`,
		)
		.safeParse(value);
	if (!result.success) {
		throw new APIError("BAD_REQUEST", {
			message: result.error.issues[0]?.message ?? "Invalid company name",
		});
	}
	return result.data;
}

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
