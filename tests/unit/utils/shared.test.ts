import { describe, expect, it } from "vitest";
import { sanitizePromptValue } from "../../../src/utils/prompts.js";

describe("utils/prompts", () => {
  describe("sanitizePromptValue", () => {
    it("returns trimmed value when non-empty", () => {
      expect(sanitizePromptValue("  hello  ", "fallback")).toBe("hello");
    });

    it("returns fallback when value is empty", () => {
      expect(sanitizePromptValue("", "default")).toBe("default");
    });

    it("returns fallback when value is whitespace only", () => {
      expect(sanitizePromptValue("   ", "default")).toBe("default");
    });

    it("returns empty string fallback by default", () => {
      expect(sanitizePromptValue("")).toBe("");
    });
  });
});
