import { access, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { serializeConfig } from "../../../src/config/read-write.js";
import type { BbgConfig } from "../../../src/config/schema.js";
import { writeTextFile } from "../../../src/utils/fs.js";
import { runDoctor } from "../../../src/commands/doctor.js";

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
}

async function createGovernanceWorkspaceOnly(cwd: string): Promise<void> {
  const config = buildConfig();
  await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig(config));
  await writeTextFile(join(cwd, "AGENTS.md"), "# Root agents\n");
  await writeTextFile(join(cwd, "README.md"), "# Root readme\n");
  await writeTextFile(join(cwd, ".gitignore"), "node_modules/\n");
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
