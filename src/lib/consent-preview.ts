import { APIError } from "better-auth/api";

import {
	ALLOWED_ATTRIBUTE_KEYS,
	APPLICATION_CONTEXTS,
	type ApplicationContext,
	ATTRIBUTE_LABELS,
	ATTRIBUTE_OIDC_CLAIMS,
} from "#/lib/profile-catalogue";

export const STANDARD_SCOPE_ATTRIBUTES: Record<string, readonly string[]> = {
	openid: [],
	email: ["email"],
	profile: Object.keys(ATTRIBUTE_OIDC_CLAIMS).filter(
		(attribute) => attribute !== "email",
	),
	offline_access: [],
};

const STANDARD_SCOPES = new Set(Object.keys(STANDARD_SCOPE_ATTRIBUTES));

export function getAppContext(metadata: any): ApplicationContext | null {
	let parsedMetadata = metadata;

	if (typeof metadata === "string") {
		try {
			parsedMetadata = JSON.parse(metadata);
		} catch {
			return null;
		}
	}

	if (!parsedMetadata || typeof parsedMetadata !== "object") return null;

	const value = (parsedMetadata as Record<string, unknown>).profileType;

	return typeof value === "string" &&
		(APPLICATION_CONTEXTS as readonly string[]).includes(value)
		? (value as ApplicationContext)
		: null;
}

export function getRequestedIdentityAttributeKeys(
	scopes: readonly string[],
): string[] {
	const keys: string[] = [];
	const seen = new Set<string>();

	for (const scope of scopes) {
		if (STANDARD_SCOPES.has(scope)) {
			for (const key of STANDARD_SCOPE_ATTRIBUTES[scope]) {
				if (!seen.has(key)) {
					seen.add(key);
					keys.push(key);
				}
			}
		} else if (ALLOWED_ATTRIBUTE_KEYS.includes(scope)) {
			if (!seen.has(scope)) {
				seen.add(scope);
				keys.push(scope);
			}
		} else {
			throw new APIError("BAD_REQUEST", {
				message: `Unknown scope: ${scope}`,
			});
		}
	}

	return keys;
}

export type RequestedEntry = { key: string; value: string | null };

export function resolveRequestedAttributeEntries(
	scopes: readonly string[],
	releasedAttributes: Record<string, string>,
): RequestedEntry[] {
	return getRequestedIdentityAttributeKeys(scopes).map((key) => {
		const raw = releasedAttributes[key];
		const value = raw !== undefined && raw.trim() !== "" ? raw : null;
		return { key, value };
	});
}

export type PreviewAttributeSource = "default" | "profile" | "override";

export type PreviewAttribute = {
	key: string;
	label: string;
	value: string;
	source: PreviewAttributeSource;
	defaultValue: string;
	profileValue: string | null;
};

export function applyOverriddenAttributes(
	attributes: PreviewAttribute[],
	edits: Record<string, string>,
): PreviewAttribute[] {
	return attributes.map((attribute) => {
		const edit = edits[attribute.key];
		if (edit !== undefined && edit.trim() !== "") {
			return { ...attribute, value: edit, source: "override" };
		}
		return attribute;
	});
}

export function resolveConsentPreviewAttributes(
	base: Record<string, string>,
	profileOverrides: Record<string, string> | null,
	requestedKeys: readonly string[],
	edits: Record<string, string> = {},
): PreviewAttribute[] {
	const resolved: PreviewAttribute[] = requestedKeys.map((key) => {
		const defaultValue = base[key] ?? "";
		const profileValue = profileOverrides?.[key] ?? null;
		const useContext = profileValue !== null && profileValue.trim() !== "";

		return {
			key,
			label: ATTRIBUTE_LABELS[key] ?? key,
			value: useContext ? profileValue : defaultValue,
			source: useContext ? "profile" : "default",
			defaultValue,
			profileValue: useContext ? profileValue : null,
		};
	});

	return applyOverriddenAttributes(resolved, edits);
}
