import { describe, expect, it } from "vitest";
import { fuseWorkspaceAnalysis } from "../../../src/analyze/workspace-fusion.js";
import type { RepoBusinessAnalysis, RepoTechnicalAnalysis } from "../../../src/analyze/types.js";

const technical: RepoTechnicalAnalysis[] = [
  {
    repo: {
      name: "web",
      gitUrl: "https://example.com/web.git",
      branch: "main",
      type: "frontend-web",
      description: "customer web",
      stack: {
        language: "typescript",
        framework: "react",
        buildTool: "vite",
        testFramework: "vitest",
        packageManager: "pnpm",
      },
    },
    stack: {
      language: "typescript",
      framework: "react",
      buildTool: "vite",
      testFramework: "vitest",
      packageManager: "pnpm",
    },
    structure: ["src", "pages"],
    deps: ["api"],
    testing: {
      framework: "vitest",
      hasTestDir: true,
      testPattern: "*.test.ts",
    },
  },
  {
    repo: {
      name: "api",
      gitUrl: "https://example.com/api.git",
      branch: "main",
      type: "backend",
      description: "order api",
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
    deps: ["postgres"],
    testing: {
      framework: "vitest",
      hasTestDir: true,
      testPattern: "*.test.ts",
    },
  },
];

const business: RepoBusinessAnalysis[] = [
  {
    repoName: "web",
    description: "customer web",
    responsibilities: ["serve customer checkout"],
    flowHints: ["dependencies: api"],
  },
  {
    repoName: "api",
    description: "order api",
    responsibilities: ["persist orders"],
    flowHints: ["dependencies: postgres"],
  },
];

describe("fuseWorkspaceAnalysis", () => {
  it("creates repo summaries, integration edges, and business modules", () => {
    const result = fuseWorkspaceAnalysis({
      scope: "workspace",
      technical,
      business,
    });

    expect(result.scope).toBe("workspace");
    expect(result.repos).toHaveLength(2);
    expect(result.integrationEdges).toEqual([
      { from: "web", to: "api" },
      { from: "api", to: "postgres" },
    ]);
    expect(result.businessModules).toEqual([
      expect.objectContaining({
        name: "web",
        responsibilities: ["serve customer checkout"],
      }),
      expect.objectContaining({
        name: "api",
        responsibilities: ["persist orders"],
      }),
    ]);
  });
});
