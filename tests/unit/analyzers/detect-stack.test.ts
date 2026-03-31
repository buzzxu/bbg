import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeRepo } from "../../../src/analyzers/index.js";
import { detectStack } from "../../../src/analyzers/detect-stack.js";

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../fixtures");

function fixturePath(name: string): string {
  return resolve(fixturesRoot, name);
}

describe("detectStack", () => {
  it("detects typescript + react + npm", async () => {
    const result = await detectStack(fixturePath("react-ts-npm"));

    expect(result).toEqual({
      language: "typescript",
      framework: "react",
      buildTool: "npm",
      testFramework: "vitest",
      packageManager: "npm",
    });
  });

  it("detects javascript + next + yarn", async () => {
    const result = await detectStack(fixturePath("js-next-yarn"));

    expect(result.language).toBe("javascript");
    expect(result.framework).toBe("next");
    expect(result.buildTool).toBe("yarn");
    expect(result.packageManager).toBe("yarn");
  });

  it("detects maven spring java stack", async () => {
    const result = await detectStack(fixturePath("java-maven"));

    expect(result.language).toBe("java");
    expect(result.framework).toBe("spring-boot");
    expect(result.buildTool).toBe("maven");
    expect(result.packageManager).toBe("maven");
  });
});

describe("analyzeRepo", () => {
  it("aggregates all analyzer outputs", async () => {
    const result = await analyzeRepo(fixturePath("react-ts-npm"));

    expect(result.stack.framework).toBe("react");
    expect(result.structure).toContain("has-src-components");
    expect(result.deps).toContain("react");
    expect(result.testing.framework).toBe("vitest+testing-library");
  });
});
