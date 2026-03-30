import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { detectDeps } from "../../../src/analyzers/detect-deps.js";

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../fixtures");

describe("detectDeps", () => {
  it("extracts npm dependency keys", async () => {
    const result = await detectDeps(resolve(fixturesRoot, "react-ts-npm"));

    expect(result).toEqual(["@testing-library/react", "axios", "react", "vitest"]);
  });

  it("extracts maven artifactIds", async () => {
    const result = await detectDeps(resolve(fixturesRoot, "java-maven"));

    expect(result).toEqual([
      "junit-jupiter",
      "spring-boot-starter-test",
      "spring-boot-starter-web",
    ]);
  });

  it("extracts gradle dependencies from implementation lines", async () => {
    const result = await detectDeps(resolve(fixturesRoot, "java-gradle"));

    expect(result).toEqual(["junit-jupiter", "spring-boot-starter-web"]);
  });

  it("extracts python packages from requirements.txt", async () => {
    const result = await detectDeps(resolve(fixturesRoot, "python-pytest"));

    expect(result).toEqual(["fastapi", "pydantic", "pytest"]);
  });
});
