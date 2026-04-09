import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
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
import { runAnalyzeRepoCommand } from "../../src/commands/analyze-repo.js";
import { buildDefaultRuntimeConfig } from "../../src/runtime/schema.js";
import { writeTextFile } from "../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-analyze-repo-command-"));
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
      projectDescription: "analyze repo test",
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

describe("analyze-repo command", () => {
  it("updates a single repo architecture file", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runAnalyzeRepoCommand({ cwd, repo: "repo-a" });
    expect(result.repo).toBe("repo-a");

    const content = await readFile(join(cwd, result.repoDocPath), "utf8");
    expect(content).toContain("repo-a Architecture");
    expect(content).toContain("zod");
  });
});
