import { createServerFn } from "@tanstack/react-start";
import { APIError } from "better-auth/api";
import { z } from "zod";

export const approveConsentGrantInputSchema = z.strictObject({
	oauthQuery: z
		.string({ error: "Authorization request is required" })
		.trim()
		.min(1, "Authorization request is required"),
	selectedProfileId: z.string().nullable(),
	edits: z.record(z.string(), z.string()),
});

export type ApproveConsentGrantInput = z.infer<typeof approveConsentGrantInputSchema>;

export type ApproveConsentGrantResult = {
	redirect: boolean;
	url: string;
};

export function normalizeApproveConsentGrantInput(input: unknown) {
	const parsed = approveConsentGrantInputSchema.safeParse(input);
	if (!parsed.success) {
		throw new APIError("BAD_REQUEST", {
			message:
				parsed.error.issues[0]?.message ?? "Invalid consent approval input",
		});
	}
	return parsed.data;
}

export const approveConsentGrant = createServerFn({ method: "POST" })
	.validator(normalizeApproveConsentGrantInput)
	.handler(async ({ data }): Promise<ApproveConsentGrantResult> => {
		const { approveConsentGrantFromRequest } = await import(
			"#/lib/consent-grants.server"
		);
		return approveConsentGrantFromRequest(data);
	});
