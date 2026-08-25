import { describe, expect, test } from "bun:test";

import {
	normalizeRegistrationName,
	REGISTRATION_NAME_MAX_LENGTH,
} from "./registration";

describe("normalizeRegistrationName", () => {
	test("trims valid names", () => {
		expect(normalizeRegistrationName("  Ada  ", "First name")).toBe("Ada");
	});

	test("rejects blank and overlong names", () => {
		expect(() => normalizeRegistrationName("   ", "First name")).toThrow(
			"First name is required",
		);
		expect(() =>
			normalizeRegistrationName(
				"a".repeat(REGISTRATION_NAME_MAX_LENGTH + 1),
				"Last name",
			),
		).toThrow(
			`Last name must be ${REGISTRATION_NAME_MAX_LENGTH} characters or fewer`,
		);
	});
});
