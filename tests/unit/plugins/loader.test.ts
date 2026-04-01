import { describe, expect, it } from "vitest";
import { validatePluginManifest } from "../../../src/plugins/loader.js";

describe("plugins/loader", () => {
  describe("validatePluginManifest", () => {
    it("validates a valid plugin manifest", () => {
      const manifest = validatePluginManifest({
        name: "my-plugin",
        version: "1.0.0",
        description: "A test plugin",
        agents: ["custom-agent"],
        skills: ["custom-skill"],
      });

      expect(manifest.name).toBe("my-plugin");
      expect(manifest.agents).toEqual(["custom-agent"]);
      expect(manifest.skills).toEqual(["custom-skill"]);
    });

    it("accepts manifest with only required fields", () => {
      const manifest = validatePluginManifest({
        name: "minimal",
        version: "0.1.0",
        description: "Minimal plugin",
      });

      expect(manifest.name).toBe("minimal");
      expect(manifest.agents).toBeUndefined();
    });

    it("throws on missing name", () => {
      expect(() =>
        validatePluginManifest({ version: "1.0.0", description: "no name" }),
      ).toThrow(/name/);
    });

    it("throws on missing version", () => {
      expect(() =>
        validatePluginManifest({ name: "test", description: "no version" }),
      ).toThrow(/version/);
    });

    it("throws on non-object input", () => {
      expect(() => validatePluginManifest("not-an-object")).toThrow();
      expect(() => validatePluginManifest(null)).toThrow();
    });
  });
});
