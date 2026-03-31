import { describe, expect, it } from "vitest";
import {
  CLI_NAME,
  CLI_VERSION,
  DEFAULT_STACK,
  MANAGED_GITIGNORE_BLOCK_END,
  MANAGED_GITIGNORE_BLOCK_START,
  MIN_NODE_MAJOR,
  REPO_TYPE_CHOICES,
} from "../../src/constants.js";

describe("constants", () => {
  it("CLI_NAME is bbg", () => {
    expect(CLI_NAME).toBe("bbg");
  });

  it("MIN_NODE_MAJOR is 18", () => {
    expect(MIN_NODE_MAJOR).toBe(18);
  });

  it("CLI_VERSION matches package.json", async () => {
    const pkg = await import("../../package.json", { with: { type: "json" } });
    expect(CLI_VERSION).toBe(pkg.default.version);
  });

  it("REPO_TYPE_CHOICES has 5 entries", () => {
    expect(REPO_TYPE_CHOICES).toHaveLength(5);
    expect(REPO_TYPE_CHOICES.map((c) => c.value)).toEqual([
      "backend",
      "frontend-pc",
      "frontend-h5",
      "frontend-web",
      "other",
    ]);
  });

  it("DEFAULT_STACK has all unknown fields", () => {
    expect(DEFAULT_STACK.language).toBe("unknown");
    expect(DEFAULT_STACK.framework).toBe("unknown");
    expect(DEFAULT_STACK.buildTool).toBe("unknown");
    expect(DEFAULT_STACK.testFramework).toBe("unknown");
    expect(DEFAULT_STACK.packageManager).toBe("unknown");
  });

  it("gitignore sentinels are defined", () => {
    expect(MANAGED_GITIGNORE_BLOCK_START).toContain(">>>");
    expect(MANAGED_GITIGNORE_BLOCK_END).toContain("<<<");
  });
});
