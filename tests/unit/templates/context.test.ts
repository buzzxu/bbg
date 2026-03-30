import { describe, expect, it, vi } from "vitest";
import type { BbgConfig } from "../../../src/config/schema.js";
import { buildTemplateContext } from "../../../src/templates/context.js";

function createConfig(): BbgConfig {
  return {
    version: "0.1.0",
    projectName: "demo",
    projectDescription: "demo project",
    createdAt: "2026-03-29T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
    repos: [
      {
        name: "poster-project",
        gitUrl: "git@example.com:poster-project.git",
        branch: "main",
        type: "backend",
        stack: {
          language: "java",
          framework: "spring-boot",
          buildTool: "maven",
          testFramework: "junit",
          packageManager: "maven",
        },
        description: "backend",
      },
      {
        name: "poster-admin-web",
        gitUrl: "git@example.com:poster-admin-web.git",
        branch: "main",
        type: "frontend-pc",
        stack: {
          language: "typescript",
          framework: "react",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
        },
        description: "admin",
      },
      {
        name: "poster-h5",
        gitUrl: "git@example.com:poster-h5.git",
        branch: "main",
        type: "frontend-h5",
        stack: {
          language: "typescript",
          framework: "vue3",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "pnpm",
        },
        description: "h5",
      },
    ],
    governance: {
      riskThresholds: {
        high: { grade: "A+", minScore: 99 },
        medium: { grade: "A", minScore: 95 },
        low: { grade: "B", minScore: 85 },
      },
      enableRedTeam: true,
      enableCrossAudit: false,
    },
    context: {},
  };
}

describe("buildTemplateContext", () => {
  it("builds all required computed fields from BbgConfig", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T10:11:12.000Z"));

    const context = buildTemplateContext(createConfig());

    expect(context.projectName).toBe("demo");
    expect(context.projectDescription).toBe("demo project");
    expect(context.repos).toHaveLength(3);

    expect(context.hasBackend).toBe(true);
    expect(context.hasFrontendPc).toBe(true);
    expect(context.hasFrontendH5).toBe(true);
    expect(context.hasFrontendWeb).toBe(false);

    expect(context.backendRepos.map((repo) => repo.name)).toEqual(["poster-project"]);
    expect(context.frontendRepos.map((repo) => repo.name)).toEqual([
      "poster-admin-web",
      "poster-h5",
    ]);
    expect(context.allRepoNames).toEqual(["poster-project", "poster-admin-web", "poster-h5"]);

    expect(context.riskThresholds.high.minScore).toBe(99);
    expect(context.enableRedTeam).toBe(true);
    expect(context.enableCrossAudit).toBe(false);

    expect(context.languages).toEqual(["java", "typescript"]);
    expect(context.frameworks).toEqual(["spring-boot", "react", "vue3"]);
    expect(context.hasJava).toBe(true);
    expect(context.hasTypeScript).toBe(true);
    expect(context.hasPython).toBe(false);
    expect(context.hasGo).toBe(false);

    expect(context.bbgVersion).toBe("0.1.0");
    expect(context.generatedAt).toBe("2026-03-29T10:11:12.000Z");

    vi.useRealTimers();
  });
});
