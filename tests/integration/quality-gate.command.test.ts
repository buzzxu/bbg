import { mkdtemp, readFile, rm } from "node:fs/promises";
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

import { runQualityGateCommand } from "../../src/commands/quality-gate.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-quality-gate-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  const runtime = buildDefaultRuntimeConfig();
  await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
    version: "0.1.0",
    projectName: "bbg-project",
    projectDescription: "quality gate command test",
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

describe("quality-gate command", () => {
  beforeEach(() => {
    execaState.execa.mockReset();
    execaState.execa.mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 });
  });

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("runs the runtime gate and persists command history", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runQualityGateCommand({ cwd });

    expect(result.ok).toBe(true);

    const evaluation = JSON.parse(await readFile(join(cwd, ".bbg", "evaluations", "history.json"), "utf8")) as {
      runs: Array<{ command: string }>;
    };
    expect(evaluation.runs.at(-1)).toEqual(expect.objectContaining({ command: "quality-gate" }));

    const telemetry = JSON.parse(await readFile(join(cwd, ".bbg", "telemetry", "events.json"), "utf8")) as {
      events: Array<{ type: string }>;
    };
    expect(telemetry.events.at(-1)).toEqual(expect.objectContaining({ type: "runtime.command.completed" }));
  });

  it("uses configured runtime commands instead of root npm defaults", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "quality gate configured command test",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      repos: [
        {
          name: "service-a",
          gitUrl: "https://example.com/service-a.git",
          branch: "main",
          type: "backend",
          description: "python service",
          stack: {
            language: "python",
            framework: "fastapi",
            buildTool: "poetry",
            testFramework: "pytest",
            packageManager: "poetry",
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
          build: { command: "python", args: ["-m", "build"], cwd: "service-a" },
          typecheck: { command: "python", args: ["-m", "mypy", "."], cwd: "service-a" },
          tests: { command: "python", args: ["-m", "pytest"], cwd: "service-a" },
          lint: { command: "python", args: ["-m", "ruff", "check", "."], cwd: "service-a" },
        },
      },
    }));
    await writeTextFile(join(cwd, "README.md"), "# Workspace\n");

    const result = await runQualityGateCommand({ cwd });

    expect(result.ok).toBe(true);
    expect(execaState.execa).toHaveBeenNthCalledWith(1, "python", ["-m", "build"], expect.objectContaining({ cwd: join(cwd, "service-a"), reject: false }));
    expect(execaState.execa).toHaveBeenNthCalledWith(2, "python", ["-m", "mypy", "."], expect.objectContaining({ cwd: join(cwd, "service-a"), reject: false }));
    expect(execaState.execa).toHaveBeenNthCalledWith(3, "python", ["-m", "pytest"], expect.objectContaining({ cwd: join(cwd, "service-a"), reject: false }));
    expect(execaState.execa).toHaveBeenNthCalledWith(4, "python", ["-m", "ruff", "check", "."], expect.objectContaining({ cwd: join(cwd, "service-a"), reject: false }));
  });

  it("rejects runtime command cwd values that escape the workspace", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "quality gate invalid cwd test",
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

    await expect(runQualityGateCommand({ cwd })).rejects.toThrow("Config JSON does not match required shape");
    expect(execaState.execa).not.toHaveBeenCalled();
  });

  it("blocks the command when local policy denies it", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "policy", "decisions.json"),
      `${JSON.stringify({
        version: 1,
        commands: {
          "quality-gate": {
            allowed: false,
            requiredApproval: false,
            reason: "Window frozen for runtime checks.",
          },
        },
      }, null, 2)}\n`,
    );

    await expect(runQualityGateCommand({ cwd })).rejects.toThrow(
      "Policy blocked 'quality-gate': Window frozen for runtime checks.",
    );
    expect(execaState.execa).not.toHaveBeenCalled();
  });

  it("does not fail on placeholder secrets committed in docs and fixtures", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(join(cwd, "docs", "security.md"), 'Use token = "sk_live_docs_placeholder" in examples.\n');
    await writeTextFile(join(cwd, "tests", "fixtures", "runtime.ts"), 'export const secret = "sk_live_fixture_placeholder";\n');

    const result = await runQualityGateCommand({ cwd });

    expect(result.ok).toBe(true);
    expect(result.checks.security.ok).toBe(true);
    expect(result.checks.security.stdout).toBe("No secret-like content detected.");
  });
});
