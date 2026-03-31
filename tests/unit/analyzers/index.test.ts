import { describe, expect, it } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRepo } from "../../../src/analyzers/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, "../../fixtures/react-ts-npm");

describe("analyzers/index", () => {
  it("returns stack, structure, deps, and testing analysis", async () => {
    const result = await analyzeRepo(fixturePath);
    expect(result).toHaveProperty("stack");
    expect(result).toHaveProperty("structure");
    expect(result).toHaveProperty("deps");
    expect(result).toHaveProperty("testing");
  });

  it("detects typescript for the react-ts-npm fixture", async () => {
    const result = await analyzeRepo(fixturePath);
    expect(result.stack.language).toBe("typescript");
  });

  it("detects npm as package manager", async () => {
    const result = await analyzeRepo(fixturePath);
    expect(result.stack.packageManager).toBe("npm");
  });

  it("detects react as framework", async () => {
    const result = await analyzeRepo(fixturePath);
    expect(result.stack.framework).toBe("react");
  });

  it("detects vitest+testing-library as test framework", async () => {
    const result = await analyzeRepo(fixturePath);
    expect(result.testing.framework).toBe("vitest+testing-library");
    expect(result.testing.hasTestDir).toBe(true);
  });

  it("detects structural markers from fixture directories", async () => {
    const result = await analyzeRepo(fixturePath);
    expect(result.structure).toContain("has-pages-or-views");
    expect(result.structure).toContain("has-api-or-controllers");
    expect(result.structure).toContain("has-store-or-state");
    expect(result.structure).toContain("has-public-or-static");
    expect(result.structure).toContain("has-docker");
    expect(result.structure).toContain("has-ci");
  });

  it("detects all dependencies from package.json", async () => {
    const result = await analyzeRepo(fixturePath);
    expect(result.deps).toContain("react");
    expect(result.deps).toContain("axios");
    expect(result.deps).toContain("vitest");
    expect(result.deps).toContain("@testing-library/react");
  });
});
