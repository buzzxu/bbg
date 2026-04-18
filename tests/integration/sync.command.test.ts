import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const analyzerState = vi.hoisted(() => ({
  analyzeRepo: vi.fn(),
}));

const execaState = vi.hoisted(() => ({
  execa: vi.fn(),
}));

const promptState = vi.hoisted(() => ({
  promptConfirm: vi.fn(),
}));

vi.mock("../../src/analyzers/index.js", () => ({
  analyzeRepo: analyzerState.analyzeRepo,
}));

vi.mock("execa", () => ({
  execa: execaState.execa,
}));

vi.mock("../../src/utils/prompts.js", () => ({
  promptConfirm: promptState.promptConfirm,
}));

import { runSync } from "../../src/commands/sync.js";
import { ConfigValidationError } from "../../src/config/read-write.js";
import { writeTextFile } from "../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-sync-test-"));
  tempDirs.push(dir);
  return dir;
}

describe("sync command", () => {
  beforeEach(() => {
    analyzerState.analyzeRepo.mockReset();
    execaState.execa.mockReset();
    promptState.promptConfirm.mockReset();
    promptState.promptConfirm.mockResolvedValue(false);

    analyzerState.analyzeRepo.mockImplementation(async (repoPath: string) => {
      if (repoPath.endsWith("repo-a")) {
        return {
          stack: {
            language: "typescript",
            framework: "react",
            buildTool: "vite",
            testFramework: "vitest",
            packageManager: "pnpm",
          },
          structure: [],
          deps: [],
          testing: { framework: "vitest", hasTestDir: true, testPattern: "*.test.ts" },
        };
      }

      return {
        stack: {
          language: "go",
          framework: "gin",
          buildTool: "go",
          testFramework: "go test",
          packageManager: "go modules",
        },
        structure: [],
        deps: [],
        testing: { framework: "go test", hasTestDir: true, testPattern: "*_test.go" },
      };
    });

    execaState.execa.mockImplementation(async (_command: string, args: string[], options?: { cwd?: string }) => {
      if (args[0] === "fetch") {
        return { stdout: "", stderr: "", exitCode: 0 };
      }

      if (args[0] === "rev-parse" && args[1] === "--abbrev-ref" && args[2] === "HEAD") {
        return { stdout: options?.cwd?.endsWith("repo-a") ? "main" : "feature-x", stderr: "", exitCode: 0 };
      }

      if (args[0] === "rev-list") {
        return { stdout: options?.cwd?.endsWith("repo-a") ? "0\t0" : "2\t1", stderr: "", exitCode: 0 };
      }

      return { stdout: "", stderr: "", exitCode: 0 };
    });
  });

  afterEach(async () => {
    const { rm } = await import("node:fs/promises");
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("reports branch/ahead-behind statuses, orphan repos, and stack drift", async () => {
    const cwd = await makeTempDir();
    const config = {
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "sync test",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
      repos: [
        {
          name: "repo-a",
          gitUrl: "https://example.com/repo-a.git",
          branch: "main",
          type: "frontend-web",
          stack: {
            language: "typescript",
            framework: "react",
            buildTool: "vite",
            testFramework: "vitest",
            packageManager: "pnpm",
          },
          description: "repo a",
        },
        {
          name: "repo-b",
          gitUrl: "https://example.com/repo-b.git",
          branch: "main",
          type: "backend",
          stack: {
            language: "go",
            framework: "echo",
            buildTool: "go",
            testFramework: "go test",
            packageManager: "go modules",
          },
          description: "repo b",
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

    await mkdir(join(cwd, ".bbg"), { recursive: true });
    await writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`);

    await Promise.all([
      mkdir(join(cwd, "repo-a", ".git"), { recursive: true }),
      mkdir(join(cwd, "repo-b", ".git"), { recursive: true }),
      mkdir(join(cwd, "orphan-repo", ".git"), { recursive: true }),
    ]);

    const report = await runSync({ cwd, update: false });

    expect(report.orphanRepos).toEqual(["orphan-repo"]);
    expect(report.repoStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ repoName: "repo-a", currentBranch: "main", branchMatchesConfig: true }),
        expect.objectContaining({ repoName: "repo-b", currentBranch: "feature-x", branchMatchesConfig: false }),
      ]),
    );
    expect(report.drift).toEqual([
      {
        repoName: "repo-b",
        kind: "stack",
        expected: config.repos[1].stack,
        actual: {
          language: "go",
          framework: "gin",
          buildTool: "go",
          testFramework: "go test",
          packageManager: "go modules",
        },
      },
    ]);

    const analysisRepoA = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) => readFile(join(cwd, ".bbg", "analysis", "repos", "repo-a.json"), "utf8")),
    ) as {
      repoName: string;
      stack: { framework: string };
    };
    expect(analysisRepoA.repoName).toBe("repo-a");
    expect(analysisRepoA.stack.framework).toBe("react");

    const repoMap = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) => readFile(join(cwd, ".bbg", "context", "repo-map.json"), "utf8")),
    ) as {
      repos: Array<{ name: string; stack: { framework: string }; analysisGeneratedAt: string | null }>;
    };
    const taskBundles = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) => readFile(join(cwd, ".bbg", "context", "task-bundles.json"), "utf8")),
    ) as {
      bundles: Array<{ repo: string; stack: string[]; testPattern: string | null }>;
    };
    expect(repoMap.repos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "repo-a",
          stack: expect.objectContaining({ framework: "react" }),
          analysisGeneratedAt: expect.any(String),
        }),
        expect.objectContaining({
          name: "repo-b",
          stack: expect.objectContaining({ framework: "gin" }),
          analysisGeneratedAt: expect.any(String),
        }),
      ]),
    );
    expect(taskBundles.bundles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          repo: "repo-a",
          stack: ["typescript", "react", "vite", "vitest"],
          testPattern: "*.test.ts",
        }),
        expect.objectContaining({
          repo: "repo-b",
          stack: ["go", "gin", "go", "go test"],
          testPattern: "*_test.go",
        }),
      ]),
    );
  });

  it("updates config stacks when --update is true", async () => {
    const cwd = await makeTempDir();
    const config = {
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "sync update test",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
      repos: [
        {
          name: "repo-b",
          gitUrl: "https://example.com/repo-b.git",
          branch: "main",
          type: "backend",
          stack: {
            language: "go",
            framework: "echo",
            buildTool: "go",
            testFramework: "go test",
            packageManager: "go modules",
          },
          description: "repo b",
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

    await mkdir(join(cwd, ".bbg"), { recursive: true });
    await writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`);
    await mkdir(join(cwd, "repo-b", ".git"), { recursive: true });

    await runSync({ cwd, update: true });

    const updatedConfig = JSON.parse(await import("node:fs/promises").then(({ readFile }) => readFile(join(cwd, ".bbg", "config.json"), "utf8"))) as {
      repos: Array<{ stack: { framework: string } }>;
    };
    expect(updatedConfig.repos[0]?.stack.framework).toBe("gin");
  });

  it("when update is false does not prompt and does not persist stack drift", async () => {
    const cwd = await makeTempDir();
    const config = {
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "sync prompt update test",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
      repos: [
        {
          name: "repo-b",
          gitUrl: "https://example.com/repo-b.git",
          branch: "main",
          type: "backend",
          stack: {
            language: "go",
            framework: "echo",
            buildTool: "go",
            testFramework: "go test",
            packageManager: "go modules",
          },
          description: "repo b",
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

    await mkdir(join(cwd, ".bbg"), { recursive: true });
    await writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`);
    await mkdir(join(cwd, "repo-b", ".git"), { recursive: true });

    await runSync({ cwd, update: false });

    const updatedConfig = JSON.parse(await import("node:fs/promises").then(({ readFile }) => readFile(join(cwd, ".bbg", "config.json"), "utf8"))) as {
      repos: Array<{ stack: { framework: string } }>;
    };
    expect(updatedConfig.repos[0]?.stack.framework).toBe("echo");
    expect(promptState.promptConfirm).not.toHaveBeenCalled();
  });

  it("when json is true does not prompt", async () => {
    const cwd = await makeTempDir();
    const config = {
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "sync json mode test",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
      repos: [
        {
          name: "repo-b",
          gitUrl: "https://example.com/repo-b.git",
          branch: "main",
          type: "backend",
          stack: {
            language: "go",
            framework: "echo",
            buildTool: "go",
            testFramework: "go test",
            packageManager: "go modules",
          },
          description: "repo b",
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

    await mkdir(join(cwd, ".bbg"), { recursive: true });
    await writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`);
    await mkdir(join(cwd, "repo-b", ".git"), { recursive: true });

    await runSync({ cwd, update: false, json: true });

    expect(promptState.promptConfirm).not.toHaveBeenCalled();
  });

  it("surfaces git command failures in repo status", async () => {
    const cwd = await makeTempDir();
    const config = {
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "sync git failure test",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
      repos: [
        {
          name: "repo-a",
          gitUrl: "https://example.com/repo-a.git",
          branch: "main",
          type: "frontend-web",
          stack: {
            language: "typescript",
            framework: "react",
            buildTool: "vite",
            testFramework: "vitest",
            packageManager: "pnpm",
          },
          description: "repo a",
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

    await mkdir(join(cwd, ".bbg"), { recursive: true });
    await writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`);
    await mkdir(join(cwd, "repo-a", ".git"), { recursive: true });

    execaState.execa.mockImplementation(async (_command: string, args: string[]) => {
      if (args[0] === "rev-parse") {
        throw new Error("branch unavailable");
      }
      if (args[0] === "fetch") {
        throw new Error("fetch failed");
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const report = await runSync({ cwd, update: false });
    expect(report.repoStatuses[0]).toEqual(
      expect.objectContaining({
        repoName: "repo-a",
        currentBranch: null,
        currentBranchError: "branch unavailable",
        fetchError: "fetch failed",
        ahead: 0,
        behind: 0,
      }),
    );
  });

  it("skips context artifacts when runtime context is disabled", async () => {
    const cwd = await makeTempDir();
    const config = {
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "sync disabled context test",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
      repos: [
        {
          name: "repo-a",
          gitUrl: "https://example.com/repo-a.git",
          branch: "main",
          type: "frontend-web",
          stack: {
            language: "typescript",
            framework: "react",
            buildTool: "vite",
            testFramework: "vitest",
            packageManager: "pnpm",
          },
          description: "repo a",
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
      runtime: {
        telemetry: { enabled: false, file: ".bbg/telemetry/events.json" },
        evaluation: { enabled: true, file: ".bbg/evaluations/history.json" },
        policy: { enabled: true, file: ".bbg/policy/decisions.json" },
        context: {
          enabled: false,
          repoMapFile: ".bbg/context/repo-map.json",
          sessionHistoryFile: ".bbg/sessions/history.json",
        },
        autonomy: {
          maxAttempts: 5,
          maxVerifyFailures: 3,
          maxDurationMs: 3600000,
        },
      },
    };

    await mkdir(join(cwd, ".bbg"), { recursive: true });
    await writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`);
    await mkdir(join(cwd, "repo-a", ".git"), { recursive: true });

    await runSync({ cwd, update: false });

    const analysisRepoA = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) => readFile(join(cwd, ".bbg", "analysis", "repos", "repo-a.json"), "utf8")),
    ) as { repoName: string };
    expect(analysisRepoA.repoName).toBe("repo-a");
    await expect(
      import("node:fs/promises").then(({ readFile }) => readFile(join(cwd, ".bbg", "context", "repo-map.json"), "utf8")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      import("node:fs/promises").then(({ readFile }) => readFile(join(cwd, ".bbg", "context", "task-bundles.json"), "utf8")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("writes the canonical repo map even when runtime repoMapFile is customized", async () => {
    const cwd = await makeTempDir();
    const config = {
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "sync custom repo map path test",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
      repos: [
        {
          name: "repo-a",
          gitUrl: "https://example.com/repo-a.git",
          branch: "main",
          type: "frontend-web",
          stack: {
            language: "typescript",
            framework: "react",
            buildTool: "vite",
            testFramework: "vitest",
            packageManager: "pnpm",
          },
          description: "repo a",
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
      runtime: {
        telemetry: { enabled: false, file: ".bbg/telemetry/events.json" },
        evaluation: { enabled: true, file: ".bbg/evaluations/history.json" },
        policy: { enabled: true, file: ".bbg/policy/decisions.json" },
        context: {
          enabled: true,
          repoMapFile: ".bbg/runtime/custom-repo-map.json",
          sessionHistoryFile: ".bbg/sessions/history.json",
        },
        autonomy: {
          maxAttempts: 5,
          maxVerifyFailures: 3,
          maxDurationMs: 3600000,
        },
      },
    };

    await mkdir(join(cwd, ".bbg"), { recursive: true });
    await writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`);
    await mkdir(join(cwd, "repo-a", ".git"), { recursive: true });

    await runSync({ cwd, update: false });

    const repoMap = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) => readFile(join(cwd, ".bbg", "context", "repo-map.json"), "utf8")),
    ) as { repos: Array<{ name: string }> };

    expect(repoMap.repos).toEqual([expect.objectContaining({ name: "repo-a" })]);
  });

  it("rejects repo names that escape the workspace", async () => {
    const cwd = await makeTempDir();
    const config = {
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "sync invalid repo path test",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
      repos: [
        {
          name: "../outside",
          gitUrl: "https://example.com/repo-a.git",
          branch: "main",
          type: "frontend-web",
          stack: {
            language: "typescript",
            framework: "react",
            buildTool: "vite",
            testFramework: "vitest",
            packageManager: "pnpm",
          },
          description: "repo a",
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

    await mkdir(join(cwd, ".bbg"), { recursive: true });
    await writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`);

    await expect(runSync({ cwd, update: false })).rejects.toThrow(ConfigValidationError);
    expect(analyzerState.analyzeRepo).not.toHaveBeenCalled();
  });
});
