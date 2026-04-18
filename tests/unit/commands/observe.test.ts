import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readTextFile, writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-observe-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedConfig(cwd: string): Promise<void> {
  await writeTextFile(
    join(cwd, ".bbg", "config.json"),
    `${JSON.stringify(
      {
        version: "1.0.0",
        projectName: "test",
        projectDescription: "test",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        repos: [],
        governance: {
          riskThresholds: {
            high: { grade: "A", minScore: 90 },
            medium: { grade: "B", minScore: 70 },
            low: { grade: "C", minScore: 50 },
          },
          enableRedTeam: false,
          enableCrossAudit: false,
        },
        context: {},
      },
      null,
      2,
    )}\n`,
  );
}

describe("observe command", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("creates and reports an observation session", async () => {
    const cwd = await makeTempDir();
    await seedConfig(cwd);

    const { runObserveCommand } = await import("../../../src/commands/observe.js");
    const started = await runObserveCommand({ cwd, mode: "start", topic: "Checkout latency" });
    expect(started.session?.id).toBe("checkout-latency");

    await writeFile(join(cwd, ".bbg", "observations", "checkout-latency", "ui", "screen.png"), "");
    const report = await runObserveCommand({ cwd, mode: "report", id: "checkout-latency" });
    expect(report.report?.uiArtifacts).toBe(1);
    expect(report.report?.evidenceKinds).toEqual(["ui"]);
    expect(report.report?.readiness).toBe("partial");
  });

  it("isolates task-env observation notes from task-env notes", async () => {
    const cwd = await makeTempDir();
    await seedConfig(cwd);
    await mkdir(join(cwd, ".bbg", "task-envs", "checkout-debug", "artifacts", "ui"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "checkout-debug", "artifacts", "logs"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "checkout-debug", "artifacts", "metrics"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "checkout-debug", "artifacts", "traces"), { recursive: true });
    await writeTextFile(join(cwd, ".bbg", "task-envs", "checkout-debug", "notes.md"), "# Task Environment Notes\n");
    await writeTextFile(
      join(cwd, ".bbg", "task-envs", "checkout-debug", "manifest.json"),
      `${JSON.stringify({
        version: 1,
        id: "checkout-debug",
        task: "checkout debug",
        slug: "checkout-debug",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        gitRoot: ".",
        baseRef: "HEAD",
        worktreePath: ".bbg/task-envs/checkout-debug/worktree",
        artifactRoot: ".bbg/task-envs/checkout-debug/artifacts",
        uiArtifactsPath: ".bbg/task-envs/checkout-debug/artifacts/ui",
        logArtifactsPath: ".bbg/task-envs/checkout-debug/artifacts/logs",
        metricArtifactsPath: ".bbg/task-envs/checkout-debug/artifacts/metrics",
        traceArtifactsPath: ".bbg/task-envs/checkout-debug/artifacts/traces",
        notesPath: ".bbg/task-envs/checkout-debug/notes.md",
        status: "active",
      }, null, 2)}\n`,
    );

    const { runObserveCommand } = await import("../../../src/commands/observe.js");
    const started = await runObserveCommand({
      cwd,
      mode: "start",
      topic: "Checkout latency",
      envId: "checkout-debug",
    });

    expect(started.session?.rootPath).toBe(".bbg/task-envs/checkout-debug/observations/checkout-latency");
    expect(started.session?.notesPath).toBe(".bbg/task-envs/checkout-debug/observations/checkout-latency/notes.md");
    expect(await readTextFile(join(cwd, ".bbg", "task-envs", "checkout-debug", "notes.md"))).toBe("# Task Environment Notes\n");
    expect(
      await readTextFile(join(cwd, ".bbg", "task-envs", "checkout-debug", "observations", "checkout-latency", "notes.md")),
    ).toContain("# Observation Notes");
  });

  it("marks observation summaries as ready when multiple evidence kinds exist", async () => {
    const cwd = await makeTempDir();
    await seedConfig(cwd);

    const { runObserveCommand } = await import("../../../src/commands/observe.js");
    await runObserveCommand({ cwd, mode: "start", topic: "Checkout latency" });

    await writeFile(join(cwd, ".bbg", "observations", "checkout-latency", "ui", "screen.png"), "");
    await writeFile(join(cwd, ".bbg", "observations", "checkout-latency", "logs", "app.log"), "");

    const report = await runObserveCommand({ cwd, mode: "report", id: "checkout-latency" });
    expect(report.report?.evidenceKinds).toEqual(["ui", "logs"]);
    expect(report.report?.totalArtifacts).toBe(2);
    expect(report.report?.readiness).toBe("ready");
  });
});
