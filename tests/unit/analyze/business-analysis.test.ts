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
    businessSignals: {
      routeEntrypoints: ["route:/orders"],
      apiEntrypoints: ["/api/orders"],
      domainTerms: ["order"],
      entityTerms: ["order"],
      capabilityTerms: ["Order service", "Checkout service"],
      workflowHints: ["Backend handles order APIs, validation, and persistence."],
      externalIntegrations: ["payment"],
      riskMarkers: ["order", "payment"],
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
        responsibilities: expect.arrayContaining(["order API", "Order service", "Checkout service", "fastify service layer", "integrates with payment"]),
        flowHints: expect.arrayContaining([
          "Backend handles order APIs, validation, and persistence.",
          "entrypoint: route:/orders",
          "api: /api/orders",
        ]),
        capabilities: expect.arrayContaining(["Order service", "Checkout service"]),
        apiSignals: ["/api/orders"],
        domainTerms: ["order"],
      }),
    ]);
  });
});
