import { describe, expect, test } from "bun:test";

import {
	applyEdits,
	parseRequestedAttributeKeys,
	resolvePreview,
} from "./consent-preview";

describe("parseRequestedAttributeKeys", () => {
	test("maps standard scopes and passes through custom attribute keys", () => {
		expect(parseRequestedAttributeKeys(["email", "address"])).toEqual([
			"email",
			"address",
		]);
	});

	test("expands the profile scope into identity name/picture attributes", () => {
		const keys = parseRequestedAttributeKeys(["profile"]);
		expect(keys).toContain("firstName");
		expect(keys).toContain("lastName");
		expect(keys).toContain("displayName");
		expect(keys).toContain("profilePicture");
	});

	test("openid and offline_access map to no attributes", () => {
		expect(parseRequestedAttributeKeys(["openid", "offline_access"])).toEqual(
			[],
		);
	});

	test("deduplicates while preserving request order", () => {
		expect(
			parseRequestedAttributeKeys(["address", "profile", "address"]),
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
		expect(() => parseRequestedAttributeKeys(["name", "address"])).toThrow(
			"Unknown scope: name",
		);
	});
});

describe("resolvePreview", () => {
	const base = {
		firstName: "Ada",
		lastName: "Lovelace",
		email: "ada@example.com",
		bio: "Mathematician",
	};

	test("returns only requested keys, sourced from Base Identity", () => {
		const result = resolvePreview(base, null, ["firstName", "email"]);
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
		const result = resolvePreview(
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
		const result = resolvePreview(
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
		const result = resolvePreview(
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

describe("applyEdits", () => {
	test("applies non-empty edits as overrides and ignores empty ones", () => {
		const attrs = resolvePreview({ email: "a@b.c" }, null, ["email"]);
		const edited = applyEdits(attrs, { email: "x@y.z" });
		expect(edited[0]).toMatchObject({ source: "override", value: "x@y.z" });

		const reverted = applyEdits(attrs, { email: "" });
		expect(reverted[0]).toMatchObject({ source: "default", value: "a@b.c" });
	});
});

describe("validateApprovedConsentGrant", () => {
	test("doesn't allow unapproved field edits and unrequested approvals", () => {
		const requestedKeys = getRequestedIdentityAttributeKeys([
			"email",
			"profile",
		]);

		expect(() =>
			validateApprovedConsentGrant(requestedKeys, ["email", "bio"], {}),
		).toThrow("Unrequested approved key: bio");

		expect(() =>
			validateApprovedConsentGrant(requestedKeys, ["email"], {
				firstName: "Overridden",
			}),
		).toThrow("Unapproved edit for attribute: firstName");

		const edits = validateApprovedConsentGrant(requestedKeys, ["email"], {
			email: "edited@example.com",
		});
		const resolved = resolveConsentPreviewAttributes(
			{ firstName: "Ada", email: "ada@example.com" },
			null,
			["email"],
			edits,
		);
		expect(resolved).toHaveLength(1);
		expect(resolved[0]).toMatchObject({
			key: "email",
			source: "override",
			value: "edited@example.com",
		});
	});
});
