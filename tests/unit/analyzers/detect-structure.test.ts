import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { detectStructure } from "../../../src/analyzers/detect-structure.js";

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../fixtures");

describe("detectStructure", () => {
  it("detects known structure markers by shallow presence", async () => {
    const result = await detectStructure(resolve(fixturesRoot, "react-ts-npm"));

    expect(result).toEqual([
      "has-api-or-controllers",
      "has-ci",
      "has-docker",
      "has-pages-or-views",
      "has-public-or-static",
      "has-src-components",
      "has-store-or-state",
    ]);
  });

  it("detects java standard layout marker", async () => {
    const result = await detectStructure(resolve(fixturesRoot, "java-maven"));

    expect(result).toContain("has-src-main-java");
  });
});
