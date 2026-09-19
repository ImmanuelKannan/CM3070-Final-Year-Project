import { describe, expect, test } from "bun:test";

import { validateApprovedConsentGrant } from "./consent-grants.functions";
import {
	applyOverriddenAttributes,
	getRequestedIdentityAttributeKeys,
	resolveConsentPreviewAttributes,
} from "./consent-preview";

describe("getRequestedIdentityAttributeKeys", () => {
	test("maps standard scopes and passes through custom attribute keys", () => {
		expect(getRequestedIdentityAttributeKeys(["email", "address"])).toEqual([
			"email",
			"address",
		]);
	});

	test("expands the profile scope into identity name/picture attributes", () => {
		const keys = getRequestedIdentityAttributeKeys(["profile"]);
		expect(keys).toContain("firstName");
		expect(keys).toContain("lastName");
		expect(keys).toContain("displayName");
		expect(keys).toContain("profilePicture");
	});

	test("openid and offline_access map to no attributes", () => {
		expect(
			getRequestedIdentityAttributeKeys(["openid", "offline_access"]),
		).toEqual([]);
	});

	test("deduplicates while preserving request order", () => {
		expect(
			getRequestedIdentityAttributeKeys(["address", "profile", "address"]),
		).toEqual([
			"address",
			"profilePicture",
			"firstName",
			"middleName",
			"lastName",
			"displayName",
			"username",
		]);
	});

	test("rejects unknown scopes", () => {
		expect(() =>
			getRequestedIdentityAttributeKeys(["name", "address"]),
		).toThrow("Unknown scope: name");
	});
});

describe("resolveConsentPreviewAttributes", () => {
	const base = {
		firstName: "Ada",
		lastName: "Lovelace",
		email: "ada@example.com",
		bio: "Mathematician",
	};

	test("returns only requested keys, sourced from Base Identity", () => {
		const result = resolveConsentPreviewAttributes(base, null, [
			"firstName",
			"email",
		]);
		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			key: "firstName",
			value: "Ada",
			source: "default",
			defaultValue: "Ada",
			profileValue: null,
		});
		expect(result[1].value).toBe("ada@example.com");
	});

	test("non-blank profile overrides win over Base Identity", () => {
		const result = resolveConsentPreviewAttributes(
			base,
			{ email: "work@example.com", firstName: "" },
			["firstName", "email"],
		);
		expect(result[0]).toMatchObject({
			key: "firstName",
			source: "default",
			value: "Ada",
		});
		expect(result[1]).toMatchObject({
			key: "email",
			source: "profile",
			value: "work@example.com",
		});
	});

	test("consent-only edits override both base and profile values", () => {
		const result = resolveConsentPreviewAttributes(
			base,
			{ email: "work@example.com" },
			["email", "bio"],
			{ bio: "One-time note" },
		);
		expect(result[0]).toMatchObject({
			key: "email",
			source: "profile",
			value: "work@example.com",
		});
		expect(result[1]).toMatchObject({
			key: "bio",
			source: "override",
			value: "One-time note",
		});
	});

	test("empty edits revert to the resolved source value", () => {
		const result = resolveConsentPreviewAttributes(
			base,
			{ email: "work@example.com" },
			["email"],
			{ email: "  " },
		);
		expect(result[0]).toMatchObject({
			source: "profile",
			value: "work@example.com",
		});
	});
});

describe("applyOverriddenAttributes", () => {
	test("applies non-empty edits as overrides and ignores empty ones", () => {
		const attrs = resolveConsentPreviewAttributes({ email: "a@b.c" }, null, [
			"email",
		]);
		const edited = applyOverriddenAttributes(attrs, { email: "x@y.z" });
		expect(edited[0]).toMatchObject({ source: "override", value: "x@y.z" });

		const reverted = applyOverriddenAttributes(attrs, { email: "" });
		expect(reverted[0]).toMatchObject({ source: "default", value: "a@b.c" });
	});
});

describe("validateApprovedConsentGrant", () => {
	test("partial disclosure: approving a subset returns only that subset", () => {
		const requestedKeys = getRequestedIdentityAttributeKeys([
			"email",
			"firstName",
		]);
		const approvedKeys = ["email"];

		validateApprovedConsentGrant(requestedKeys, approvedKeys, {});

		const resolved = resolveConsentPreviewAttributes(
			{ email: "glados@aperturescience.com" },
			null,
			approvedKeys,
		);

		expect(resolved.map((a) => a.key)).toEqual(["email"]);
	});

	test("rejects injected approvals and edits to unapproved attributes", () => {
		const requestedKeys = getRequestedIdentityAttributeKeys(["email"]);

		expect(() =>
			validateApprovedConsentGrant(requestedKeys, ["address"], {}),
		).toThrow("Unrequested approved key: address");
		expect(() =>
			validateApprovedConsentGrant(requestedKeys, [], {
				email: "edited@example.com",
			}),
		).toThrow("Unapproved edit for attribute: email");
	});
});
