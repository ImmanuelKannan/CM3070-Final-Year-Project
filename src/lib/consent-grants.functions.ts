import { createServerFn } from "@tanstack/react-start";
import { APIError } from "better-auth/api";
import { z } from "zod";

const oauthQuerySchema = z
	.string({ error: "Authorization request is required" })
	.trim()
	.min(1, "Authorization request is required");

export const approveConsentGrantInputSchema = z.strictObject({
	oauthQuery: oauthQuerySchema,
	selectedProfileId: z.string().nullable(),
	edits: z.record(z.string(), z.string()),
});

export type ApproveConsentGrantInput = z.infer<
	typeof approveConsentGrantInputSchema
>;

export const rejectConsentGrantInputSchema = z.strictObject({
	oauthQuery: oauthQuerySchema,
});

export type RejectConsentGrantInput = z.infer<
	typeof rejectConsentGrantInputSchema
>;

export type ConsentDecisionResult = {
	redirect: boolean;
	url: string;
};

function parseConsentInput<T>(schema: z.ZodType<T>, input: unknown): T {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message: parsed.error.issues[0]?.message ?? "Invalid consent input",
		});
	}
	return parsed.data;
}

export function normalizeApproveConsentGrantInput(input: unknown) {
	return parseConsentInput(approveConsentGrantInputSchema, input);
}

export function normalizeRejectConsentGrantInput(input: unknown) {
	return parseConsentInput(rejectConsentGrantInputSchema, input);
}

export const approveConsentGrant = createServerFn({ method: "POST" })
	.validator(normalizeApproveConsentGrantInput)
	.handler(async ({ data }): Promise<ConsentDecisionResult> => {
		const { approveConsentGrantFromRequest } = await import(
			"#/lib/consent-grants.server"
		);
		return approveConsentGrantFromRequest(data);
	});

export const rejectConsentGrant = createServerFn({ method: "POST" })
	.validator(normalizeRejectConsentGrantInput)
	.handler(async ({ data }): Promise<ConsentDecisionResult> => {
		const { rejectConsentGrantFromRequest } = await import(
			"#/lib/consent-grants.server"
		);
		return rejectConsentGrantFromRequest(data);
	});
