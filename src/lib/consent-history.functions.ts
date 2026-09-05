import { createServerFn } from "@tanstack/react-start";
import { APIError } from "better-auth/api";
import { z } from "zod";

import { getUserIdFromRequest } from "#/lib/auth.server";
import {
	type ConsentHistory,
	getConsentHistory as getConsentHistoryData,
} from "#/lib/consent-history";

const consentHistoryInputSchema = z.strictObject({
	search: z.string().trim().max(200).optional(),
	page: z.number().int().min(1).max(10_000).optional(),
});

function normalizeConsentHistoryInput(input: unknown) {
	const parsed = consentHistoryInputSchema.safeParse(input);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message:
				parsed.error.issues[0]?.message ?? "Invalid consent history input",
		});
	}
	return parsed.data;
}

export const getConsentHistory = createServerFn({ method: "GET" })
	.validator(normalizeConsentHistoryInput)
	.handler(async ({ data }): Promise<ConsentHistory> => {
		const userId = await getUserIdFromRequest(
			"Sign in to review consent history",
		);
		return getConsentHistoryData(userId, data);
	});
