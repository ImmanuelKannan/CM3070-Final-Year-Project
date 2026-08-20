import { expect, test } from "bun:test";
import { cn } from "./utils.ts";

test("cn joins classes and resolves Tailwind conflicts", () => {
	expect(cn("font-bold", false, "px-2", "px-4")).toBe("font-bold px-4");
});
