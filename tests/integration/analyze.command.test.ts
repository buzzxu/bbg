import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const analyzerState = vi.hoisted(() => ({
  analyzeRepo: vi.fn(),
}));

vi.mock("../../src/analyzers/index.js", () => ({
  analyzeRepo: analyzerState.analyzeRepo,
}));

import { serializeConfig } from "../../src/config/read-write.js";
import { runAnalyzeCommand } from "../../src/commands/analyze.js";
import { buildDefaultRuntimeConfig } from "../../src/runtime/schema.js";
import { writeTextFile } from "../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-analyze-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  await mkdir(join(cwd, "repo-a"), { recursive: true });
  await writeTextFile(
    join(cwd, ".bbg", "config.json"),
    serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "analyze test",
      createdAt: "2026-04-09T00:00:00.000Z",
      updatedAt: "2026-04-09T00:00:00.000Z",
      repos: [
        {
          name: "repo-a",
          gitUrl: "https://example.com/repo-a.git",
          branch: "main",
          type: "backend",
          description: "repo a",
        stack: {
          language: "typescript",
          framework: "node",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
          languageVersion: "5.8.2",
        },
        },
      ],
      governance: {
        riskThresholds: {
          high: { grade: "A+", minScore: 99 },
          medium: { grade: "A", minScore: 95 },
          low: { grade: "B", minScore: 85 },
        },
        enableRedTeam: true,
        enableCrossAudit: true,
      },
      context: {},
      runtime: buildDefaultRuntimeConfig(),
    }),
  );
}

beforeEach(() => {
  analyzerState.analyzeRepo.mockReset();
    analyzerState.analyzeRepo.mockResolvedValue({
      stack: {
        language: "typescript",
        framework: "node",
        buildTool: "npm",
        testFramework: "vitest",
        packageManager: "npm",
        languageVersion: "5.8.2",
      },
    structure: ["has-src"],
    deps: ["zod"],
    testing: {
      framework: "vitest",
      hasTestDir: true,
      testPattern: "*.test.ts",
    },
  });
});

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("analyze command", () => {
  it("writes architecture docs for selected repos", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runAnalyzeCommand({ cwd, repos: ["repo-a"] });

    expect(result.analyzedRepos).toEqual(["repo-a"]);
    expect(result.runId).toBeTruthy();
    expect(result.scope).toBe("repo");
    expect(result.repoDocs).toContain("docs/architecture/repos/repo-a.md");
    expect(result.repositoryDocs).toContain("docs/repositories/repo-a.md");
    expect(result.docsUpdated).toContain("docs/business/module-map.md");
    expect(result.docsUpdated).toContain("docs/architecture/integration-map.md");
    expect(result.docsUpdated).toContain("docs/architecture/languages/README.md");
    expect(result.docsUpdated).toContain("docs/architecture/languages/typescript/application-patterns.md");
    expect(result.docsUpdated).toContain("docs/wiki/reports/workspace-analysis-summary.md");
    expect(result.docsUpdated).toContain("docs/wiki/concepts/repo-repo-a-overview.md");
    const latest = JSON.parse(await import("node:fs/promises").then(({ readFile }) => readFile(join(cwd, ".bbg", "analyze", "latest.json"), "utf8"))) as {
      runId: string;
      repos: string[];
    };
    expect(latest.runId).toBe(result.runId);
    expect(latest.repos).toEqual(["repo-a"]);
    const knowledge = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "knowledge", "repos", "repo-a", "technical.json"), "utf8"),
      ),
    ) as { repo: string };
    expect(knowledge.repo).toBe("repo-a");
    const repoSummary = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "repositories", "repo-a.md"), "utf8"),
    );
    expect(repoSummary).toContain("# repo-a");
    const wikiIndex = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "wiki", "index.md"), "utf8"),
    );
    expect(wikiIndex).toContain("Workspace Analysis Summary");
    expect(wikiIndex).toContain("repo-a Overview");
    const languageGuide = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "architecture", "languages", "typescript", "application-patterns.md"), "utf8"),
    );
    expect(languageGuide).toContain("minimum_supported_version: 5.8.2");
    expect(languageGuide).toContain("https://www.typescriptlang.org/docs/handbook/project-references");
    const businessModules = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "knowledge", "workspace", "business-modules.json"), "utf8"),
      ),
    ) as { repos: Array<{ name: string }> };
    expect(businessModules.repos).toEqual([expect.objectContaining({ name: "repo-a" })]);
  });
});
