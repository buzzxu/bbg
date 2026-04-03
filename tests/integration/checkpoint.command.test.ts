import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
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

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-checkpoint-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  const runtime = buildDefaultRuntimeConfig();
  await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
    version: "0.1.0",
    projectName: "bbg-project",
    projectDescription: "checkpoint command test",
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

describe("checkpoint command", () => {
  beforeEach(() => {
    execaState.execa.mockReset();
    execaState.execa.mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 });
  });

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("writes a checkpoint with hashes and runtime records", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runCheckpointCommand({ cwd, name: "baseline" });

    expect(result.ok).toBe(true);
    expect(result.checkpointFile).toBe(".bbg/checkpoints/baseline.json");

    const checkpoint = JSON.parse(await readFile(join(cwd, ".bbg", "checkpoints", "baseline.json"), "utf8")) as {
      fileHashes: Record<string, string>;
      checks: { build: { ok: boolean }; tests: { ok: boolean }; typecheck: { ok: boolean }; lint: { ok: boolean } };
    };
    expect(checkpoint.fileHashes["README.md"]).toBeTruthy();
    expect(checkpoint.checks.build.ok).toBe(true);
    expect(checkpoint.checks.tests.ok).toBe(true);
    expect(checkpoint.checks.typecheck.ok).toBe(true);
    expect(checkpoint.checks.lint.ok).toBe(true);

    const telemetry = JSON.parse(await readFile(join(cwd, ".bbg", "telemetry", "events.json"), "utf8")) as {
      events: Array<{ details: { command?: string } }>;
    };
    expect(telemetry.events.at(-1)).toEqual(expect.objectContaining({ details: expect.objectContaining({ command: "checkpoint" }) }));
  });

  it("uses configured runtime commands when creating checkpoints", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "checkpoint configured command test",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      repos: [
        {
          name: "service-a",
          gitUrl: "https://example.com/service-a.git",
          branch: "main",
          type: "backend",
          description: "go service",
          stack: {
            language: "go",
            framework: "gin",
            buildTool: "go",
            testFramework: "go-test",
            packageManager: "go",
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
          build: { command: "go", args: ["build", "./..."], cwd: "service-a" },
          typecheck: { command: "go", args: ["test", "./..."], cwd: "service-a" },
          tests: { command: "go", args: ["test", "./..."], cwd: "service-a" },
          lint: { command: "golangci-lint", args: ["run"], cwd: "service-a" },
        },
      },
    }));
    await writeTextFile(join(cwd, "README.md"), "# Workspace\n");

    const result = await runCheckpointCommand({ cwd, name: "baseline" });

    expect(result.ok).toBe(true);
    expect(execaState.execa).toHaveBeenNthCalledWith(1, "go", ["build", "./..."], expect.objectContaining({ cwd: join(cwd, "service-a"), reject: false }));
    expect(execaState.execa).toHaveBeenNthCalledWith(4, "golangci-lint", ["run"], expect.objectContaining({ cwd: join(cwd, "service-a"), reject: false }));
  });

  it("rejects runtime command cwd values that escape the workspace", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "checkpoint invalid cwd test",
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

    await expect(runCheckpointCommand({ cwd, name: "baseline" })).rejects.toThrow("Config JSON does not match required shape");
    expect(execaState.execa).not.toHaveBeenCalled();
  });

  it("hashes checkpointed files from raw bytes", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    const binaryPath = join(cwd, "fixtures", "latin1.bin");
    const bytes = Buffer.from([0x63, 0x61, 0x66, 0xe9]);
    await mkdir(join(cwd, "fixtures"), { recursive: true });
    await writeFile(binaryPath, bytes);

    await runCheckpointCommand({ cwd, name: "binary" });

    const checkpoint = JSON.parse(await readFile(join(cwd, ".bbg", "checkpoints", "binary.json"), "utf8")) as {
      fileHashes: Record<string, string>;
    };
    expect(checkpoint.fileHashes["fixtures/latin1.bin"]).toBe(createHash("sha256").update(bytes).digest("hex"));
  });

  it("rejects blank checkpoint names instead of defaulting them", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    await expect(runCheckpointCommand({ cwd, name: "" })).rejects.toThrow("Checkpoint name cannot be blank.");
    await expect(runCheckpointCommand({ cwd, name: "   " })).rejects.toThrow("Checkpoint name cannot be blank.");
    expect(execaState.execa).not.toHaveBeenCalled();
  });

  it("rejects explicit checkpoint names that sanitize to empty before checks or hashing", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await symlink(join(cwd, "missing.bin"), join(cwd, "broken.bin"));

    await expect(runCheckpointCommand({ cwd, name: "!!!" })).rejects.toThrow("Checkpoint name cannot be empty after sanitization.");
    expect(execaState.execa).not.toHaveBeenCalled();
  });

  it("blocks checkpoint creation when policy requires approval", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "policy", "decisions.json"),
      `${JSON.stringify({
        version: 1,
        commands: {
          checkpoint: {
            allowed: true,
            requiredApproval: true,
            reason: "Checkpoint approval required.",
          },
        },
      }, null, 2)}\n`,
    );

    await expect(runCheckpointCommand({ cwd, name: "baseline" })).rejects.toThrow(
      "Policy requires approval for 'checkpoint': Checkpoint approval required.",
    );
    expect(execaState.execa).not.toHaveBeenCalled();
  });

  it("ignores symlinks to files outside the workspace when hashing", async () => {
    const cwd = await makeTempDir();
    const externalDir = await makeTempDir();
    await seedWorkspace(cwd);

    const externalFile = join(externalDir, "outside.txt");
    await writeFile(externalFile, "outside workspace\n");
    await symlink(externalFile, join(cwd, "outside-link.txt"));

    await runCheckpointCommand({ cwd, name: "baseline" });

    const checkpoint = JSON.parse(await readFile(join(cwd, ".bbg", "checkpoints", "baseline.json"), "utf8")) as {
      fileHashes: Record<string, string>;
    };
    expect(checkpoint.fileHashes).not.toHaveProperty("outside-link.txt");
  });
});
