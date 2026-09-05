import { ATTRIBUTE_LABELS } from "./profile-catalogue.ts";

const STANDARD_SCOPE_LABELS: Record<string, string> = {
	openid: "Sign you in",
	profile: "Basic profile",
	email: "Email address",
	offline_access: "Stay signed in",
};

export function getLabelText(scope: string): string {
	return STANDARD_SCOPE_LABELS[scope] ?? ATTRIBUTE_LABELS[scope] ?? scope;
}
