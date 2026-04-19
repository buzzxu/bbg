import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeRepo } from "../../../src/analyzers/index.js";
import { detectStack } from "../../../src/analyzers/detect-stack.js";
import { writeTextFile } from "../../../src/utils/fs.js";

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../fixtures");
const tempDirs: string[] = [];

function fixturePath(name: string): string {
  return resolve(fixturesRoot, name);
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("detectStack", () => {
  it("detects typescript + react + npm", async () => {
    const result = await detectStack(fixturePath("react-ts-npm"));

    expect(result).toEqual({
      language: "typescript",
      framework: "react",
      buildTool: "npm",
      testFramework: "vitest",
      packageManager: "npm",
      languageVersion: undefined,
      frameworkVersion: "18.3.1",
    });
  });

  it("detects javascript + next + yarn", async () => {
    const result = await detectStack(fixturePath("js-next-yarn"));

    expect(result.language).toBe("javascript");
    expect(result.framework).toBe("next");
    expect(result.buildTool).toBe("yarn");
    expect(result.packageManager).toBe("yarn");
    expect(result.frameworkVersion).toBe("15.2.0");
  });

  it("detects maven spring java stack", async () => {
    const result = await detectStack(fixturePath("java-maven"));

    expect(result.language).toBe("java");
    expect(result.framework).toBe("spring-boot");
    expect(result.buildTool).toBe("maven");
    expect(result.packageManager).toBe("maven");
  });

  it("detects rust cargo stacks with edition and framework version", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bbg-detect-rust-"));
    tempDirs.push(dir);
    await writeTextFile(
      join(dir, "Cargo.toml"),
      [
        "[package]",
        'name = "fixture-rust"',
        'version = "0.1.0"',
        'edition = "2024"',
        "",
        "[dependencies]",
        'axum = "0.8.1"',
      ].join("\n"),
    );

    const result = await detectStack(dir);

    expect(result).toEqual({
      language: "rust",
      framework: "axum",
      buildTool: "cargo",
      testFramework: "cargo-test",
      packageManager: "cargo",
      languageVersion: "2024",
      frameworkVersion: "0.8.1",
    });
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
