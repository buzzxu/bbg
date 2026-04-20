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
    businessSignals: {
      routeEntrypoints: ["view:checkout/index"],
      apiEntrypoints: ["/api/orders"],
      domainTerms: ["checkout", "order"],
      entityTerms: ["order"],
      capabilityTerms: ["Checkout management"],
      workflowHints: ["Admin configures and reviews checkout workflows."],
      externalIntegrations: [],
      riskMarkers: ["order"],
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
    businessSignals: {
      routeEntrypoints: [],
      apiEntrypoints: ["/api/orders", "/api/checkout"],
      domainTerms: ["checkout", "order"],
      entityTerms: ["order"],
      capabilityTerms: ["Checkout service"],
      workflowHints: ["Backend handles checkout APIs, validation, and persistence."],
      externalIntegrations: ["payment"],
      riskMarkers: ["order", "payment"],
    },
  },
];

const business: RepoBusinessAnalysis[] = [
  {
    repoName: "web",
    description: "customer web",
    responsibilities: ["serve customer checkout"],
    flowHints: ["Admin configures and reviews checkout workflows."],
    capabilities: ["Checkout management"],
    entrypoints: ["view:checkout/index"],
    apiSignals: ["/api/orders"],
    domainTerms: ["checkout", "order"],
    entityTerms: ["order"],
    externalIntegrations: [],
    riskMarkers: ["order"],
  },
  {
    repoName: "api",
    description: "order api",
    responsibilities: ["persist orders"],
    flowHints: ["Backend handles checkout APIs, validation, and persistence."],
    capabilities: ["Checkout service"],
    entrypoints: [],
    apiSignals: ["/api/orders", "/api/checkout"],
    domainTerms: ["checkout", "order"],
    entityTerms: ["order"],
    externalIntegrations: ["payment"],
    riskMarkers: ["order", "payment"],
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
      expect.objectContaining({ from: "web", to: "api", kind: "ui-to-service" }),
    ]);
    expect(result.businessModules).toEqual([
      expect.objectContaining({
        name: "Checkout management",
        responsibilities: ["serve customer checkout"],
      }),
      expect.objectContaining({
        name: "Checkout service",
        responsibilities: ["persist orders"],
      }),
    ]);
  });
});
