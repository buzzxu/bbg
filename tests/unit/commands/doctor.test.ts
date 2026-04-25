import { access, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { serializeConfig } from "../../../src/config/read-write.js";
import type { BbgConfig } from "../../../src/config/schema.js";
import { writeTextFile } from "../../../src/utils/fs.js";
import { runDoctor } from "../../../src/commands/doctor.js";
import { runRepairAdapters } from "../../../src/commands/repair-adapters.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-doctor-test-"));
  tempDirs.push(dir);
  return dir;
}

function buildConfig(): BbgConfig {
  const now = "2026-03-29T00:00:00.000Z";
  return {
    version: "0.1.0",
    projectName: "bbg-project",
    projectDescription: "doctor test",
    createdAt: now,
    updatedAt: now,
    repos: [
      {
        name: "repo-a",
        gitUrl: "https://example.com/repo-a.git",
        branch: "main",
        type: "backend",
        stack: {
          language: "typescript",
          framework: "node",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
          languageVersion: "5.8.2",
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
}

async function createMinimalWorkspace(cwd: string): Promise<void> {
  const config = buildConfig();
  await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig(config));
  await writeTextFile(join(cwd, "AGENTS.md"), "# Root agents\n");
  await writeTextFile(join(cwd, "README.md"), "# Root readme\n");
  await mkdir(join(cwd, "repo-a"), { recursive: true });
  await writeTextFile(join(cwd, "repo-a", "AGENTS.md"), "# Repo agents\n");
  await writeTextFile(join(cwd, ".gitignore"), "node_modules/\n");
  await writeTextFile(
    join(cwd, "package.json"),
    `${JSON.stringify({
      name: "doctor-workspace",
      private: true,
      scripts: {
        build: 'node -e "process.exit(0)"',
        typecheck: 'node -e "process.exit(0)"',
      },
    }, null, 2)}\n`,
  );
}

async function createGovernanceWorkspaceOnly(cwd: string): Promise<void> {
  const config = buildConfig();
  await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig(config));
  await writeTextFile(join(cwd, "AGENTS.md"), "# Root agents\n");
  await writeTextFile(join(cwd, "README.md"), "# Root readme\n");
  await writeTextFile(join(cwd, ".gitignore"), "node_modules/\n");
}

async function seedAnalyzeState(cwd: string): Promise<void> {
  await writeTextFile(
    join(cwd, ".bbg", "analyze", "latest.json"),
    `${JSON.stringify({
      version: 1,
      runId: "run-1",
      status: "completed",
      scope: "workspace",
      repos: ["repo-a"],
      startedAt: "2026-04-17T00:00:00.000Z",
      updatedAt: "2026-04-17T00:00:00.000Z",
      docsUpdated: [],
      knowledgeUpdated: [],
      warnings: [],
      failures: [],
    }, null, 2)}\n`,
  );
}

describe("doctor command", () => {
  afterEach(async () => {
    const { rm } = await import("node:fs/promises");
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("fails when required files are missing", async () => {
    const cwd = await makeTempDir();

    const report = await runDoctor({ cwd, json: true });

    expect(report.ok).toBe(false);
    expect(report.errors.some((entry) => entry.id === "config-exists")).toBe(true);
    expect(report.errors.some((entry) => entry.id === "root-agents-md")).toBe(true);
    expect(report.errors.some((entry) => entry.id === "root-readme")).toBe(true);
  });

  it("returns structured report shape in json mode", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);

    const report = await runDoctor({ cwd, json: true, workspace: true });

    expect(typeof report.ok).toBe("boolean");
    expect(Array.isArray(report.errors)).toBe(true);
    expect(Array.isArray(report.warnings)).toBe(true);
    expect(Array.isArray(report.info)).toBe(true);
    expect(Array.isArray(report.checks)).toBe(true);
  });

  it("reports tool-matrix status for supported adapters", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);
    await runRepairAdapters({ cwd });

    const report = await runDoctor({ cwd, json: true, toolMatrix: true });

    expect(report.toolMatrix).toBeDefined();
    for (const tool of ["claude", "codex", "cursor", "gemini", "opencode"]) {
      expect(report.toolMatrix?.find((entry) => entry.tool === tool)).toEqual(expect.objectContaining({
        status: "full",
      }));
    }
  });

  it("fix mode repairs missing repo entries in .gitignore", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);

    const report = await runDoctor({ cwd, fix: true, json: true, workspace: true });
    const gitignoreCheck = report.checks.find((entry) => entry.id === "gitignore-repos");

    expect(gitignoreCheck?.passed).toBe(true);
    await expect(import("node:fs/promises").then(({ readFile }) => readFile(join(cwd, ".gitignore"), "utf8"))).resolves.toContain(
      "repo-a/",
    );
  });

  it("fix mode regenerates missing root AGENTS.md and README.md from templates", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);
    await rm(join(cwd, "AGENTS.md"));
    await rm(join(cwd, "README.md"));

    const report = await runDoctor({ cwd, fix: true, json: true });

    expect(report.checks.find((entry) => entry.id === "root-agents-md")?.passed).toBe(true);
    expect(report.checks.find((entry) => entry.id === "root-readme")?.passed).toBe(true);
    expect(report.fixesApplied).toContain(join(cwd, "AGENTS.md"));
    expect(report.fixesApplied).toContain(join(cwd, "README.md"));

    await expect(access(join(cwd, "AGENTS.md"))).resolves.toBeUndefined();
    await expect(access(join(cwd, "README.md"))).resolves.toBeUndefined();
  });

  it("applies workspace and governanceOnly check selection deterministically", async () => {
    const cwd = await makeTempDir();
    await createGovernanceWorkspaceOnly(cwd);

    const defaultReport = await runDoctor({ cwd, json: true });
    const workspaceReport = await runDoctor({ cwd, json: true, workspace: true });
    const governanceOnlyReport = await runDoctor({ cwd, json: true, workspace: true, governanceOnly: true });

    expect(defaultReport.checks.some((entry) => entry.id === "repo-dirs-exist")).toBe(false);
    expect(defaultReport.checks.some((entry) => entry.id === "hash-integrity")).toBe(false);

    const workspaceRepoDirs = workspaceReport.checks.find((entry) => entry.id === "repo-dirs-exist");
    const workspaceHashIntegrity = workspaceReport.checks.find((entry) => entry.id === "hash-integrity");
    expect(workspaceRepoDirs?.passed).toBe(false);
    expect(workspaceHashIntegrity?.passed).toBe(false);

    expect(governanceOnlyReport.checks.some((entry) => entry.id === "repo-dirs-exist")).toBe(false);
    expect(governanceOnlyReport.checks.some((entry) => entry.id === "hash-integrity")).toBe(false);
  });

  it("detects missing template-tracked files", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);

    const hashes = {
      "AGENTS.md": {
        generatedHash: "abc123",
        generatedAt: "2026-01-01T00:00:00.000Z",
        templateVersion: "0.1.0",
      },
      "nonexistent-file.md": {
        generatedHash: "def456",
        generatedAt: "2026-01-01T00:00:00.000Z",
        templateVersion: "0.1.0",
      },
    };
    await writeTextFile(join(cwd, ".bbg", "file-hashes.json"), JSON.stringify(hashes, null, 2));

    const report = await runDoctor({ cwd, json: true, workspace: true });

    const templateCheck = report.checks.find((entry) => entry.id === "template-files-exist");
    expect(templateCheck).toBeDefined();
    expect(templateCheck!.passed).toBe(false);
    expect(templateCheck!.message).toContain("nonexistent-file.md");
  });

  it("reports template version mismatch as info", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);

    const report = await runDoctor({ cwd, json: true });

    const versionCheck = report.checks.find((entry) => entry.id === "template-version-match");
    expect(versionCheck).toBeDefined();
    // Config has version "0.1.0", CLI_VERSION is "0.3.0" — should not match
    expect(versionCheck!.passed).toBe(false);
    expect(versionCheck!.message).toContain("differs");
  });

  it("reports runtime harness gaps for missing config-backed assets", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);

    const report = await runDoctor({ cwd, json: true, workspace: true });

    expect(report.checks.find((entry) => entry.id === "runtime-configured")?.passed).toBe(false);
    expect(report.checks.find((entry) => entry.id === "runtime-command-scripts")?.message).toContain("test");
    expect(report.checks.find((entry) => entry.id === "runtime-telemetry")?.passed).toBe(false);
    expect(report.checks.find((entry) => entry.id === "runtime-eval-datasets")?.passed).toBe(false);
    expect(report.checks.find((entry) => entry.id === "runtime-repo-map")?.passed).toBe(false);
    expect(report.checks.find((entry) => entry.id === "runtime-policy-coverage")?.passed).toBe(false);
  });

  it("reports missing analyze artifacts when analyze state exists but docs and knowledge are absent", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);
    await seedAnalyzeState(cwd);

    const report = await runDoctor({ cwd, json: true, workspace: true });

    expect(report.checks.find((entry) => entry.id === "analyze-artifacts")).toEqual(
      expect.objectContaining({
        passed: false,
      }),
    );
    expect(report.checks.find((entry) => entry.id === "language-pattern-guides")?.passed).toBe(false);
    expect(report.checks.find((entry) => entry.id === "knowledge-artifacts")?.message).toContain(".bbg/knowledge/");
  });

  it("reports stale language pattern guides that no longer match analyzed repo languages", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);
    await seedAnalyzeState(cwd);
    await writeTextFile(
      join(cwd, "docs", "architecture", "languages", "README.md"),
      "# Language Architecture Guides\n",
    );
    await writeTextFile(
      join(cwd, "docs", "architecture", "languages", "typescript", "application-patterns.md"),
      "---\nminimum_supported_version: 5.8.2\nlast_reviewed: 2026-04-18\nsources:\n  - https://www.typescriptlang.org/docs/handbook/intro.html\n---\n",
    );
    await writeTextFile(
      join(cwd, "docs", "architecture", "languages", "typescript", "type-boundaries.md"),
      "---\nminimum_supported_version: 5.8.2\nlast_reviewed: 2026-04-18\nsources:\n  - https://www.typescriptlang.org/docs/handbook/intro.html\n---\n",
    );
    await writeTextFile(
      join(cwd, "docs", "architecture", "languages", "typescript", "testing-and-runtime-boundaries.md"),
      "---\nminimum_supported_version: 5.8.2\nlast_reviewed: 2026-04-18\nsources:\n  - https://www.typescriptlang.org/docs/handbook/intro.html\n---\n",
    );
    await writeTextFile(
      join(cwd, "docs", "architecture", "languages", "rust", "application-patterns.md"),
      "---\nminimum_supported_version: 2021\nlast_reviewed: 2026-04-18\nsources:\n  - https://rust-lang.github.io/api-guidelines/checklist.html\n---\n",
    );

    const report = await runDoctor({ cwd, json: true, workspace: true });

    expect(report.checks.find((entry) => entry.id === "language-pattern-guides")).toEqual(
      expect.objectContaining({
        passed: false,
        message: expect.stringContaining("stale language guides are still present"),
      }),
    );
    expect(report.checks.find((entry) => entry.id === "language-pattern-guides")?.message).toContain(
      "docs/architecture/languages/rust/application-patterns.md",
    );
  });

  it("reports quarantined analyze runtime state", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);
    await writeTextFile(join(cwd, ".bbg", "quarantine", "analyze", "broken-handoff.json"), "{}\n");

    const report = await runDoctor({ cwd, json: true, workspace: true });

    expect(report.checks.find((entry) => entry.id === "analyze-quarantine")).toEqual(
      expect.objectContaining({
        passed: false,
        message: expect.stringContaining("analyze runtime state quarantined: 1 file(s)"),
      }),
    );
  });

  it("reports stale task environments and observation note reuse", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "task-envs", "bugfix", "manifest.json"),
      `${JSON.stringify({
        version: 1,
        id: "bugfix",
        task: "Bugfix",
        slug: "bugfix",
        createdAt: "2026-04-17T00:00:00.000Z",
        updatedAt: "2026-04-17T00:00:00.000Z",
        gitRoot: ".",
        baseRef: "HEAD",
        worktreePath: ".bbg/task-envs/bugfix/worktree",
        artifactRoot: ".bbg/task-envs/bugfix/artifacts",
        uiArtifactsPath: ".bbg/task-envs/bugfix/artifacts/ui",
        logArtifactsPath: ".bbg/task-envs/bugfix/artifacts/logs",
        metricArtifactsPath: ".bbg/task-envs/bugfix/artifacts/metrics",
        traceArtifactsPath: ".bbg/task-envs/bugfix/artifacts/traces",
        notesPath: ".bbg/task-envs/bugfix/notes.md",
        status: "stale",
      }, null, 2)}\n`,
    );
    await writeTextFile(
      join(cwd, ".bbg", "task-envs", "bugfix", "observations", "latency", "manifest.json"),
      `${JSON.stringify({
        version: 1,
        id: "latency",
        topic: "Latency",
        createdAt: "2026-04-17T00:00:00.000Z",
        updatedAt: "2026-04-17T00:00:00.000Z",
        envId: "bugfix",
        rootPath: ".bbg/task-envs/bugfix/artifacts",
        uiArtifactsPath: ".bbg/task-envs/bugfix/artifacts/ui",
        logArtifactsPath: ".bbg/task-envs/bugfix/artifacts/logs",
        metricArtifactsPath: ".bbg/task-envs/bugfix/artifacts/metrics",
        traceArtifactsPath: ".bbg/task-envs/bugfix/artifacts/traces",
        notesPath: ".bbg/task-envs/bugfix/notes.md",
      }, null, 2)}\n`,
    );

    const report = await runDoctor({ cwd, json: true, workspace: true });

    expect(report.checks.find((entry) => entry.id === "task-runtime-env-health")).toEqual(
      expect.objectContaining({
        passed: false,
      }),
    );
    expect(report.checks.find((entry) => entry.id === "task-runtime-observe-isolation")).toEqual(
      expect.objectContaining({
        passed: false,
      }),
    );
  });

  it("accepts absolute-path runtime command wrappers", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);
    await writeTextFile(
      join(cwd, "package.json"),
      `${JSON.stringify({
        name: "doctor-runtime-capabilities-absolute-wrapper",
        private: true,
        scripts: {
          build: '/usr/bin/env node -e "process.exit(0)"',
          typecheck: '/usr/bin/env node -e "process.exit(0)"',
          test: '/usr/bin/env node -e "process.exit(0)"',
          lint: '/usr/bin/env node -e "process.exit(0)"',
        },
      }, null, 2)}\n`,
    );

    const report = await runDoctor({ cwd, json: true, workspace: true });

    expect(report.checks.find((entry) => entry.id === "runtime-command-scripts")).toEqual(expect.objectContaining({
      passed: true,
      message: "runtime command scripts exist",
    }));
  });

  it("accepts Windows relative executable runtime scripts", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);
    const platformSpy = vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const originalPathext = process.env.PATHEXT;
    process.env.PATHEXT = ".EXE;.CMD;.BAT;.COM";
    await writeTextFile(join(cwd, "runtime-tool.exe"), "@echo off\r\nexit /b 0\r\n");
    await writeTextFile(
      join(cwd, "package.json"),
      `${JSON.stringify({
        name: "doctor-runtime-capabilities-relative-executable",
        private: true,
        scripts: {
          build: ".\\runtime-tool.exe",
          typecheck: ".\\runtime-tool.exe",
          test: ".\\runtime-tool.exe",
          lint: ".\\runtime-tool.exe",
        },
      }, null, 2)}\n`,
    );

    try {
      const report = await runDoctor({ cwd, json: true, workspace: true });

      expect(report.checks.find((entry) => entry.id === "runtime-command-scripts")).toEqual(expect.objectContaining({
        passed: true,
        message: "runtime command scripts exist",
      }));
    } finally {
      if (originalPathext === undefined) {
        delete process.env.PATHEXT;
      } else {
        process.env.PATHEXT = originalPathext;
      }
      platformSpy.mockRestore();
    }
  });

  it("accepts configured runtime commands without relying on root package scripts", async () => {
    const cwd = await makeTempDir();
    const config = {
      ...buildConfig(),
      runtime: {
        telemetry: {
          enabled: false,
          file: ".bbg/telemetry/events.json",
        },
        evaluation: {
          enabled: true,
          file: ".bbg/evaluations/history.json",
        },
        policy: {
          enabled: true,
          file: ".bbg/policy/decisions.json",
        },
        context: {
          enabled: true,
          repoMapFile: ".bbg/context/repo-map.json",
          sessionHistoryFile: ".bbg/sessions/history.json",
        },
        autonomy: {
          maxAttempts: 5,
          maxVerifyFailures: 3,
          maxDurationMs: 3600000,
        },
        commands: {
          build: { command: "/usr/bin/env", args: ["node", "-e", "process.exit(0)"] },
          typecheck: { command: "/usr/bin/env", args: ["node", "-e", "process.exit(0)"] },
          tests: { command: "/usr/bin/env", args: ["node", "-e", "process.exit(0)"] },
          lint: { command: "/usr/bin/env", args: ["node", "-e", "process.exit(0)"] },
        },
      },
    } satisfies BbgConfig;
    await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig(config));
    await writeTextFile(join(cwd, "AGENTS.md"), "# Root agents\n");
    await writeTextFile(join(cwd, "README.md"), "# Root readme\n");
    await mkdir(join(cwd, "repo-a"), { recursive: true });
    await writeTextFile(join(cwd, "repo-a", "AGENTS.md"), "# Repo agents\n");
    await writeTextFile(join(cwd, ".gitignore"), "node_modules/\n");

    const report = await runDoctor({ cwd, json: true, workspace: true });

    expect(report.checks.find((entry) => entry.id === "runtime-command-scripts")).toEqual(expect.objectContaining({
      passed: true,
      message: "runtime command scripts exist",
    }));
  });

  it("counts both AI-FILL marker forms", async () => {
    const cwd = await makeTempDir();
    await createMinimalWorkspace(cwd);
    await writeTextFile(
      join(cwd, "docs", "tasks", "task-1.md"),
      ["<!-- AI-FILL -->", "", "<!-- AI-FILL: complete this section -->"].join("\n"),
    );

    const report = await runDoctor({ cwd, json: true });
    const aiFillCheck = report.checks.find((entry) => entry.id === "ai-fill-markers");

    expect(aiFillCheck?.passed).toBe(false);
    expect(aiFillCheck?.message).toContain("2 AI-FILL markers remain");
  });
});
