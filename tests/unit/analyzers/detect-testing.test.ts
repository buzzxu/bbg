import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { detectTesting } from "../../../src/analyzers/detect-testing.js";

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../fixtures");

describe("detectTesting", () => {
  it("detects vitest and testing-library with js test conventions", async () => {
    const result = await detectTesting(resolve(fixturesRoot, "react-ts-npm"));

    expect(result).toEqual({
      framework: "vitest+testing-library",
      hasTestDir: true,
      testPattern: "*.test.*",
    });
  });

  it("detects junit and java test directory", async () => {
    const result = await detectTesting(resolve(fixturesRoot, "java-maven"));

    expect(result).toEqual({
      framework: "junit",
      hasTestDir: true,
      testPattern: "src/test/**",
    });
  });

  it("detects pytest and python tests directory", async () => {
    const result = await detectTesting(resolve(fixturesRoot, "python-pytest"));

    expect(result).toEqual({
      framework: "pytest",
      hasTestDir: true,
      testPattern: "test_*.py",
    });
  });

  it("detects go testing by test file pattern", async () => {
    const result = await detectTesting(resolve(fixturesRoot, "go-basic"));

    expect(result).toEqual({
      framework: "go-test",
      hasTestDir: true,
      testPattern: "*_test.go",
    });
  });
});
