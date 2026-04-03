import { mkdtemp, readFile, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serializeConfig } from "../../src/config/read-write.js";
import { buildDefaultRuntimeConfig } from "../../src/runtime/schema.js";
import { writeTextFile } from "../../src/utils/fs.js";

const execaState = vi.hoisted(() => ({
  execa: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: execaState.execa,
}));

import { runCheckpointCommand } from "../../src/commands/checkpoint.js";
import { runVerifyCommand } from "../../src/commands/verify.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-verify-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  const runtime = buildDefaultRuntimeConfig();
  await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
    version: "0.1.0",
    projectName: "bbg-project",
    projectDescription: "verify command test",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    repos: [],
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
      ...runtime,
      telemetry: {
        ...runtime.telemetry,
        enabled: true,
      },
    },
  }));
  await writeTextFile(join(cwd, "README.md"), "# Workspace\n");
}

describe("verify command", () => {
  beforeEach(() => {
    execaState.execa.mockReset();
    execaState.execa.mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 });
  });

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("compares current checks and file hashes against a checkpoint", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await runCheckpointCommand({ cwd, name: "baseline" });
    await writeTextFile(join(cwd, "README.md"), "# Workspace changed\n");

    const result = await runVerifyCommand({ cwd, checkpoint: "baseline" });

    expect(result.ok).toBe(false);
    expect(result.checks.build.ok).toBe(true);
    expect(result.checks.typecheck.ok).toBe(true);
    expect(result.checks.tests.ok).toBe(true);
    expect(result.checks.lint.ok).toBe(true);
    expect(result.comparisons.build.matchesCheckpoint).toBe(true);
    expect(result.comparisons.lint.matchesCheckpoint).toBe(true);
    expect(result.changedFiles).toContain("README.md");
  });

  it("uses configured runtime commands during verification", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "verify configured command test",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      repos: [
        {
          name: "service-a",
          gitUrl: "https://example.com/service-a.git",
          branch: "main",
          type: "backend",
          description: "rust service",
          stack: {
            language: "rust",
            framework: "axum",
            buildTool: "cargo",
            testFramework: "cargo-test",
            packageManager: "cargo",
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
      runtime: {
        ...runtime,
        commands: {
          build: { command: "cargo", args: ["build"], cwd: "service-a" },
          typecheck: { command: "cargo", args: ["check"], cwd: "service-a" },
          tests: { command: "cargo", args: ["test"], cwd: "service-a" },
          lint: { command: "cargo", args: ["clippy"], cwd: "service-a" },
        },
      },
    }));
    await writeTextFile(join(cwd, "README.md"), "# Workspace\n");
    await runCheckpointCommand({ cwd, name: "baseline" });
    execaState.execa.mockClear();

    const result = await runVerifyCommand({ cwd, checkpoint: "baseline" });

    expect(result.ok).toBe(true);
    expect(execaState.execa).toHaveBeenNthCalledWith(1, "cargo", ["build"], expect.objectContaining({ cwd: join(cwd, "service-a"), reject: false }));
    expect(execaState.execa).toHaveBeenNthCalledWith(2, "cargo", ["test"], expect.objectContaining({ cwd: join(cwd, "service-a"), reject: false }));
    expect(execaState.execa).toHaveBeenNthCalledWith(3, "cargo", ["check"], expect.objectContaining({ cwd: join(cwd, "service-a"), reject: false }));
    expect(execaState.execa).toHaveBeenNthCalledWith(4, "cargo", ["clippy"], expect.objectContaining({ cwd: join(cwd, "service-a"), reject: false }));
  });

  it("rejects runtime command cwd values that escape the workspace", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "verify invalid cwd test",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      repos: [],
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
        ...runtime,
        commands: {
          build: { command: "npm", args: ["run", "build"], cwd: "../escape" },
        },
      },
    }));

    await expect(runVerifyCommand({ cwd, checkpoint: "baseline" })).rejects.toThrow("Config JSON does not match required shape");
    expect(execaState.execa).not.toHaveBeenCalled();
  });

  it("fails when lint status no longer matches the checkpoint", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    execaState.execa.mockResolvedValueOnce({ stdout: "ok", stderr: "", exitCode: 0 });
    execaState.execa.mockResolvedValueOnce({ stdout: "ok", stderr: "", exitCode: 0 });
    execaState.execa.mockResolvedValueOnce({ stdout: "ok", stderr: "", exitCode: 0 });
    execaState.execa.mockResolvedValueOnce({ stdout: "ok", stderr: "", exitCode: 0 });
    await runCheckpointCommand({ cwd, name: "baseline" });

    execaState.execa.mockReset();
    execaState.execa.mockResolvedValueOnce({ stdout: "ok", stderr: "", exitCode: 0 });
    execaState.execa.mockResolvedValueOnce({ stdout: "ok", stderr: "", exitCode: 0 });
    execaState.execa.mockResolvedValueOnce({ stdout: "ok", stderr: "", exitCode: 0 });
    execaState.execa.mockResolvedValueOnce({ stdout: "lint failed", stderr: "lint failed", exitCode: 1 });

    const result = await runVerifyCommand({ cwd, checkpoint: "baseline" });

    expect(result.ok).toBe(false);
    expect(result.checks.lint.ok).toBe(false);
    expect(result.comparisons.lint.matchesCheckpoint).toBe(false);
    expect(result.changedFiles).toEqual([]);
  });

  it("rejects malformed checkpoint contents with a clean error", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(join(cwd, ".bbg", "checkpoints", "broken.json"), JSON.stringify({
      version: 1,
      name: "broken",
      createdAt: "2026-04-01T00:00:00.000Z",
      checks: {
        build: { ok: true, exitCode: 0 },
        tests: { ok: true, exitCode: 0 },
        typecheck: { ok: true, exitCode: 0 },
        lint: true,
      },
      fileHashes: {},
    }));

    await expect(runVerifyCommand({ cwd, checkpoint: "broken" })).rejects.toThrow("Invalid runtime store contents");
  });

  it("errors when a named checkpoint does not exist", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    await expect(runVerifyCommand({ cwd, checkpoint: "missing" })).rejects.toThrow(
      "Checkpoint 'missing' not found. Run `bbg checkpoint --name missing` first.",
    );
  });

  it("rejects blank checkpoint input instead of falling back to the latest checkpoint", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await runCheckpointCommand({ cwd, name: "baseline" });

    await expect(runVerifyCommand({ cwd, checkpoint: "" })).rejects.toThrow("Checkpoint name cannot be blank.");
    await expect(runVerifyCommand({ cwd, checkpoint: "   " })).rejects.toThrow("Checkpoint name cannot be blank.");
  });

  it("rejects explicit checkpoint lookup names that sanitize to empty", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await runCheckpointCommand({ cwd, name: "baseline" });

    await expect(runVerifyCommand({ cwd, checkpoint: "!!!" })).rejects.toThrow("Checkpoint name cannot be empty after sanitization.");
  });

  it("defaults to the newest checkpoint by checkpoint timestamp", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    await runCheckpointCommand({ cwd, name: "z-old-name" });
    const oldPath = join(cwd, ".bbg", "checkpoints", "z-old-name.json");
    const oldCheckpoint = JSON.parse(await readFile(oldPath, "utf8")) as {
      version: number;
      name: string;
      createdAt: string;
      checks: Record<string, { ok: boolean; exitCode: number }>;
      fileHashes: Record<string, string>;
    };
    await writeTextFile(oldPath, `${JSON.stringify({
      ...oldCheckpoint,
      createdAt: "2026-04-01T00:00:00.000Z",
    }, null, 2)}\n`);
    await utimes(oldPath, new Date("2026-04-03T00:00:00.000Z"), new Date("2026-04-03T00:00:00.000Z"));

    await runCheckpointCommand({ cwd, name: "a-new-name" });
    const newPath = join(cwd, ".bbg", "checkpoints", "a-new-name.json");
    const newCheckpoint = JSON.parse(await readFile(newPath, "utf8")) as typeof oldCheckpoint;
    await writeTextFile(newPath, `${JSON.stringify({
      ...newCheckpoint,
      createdAt: "2026-04-02T00:00:00.000Z",
    }, null, 2)}\n`);
    await utimes(newPath, new Date("2026-04-01T00:00:00.000Z"), new Date("2026-04-01T00:00:00.000Z"));

    await writeTextFile(join(cwd, "README.md"), "# Workspace changed\n");

    const result = await runVerifyCommand({ cwd });

    expect(result.checkpointName).toBe("a-new-name");
    expect(result.changedFiles).toContain("README.md");
  });

  it("blocks verification when policy denies it", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "policy", "decisions.json"),
      `${JSON.stringify({
        version: 1,
        commands: {
          verify: {
            allowed: false,
            requiredApproval: false,
            reason: "Verification frozen during incident response.",
          },
        },
      }, null, 2)}\n`,
    );

    await expect(runVerifyCommand({ cwd, checkpoint: "baseline" })).rejects.toThrow(
      "Policy blocked 'verify': Verification frozen during incident response.",
    );
    expect(execaState.execa).not.toHaveBeenCalled();
  });

  it("ignores symlinks to files outside the workspace when comparing checkpoints", async () => {
    const cwd = await makeTempDir();
    const externalDir = await makeTempDir();
    await seedWorkspace(cwd);

    const externalFile = join(externalDir, "outside.txt");
    await writeFile(externalFile, "outside before\n");
    await symlink(externalFile, join(cwd, "outside-link.txt"));

    await runCheckpointCommand({ cwd, name: "baseline" });
    await writeFile(externalFile, "outside after\n");

    const result = await runVerifyCommand({ cwd, checkpoint: "baseline" });

    expect(result.ok).toBe(true);
    expect(result.changedFiles).toEqual([]);
  });
});
