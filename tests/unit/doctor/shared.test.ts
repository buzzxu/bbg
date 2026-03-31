import { describe, expect, it } from "vitest";
import { expectedRepoIgnoreEntries } from "../../../src/doctor/shared.js";
import type { BbgConfig } from "../../../src/config/schema.js";

describe("doctor/shared", () => {
  describe("expectedRepoIgnoreEntries", () => {
    it("returns empty array for null config", () => {
      expect(expectedRepoIgnoreEntries(null)).toEqual([]);
    });

    it("returns repo names with trailing slash", () => {
      const config = {
        repos: [
          { name: "frontend", gitUrl: "", branch: "", type: "frontend-web", description: "", stack: { language: "typescript", framework: "", buildTool: "", testFramework: "", packageManager: "" } },
          { name: "backend", gitUrl: "", branch: "", type: "backend", description: "", stack: { language: "java", framework: "", buildTool: "", testFramework: "", packageManager: "" } },
        ],
      } as BbgConfig;
      expect(expectedRepoIgnoreEntries(config)).toEqual(["frontend/", "backend/"]);
    });

    it("deduplicates repo names", () => {
      const config = {
        repos: [
          { name: "api", gitUrl: "", branch: "", type: "backend", description: "", stack: { language: "", framework: "", buildTool: "", testFramework: "", packageManager: "" } },
          { name: "api", gitUrl: "", branch: "", type: "backend", description: "", stack: { language: "", framework: "", buildTool: "", testFramework: "", packageManager: "" } },
        ],
      } as BbgConfig;
      expect(expectedRepoIgnoreEntries(config)).toEqual(["api/"]);
    });

    it("skips repos with empty names", () => {
      const config = {
        repos: [
          { name: "", gitUrl: "", branch: "", type: "other", description: "", stack: { language: "", framework: "", buildTool: "", testFramework: "", packageManager: "" } },
          { name: "valid", gitUrl: "", branch: "", type: "other", description: "", stack: { language: "", framework: "", buildTool: "", testFramework: "", packageManager: "" } },
        ],
      } as BbgConfig;
      expect(expectedRepoIgnoreEntries(config)).toEqual(["valid/"]);
    });
  });
});
