import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { BbgConfig } from "../../../src/config/schema.js";
import {
  buildRepoMapDocument,
  readStoredRepoAnalyses,
  type StoredRepoAnalysis,
  type StoredRepoAnalysisRecord,
} from "../../../src/context/repo-map.js";
import { buildTaskBundlesDocument } from "../../../src/context/task-bundles.js";
import { writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-repo-map-test-"));
  tempDirs.push(dir);
  return dir;
}

const baseConfig: BbgConfig = {
  version: "0.1.0",
  projectName: "bbg-project",
  projectDescription: "repo map test",
  createdAt: "2026-04-02T00:00:00.000Z",
  updatedAt: "2026-04-02T00:00:00.000Z",
  repos: [
    {
      name: "repo-a",
      gitUrl: "https://example.com/repo-a.git",
      branch: "main",
      type: "frontend-web",
      description: "UI app",
      stack: {
        language: "typescript",
        framework: "react",
        buildTool: "vite",
        testFramework: "vitest",
        packageManager: "pnpm",
      },
    },
    {
      name: "repo-b",
      gitUrl: "https://example.com/repo-b.git",
      branch: "develop",
      type: "backend",
      description: "API service",
      stack: {
        language: "go",
        framework: "echo",
        buildTool: "go",
        testFramework: "go test",
        packageManager: "go modules",
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
};

function createStoredAnalysis(overrides?: Partial<StoredRepoAnalysis>): StoredRepoAnalysis {
  return {
    repoName: "repo-a",
    generatedAt: "2026-04-02T12:00:00.000Z",
    stack: {
      language: "typescript",
      framework: "react",
      buildTool: "vite",
      testFramework: "vitest",
      packageManager: "pnpm",
    },
    structure: ["has-pages-or-views", "has-src-components"],
    deps: ["react", "vitest", "zod"],
    testing: {
      framework: "vitest",
      hasTestDir: true,
      testPattern: "*.test.ts",
    },
    ...overrides,
  };
}

describe("context repo map", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("builds a deterministic repo map from config and stored analyses", () => {
    const analyses: StoredRepoAnalysisRecord = {
      "repo-a": createStoredAnalysis(),
      "repo-b": createStoredAnalysis({
        repoName: "repo-b",
        generatedAt: "2026-04-02T12:05:00.000Z",
        stack: {
          language: "go",
          framework: "gin",
          buildTool: "go",
          testFramework: "go test",
          packageManager: "go modules",
        },
        structure: ["has-api-or-controllers", "has-ci"],
        deps: ["cobra", "gin", "testify"],
        testing: {
          framework: "go-test",
          hasTestDir: true,
          testPattern: "*_test.go",
        },
      }),
    };

    expect(buildRepoMapDocument(baseConfig, analyses, "2026-04-02T12:10:00.000Z")).toEqual({
      version: 1,
      generatedAt: "2026-04-02T12:10:00.000Z",
      repos: [
        {
          name: "repo-a",
          path: "repo-a",
          branch: "main",
          type: "frontend-web",
          description: "UI app",
          gitUrl: "https://example.com/repo-a.git",
          stack: analyses["repo-a"]!.stack,
          testing: analyses["repo-a"]!.testing,
          structure: ["has-pages-or-views", "has-src-components"],
          deps: ["react", "vitest", "zod"],
          analysisGeneratedAt: "2026-04-02T12:00:00.000Z",
        },
        {
          name: "repo-b",
          path: "repo-b",
          branch: "develop",
          type: "backend",
          description: "API service",
          gitUrl: "https://example.com/repo-b.git",
          stack: analyses["repo-b"]!.stack,
          testing: analyses["repo-b"]!.testing,
          structure: ["has-api-or-controllers", "has-ci"],
          deps: ["cobra", "gin", "testify"],
          analysisGeneratedAt: "2026-04-02T12:05:00.000Z",
        },
      ],
    });
  });

  it("falls back to config stack when stored analysis is unavailable and builds compact task bundles", () => {
    const repoMap = buildRepoMapDocument(
      baseConfig,
      { "repo-a": createStoredAnalysis() },
      "2026-04-02T12:10:00.000Z",
    );

    expect(repoMap.repos[1]).toEqual({
      name: "repo-b",
      path: "repo-b",
      branch: "develop",
      type: "backend",
      description: "API service",
      gitUrl: "https://example.com/repo-b.git",
      stack: baseConfig.repos[1]!.stack,
      testing: null,
      structure: [],
      deps: [],
      analysisGeneratedAt: null,
    });

    expect(buildTaskBundlesDocument(repoMap, "2026-04-02T12:15:00.000Z")).toEqual({
      version: 1,
      generatedAt: "2026-04-02T12:15:00.000Z",
      bundles: [
        {
          id: "repo-a",
          repo: "repo-a",
          title: "repo-a: UI app",
          stack: ["typescript", "react", "vite", "vitest"],
          tags: ["frontend-web", "has-pages-or-views", "has-src-components"],
          deps: ["react", "vitest", "zod"],
          testPattern: "*.test.ts",
        },
        {
          id: "repo-b",
          repo: "repo-b",
          title: "repo-b: API service",
          stack: ["go", "echo", "go", "go test"],
          tags: ["backend"],
          deps: [],
          testPattern: null,
        },
      ],
    });
  });

  it("skips malformed or wrong-shaped stored analysis snapshots", async () => {
    const cwd = await makeTempDir();

    await writeTextFile(join(cwd, ".bbg", "analysis", "repos", "repo-a.json"), "{not-json\n");
    await writeTextFile(
      join(cwd, ".bbg", "analysis", "repos", "repo-b.json"),
      JSON.stringify({ repoName: "repo-b", generatedAt: "2026-04-02T12:05:00.000Z" }, null, 2) + "\n",
    );

    await expect(readStoredRepoAnalyses(cwd, ["repo-a", "repo-b", "repo-c"])).resolves.toEqual({});
  });

  it("propagates unexpected stored analysis read failures", async () => {
    const cwd = await makeTempDir();

    await mkdir(join(cwd, ".bbg", "analysis", "repos", "repo-a.json"), { recursive: true });

    await expect(readStoredRepoAnalyses(cwd, ["repo-a"])).rejects.toThrow();
  });

  it("propagates non-missing filesystem errors while checking stored analyses", async () => {
    const cwd = await makeTempDir();

    await writeTextFile(join(cwd, ".bbg", "analysis"), "not-a-directory\n");

    await expect(readStoredRepoAnalyses(cwd, ["repo-a"])).rejects.toMatchObject({ code: "ENOTDIR" });
  });
});
