import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  BBG_GITIGNORE_ENTRIES,
  MANAGED_GITIGNORE_BLOCK_END,
  MANAGED_GITIGNORE_BLOCK_START,
} from "../../src/constants.js";
import { runInit } from "../../src/commands/init.js";
import { runUninstall } from "../../src/commands/uninstall.js";
import { exists, writeTextFile } from "../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "bbg-uninstall-test-"));
  tempDirs.push(cwd);
  return cwd;
}

describe("uninstall command", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((cwd) => rm(cwd, { recursive: true, force: true })));
  });

  it("plans removals without mutating files in dry-run mode", { timeout: 30000 }, async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });

    await writeTextFile(join(cwd, "AGENTS.md"), `${await readFile(join(cwd, "AGENTS.md"), "utf8")}\nuser notes\n`);
    const beforeConfig = await readFile(join(cwd, ".bbg", "config.json"), "utf8");

    const result = await runUninstall({
      cwd,
      dryRun: true,
      yes: true,
    });

    expect(result.deleted).toContain(".bbg/config.json");
    expect(result.deleted).toContain("AGENTS.md");
    expect(await readFile(join(cwd, ".bbg", "config.json"), "utf8")).toBe(beforeConfig);
    expect(await exists(join(cwd, "AGENTS.md"))).toBe(true);
  });

  it("removes managed sections safely and deletes generated files by default", { timeout: 30000 }, async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });

    const originalClaude = await readFile(join(cwd, "CLAUDE.md"), "utf8");
    await writeTextFile(join(cwd, "CLAUDE.md"), `# Local Notes\n\n${originalClaude}\n## Footer\nKeep this.\n`);
    await writeTextFile(join(cwd, "AGENTS.md"), `${await readFile(join(cwd, "AGENTS.md"), "utf8")}\nuser notes\n`);

    const result = await runUninstall({
      cwd,
      yes: true,
    });

    expect(result.removedSections).toContain("CLAUDE.md");
    expect(result.deleted).toContain("AGENTS.md");
    expect(await exists(join(cwd, "AGENTS.md"))).toBe(false);
    const claudeContent = await readFile(join(cwd, "CLAUDE.md"), "utf8");
    expect(claudeContent).toContain("# Local Notes");
    expect(claudeContent).toContain("## Footer");
    expect(claudeContent).not.toContain("BBG:BEGIN MANAGED");

    if (await exists(join(cwd, ".gitignore"))) {
      const gitignoreContent = await readFile(join(cwd, ".gitignore"), "utf8");
      for (const entry of BBG_GITIGNORE_ENTRIES) {
        expect(gitignoreContent).not.toContain(entry);
      }
      expect(gitignoreContent).not.toContain(MANAGED_GITIGNORE_BLOCK_START);
      expect(gitignoreContent).not.toContain(MANAGED_GITIGNORE_BLOCK_END);
    }

    expect(await exists(join(cwd, ".bbg", "config.json"))).toBe(false);
  });

  it("preserves init info when requested and reuses it on the next init", { timeout: 45000 }, async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });
    await mkdir(join(cwd, "frontend"), { recursive: true });

    const config = JSON.parse(await readFile(join(cwd, ".bbg", "config.json"), "utf8")) as {
      projectName: string;
      projectDescription: string;
      repos: unknown[];
    };
    config.projectName = "Poster Workspace";
    config.projectDescription = "Business poster platform";
    config.repos = [
      {
        name: "frontend",
        gitUrl: "https://example.com/frontend.git",
        branch: "main",
        type: "frontend-web",
        stack: {
          language: "typescript",
          framework: "vue",
          buildTool: "vite",
          testFramework: "vitest",
          packageManager: "pnpm",
        },
        description: "Admin frontend",
      },
    ];
    await writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`);

    const uninstallResult = await runUninstall({ cwd, yes: true, keepInitInfo: true });

    expect(uninstallResult.notices).toContain("preserved init info at .bbg-init-info.json");
    expect(await exists(join(cwd, ".bbg"))).toBe(false);
    expect(await exists(join(cwd, ".bbg-init-info.json"))).toBe(true);
    expect(await exists(join(cwd, "frontend"))).toBe(true);

    await runInit({ cwd, yes: true, dryRun: false });

    const nextConfig = JSON.parse(await readFile(join(cwd, ".bbg", "config.json"), "utf8")) as {
      projectName: string;
      projectDescription: string;
      repos: Array<{ name: string; gitUrl: string; branch: string; type: string }>;
    };
    expect(nextConfig.projectName).toBe("Poster Workspace");
    expect(nextConfig.projectDescription).toBe("Business poster platform");
    expect(nextConfig.repos).toEqual([
      expect.objectContaining({
        name: "frontend",
        gitUrl: "https://example.com/frontend.git",
        branch: "main",
        type: "frontend-web",
      }),
    ]);
    expect(await exists(join(cwd, ".bbg-init-info.json"))).toBe(false);
  });

  it("preserves runtime task data when requested", { timeout: 30000 }, async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });

    await writeTextFile(
      join(cwd, ".bbg", "tasks", "sample-task", "session.json"),
      '{\n  "status": "implementing"\n}\n',
    );

    const result = await runUninstall({
      cwd,
      yes: true,
      keepRuntimeData: true,
    });

    expect(result.kept).toContain(".bbg/tasks");
    expect(await exists(join(cwd, ".bbg", "tasks", "sample-task", "session.json"))).toBe(true);
    expect(await exists(join(cwd, ".bbg", "config.json"))).toBe(false);
  });

  it("removes bbg residual runtime and knowledge files by default", { timeout: 30000 }, async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });

    const residualPaths = [
      ".bbg/checkpoints/baseline.json",
      ".bbg/quarantine/analyze/bad.json",
      ".bbg/doc-garden/latest.json",
      ".bbg/scripts/custom.sql",
      ".bbg/telemetry.db",
      ".bbg/knowledge.db",
      ".bbg/session-state.json",
      ".bbg/token-tracker.json",
    ];

    for (const pathValue of residualPaths) {
      await writeTextFile(join(cwd, pathValue), "{}\n");
    }

    await runUninstall({ cwd, yes: true });

    for (const pathValue of residualPaths) {
      expect(await exists(join(cwd, pathValue))).toBe(false);
    }
    expect(await exists(join(cwd, ".bbg"))).toBe(false);
  });

  it("cleans metadata-less bbg residuals", { timeout: 30000 }, async () => {
    const cwd = await makeTempDir();
    await writeTextFile(join(cwd, ".bbg", "telemetry.db"), "{}\n");
    await writeTextFile(join(cwd, ".bbg", "quarantine", "corrupt.json"), "{}\n");
    await writeTextFile(join(cwd, ".bbg", "custom-cache", "value.json"), "{}\n");

    const result = await runUninstall({ cwd, yes: true });

    expect(result.deleted).toContain(".bbg/telemetry.db");
    expect(result.deleted).toContain(".bbg/quarantine");
    expect(result.deleted).toContain(".bbg/custom-cache");
    expect(await exists(join(cwd, ".bbg"))).toBe(false);
  });

  it("removes a stale preserved init info cache by default", { timeout: 30000 }, async () => {
    const cwd = await makeTempDir();
    await writeTextFile(
      join(cwd, ".bbg-init-info.json"),
      '{\n  "version": 1,\n  "savedAt": "2026-04-24T00:00:00.000Z",\n  "source": "bbg uninstall --keep-init-info",\n  "initInfo": {\n    "projectName": "cached",\n    "projectDescription": "cached",\n    "repos": [],\n    "governance": {\n      "riskThresholds": {\n        "high": { "grade": "A+", "minScore": 99 },\n        "medium": { "grade": "A", "minScore": 95 },\n        "low": { "grade": "B", "minScore": 85 }\n      },\n      "enableRedTeam": true,\n      "enableCrossAudit": true\n    },\n    "context": {}\n  }\n}\n',
    );

    const result = await runUninstall({ cwd, yes: true });

    expect(result.deleted).toContain(".bbg-init-info.json");
    expect(await exists(join(cwd, ".bbg-init-info.json"))).toBe(false);
  });

  it("allows re-initialization after uninstall", { timeout: 45000 }, async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });
    await runUninstall({ cwd, yes: true });

    const result = await runInit({ cwd, yes: true, dryRun: false });

    expect(result.createdFiles).toContain(join(cwd, ".bbg", "config.json"));
    expect(await exists(join(cwd, ".bbg", "config.json"))).toBe(true);
  });
});
