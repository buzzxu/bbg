import { describe, expect, it } from "vitest";
import { deriveRepoBusinessAnalysis } from "../../../src/analyze/business-analysis.js";
import type { RepoTechnicalAnalysis } from "../../../src/analyze/types.js";

function makeTechnicalAnalysis(): RepoTechnicalAnalysis {
  return {
    repo: {
      name: "api",
      gitUrl: "https://example.com/api.git",
      branch: "main",
      type: "backend",
      description: "order API",
      stack: {
        language: "typescript",
        framework: "node",
        buildTool: "npm",
        testFramework: "vitest",
        packageManager: "npm",
      },
    },
    stack: {
      language: "typescript",
      framework: "fastify",
      buildTool: "npm",
      testFramework: "vitest",
      packageManager: "npm",
    },
    structure: ["src", "modules"],
    deps: ["zod", "pg"],
    testing: {
      framework: "vitest",
      hasTestDir: true,
      testPattern: "*.test.ts",
    },
  };
}

describe("deriveRepoBusinessAnalysis", () => {
  it("derives responsibilities and flow hints from technical analysis", () => {
    const result = deriveRepoBusinessAnalysis([makeTechnicalAnalysis()]);

    expect(result).toEqual([
      expect.objectContaining({
        repoName: "api",
        description: "order API",
        responsibilities: expect.arrayContaining(["order API", "fastify application surface", "tested with vitest"]),
        flowHints: expect.arrayContaining([
          "structure: src, modules",
          "dependencies: zod, pg",
          "build: npm",
        ]),
      }),
    ]);
  });
});
