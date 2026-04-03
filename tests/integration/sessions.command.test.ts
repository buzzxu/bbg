import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serializeConfig } from "../../src/config/read-write.js";
import { buildDefaultRuntimeConfig } from "../../src/runtime/schema.js";
import { writeTextFile } from "../../src/utils/fs.js";
import { runQualityGateCommand } from "../../src/commands/quality-gate.js";
import { runSessionsCommand } from "../../src/commands/sessions.js";

const execaState = vi.hoisted(() => ({
  execa: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: execaState.execa,
}));

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-sessions-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  const runtime = buildDefaultRuntimeConfig();
  await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
    version: "0.1.0",
    projectName: "bbg-project",
    projectDescription: "sessions command test",
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
  await writeTextFile(
    join(cwd, ".bbg", "sessions", "history.json"),
    JSON.stringify(
      {
        version: 1,
        sessions: [
          { id: "s1", startedAt: "2026-04-01T00:00:00.000Z", endedAt: "2026-04-01T00:10:00.000Z", commands: 2 },
          { id: "s2", startedAt: "2026-04-01T01:00:00.000Z", endedAt: "2026-04-01T01:20:00.000Z", commands: 5 },
        ],
      },
      null,
      2,
    ) + "\n",
  );
}

describe("sessions command", () => {
  beforeEach(() => {
    execaState.execa.mockReset();
    execaState.execa.mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 });
  });

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("summarizes the latest session against the previous one and records runtime activity", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runSessionsCommand({ cwd });

    expect(result.totalSessions).toBe(2);
    expect(result.latest?.id).toBe("s2");
    expect(result.previous?.id).toBe("s1");
    expect(result.comparison.commandDelta).toBe(3);
    expect(result.comparison.durationDeltaMs).toBe(600000);

    const evaluation = JSON.parse(await readFile(join(cwd, ".bbg", "evaluations", "history.json"), "utf8")) as {
      runs: Array<{ command: string }>;
    };
    expect(evaluation.runs.at(-1)).toEqual(expect.objectContaining({ command: "sessions" }));
  });

  it("reads session summaries from runtime command activity written to session history", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "sessions runtime activity test",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      repos: [
        {
          name: "service-a",
          gitUrl: "https://example.com/service-a.git",
          branch: "main",
          type: "backend",
          description: "typescript service",
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
      runtime: {
        ...runtime,
        telemetry: {
          ...runtime.telemetry,
          enabled: true,
        },
        commands: {
          build: { command: "node", args: ["-e", "process.exit(0)"], cwd: "service-a" },
          typecheck: { command: "node", args: ["-e", "process.exit(0)"], cwd: "service-a" },
          tests: { command: "node", args: ["-e", "process.exit(0)"], cwd: "service-a" },
          lint: { command: "node", args: ["-e", "process.exit(0)"], cwd: "service-a" },
        },
      },
    }));
    await writeTextFile(join(cwd, "README.md"), "# Workspace\n");

    await runQualityGateCommand({ cwd });
    const result = await runSessionsCommand({ cwd });

    expect(result.totalSessions).toBe(1);
    expect(result.latest?.commands).toBe(1);

    const history = JSON.parse(await readFile(join(cwd, ".bbg", "sessions", "history.json"), "utf8")) as {
      sessions: Array<{ commands: number }>;
    };
    expect(history.sessions).toHaveLength(1);
    expect(history.sessions[0]).toEqual(expect.objectContaining({ commands: 2 }));
  });

  it("does not regenerate repo map and task bundles when runtime context is disabled", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "sessions command disabled context test",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      repos: [
        {
          name: "repo-a",
          gitUrl: "https://example.com/repo-a.git",
          branch: "main",
          type: "frontend-web",
          description: "repo a",
          stack: {
            language: "typescript",
            framework: "react",
            buildTool: "vite",
            testFramework: "vitest",
            packageManager: "pnpm",
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
        context: {
          ...runtime.context,
          enabled: false,
        },
      },
    }));
    await writeTextFile(join(cwd, ".bbg", "analysis", "repos", "repo-a.json"), JSON.stringify({
      repoName: "repo-a",
      generatedAt: "2026-04-01T02:00:00.000Z",
      stack: {
        language: "typescript",
        framework: "react",
        buildTool: "vite",
        testFramework: "vitest",
        packageManager: "pnpm",
      },
      structure: ["has-src-components"],
      deps: ["react"],
      testing: {
        framework: "vitest",
        hasTestDir: true,
        testPattern: "*.test.ts",
      },
    }, null, 2) + "\n");
    await writeTextFile(
      join(cwd, ".bbg", "sessions", "history.json"),
      JSON.stringify({ version: 1, sessions: [{ id: "s1", startedAt: "2026-04-01T00:00:00.000Z", commands: 1 }] }, null, 2) + "\n",
    );

    await runSessionsCommand({ cwd });

    await expect(readFile(join(cwd, ".bbg", "context", "repo-map.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(join(cwd, ".bbg", "context", "task-bundles.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("writes the canonical repo map even when runtime repoMapFile is customized", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "sessions command custom repo map path test",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      repos: [
        {
          name: "repo-a",
          gitUrl: "https://example.com/repo-a.git",
          branch: "main",
          type: "frontend-web",
          description: "repo a",
          stack: {
            language: "typescript",
            framework: "react",
            buildTool: "vite",
            testFramework: "vitest",
            packageManager: "pnpm",
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
        context: {
          ...runtime.context,
          repoMapFile: ".bbg/runtime/custom-repo-map.json",
        },
      },
    }));
    await writeTextFile(join(cwd, ".bbg", "analysis", "repos", "repo-a.json"), JSON.stringify({
      repoName: "repo-a",
      generatedAt: "2026-04-01T02:00:00.000Z",
      stack: {
        language: "typescript",
        framework: "react",
        buildTool: "vite",
        testFramework: "vitest",
        packageManager: "pnpm",
      },
      structure: ["has-src-components"],
      deps: ["react"],
      testing: {
        framework: "vitest",
        hasTestDir: true,
        testPattern: "*.test.ts",
      },
    }, null, 2) + "\n");
    await writeTextFile(
      join(cwd, ".bbg", "sessions", "history.json"),
      JSON.stringify({ version: 1, sessions: [{ id: "s1", startedAt: "2026-04-01T00:00:00.000Z", commands: 1 }] }, null, 2) + "\n",
    );

    await runSessionsCommand({ cwd });

    const repoMap = JSON.parse(await readFile(join(cwd, ".bbg", "context", "repo-map.json"), "utf8")) as {
      repos: Array<{ name: string }>;
    };

    expect(repoMap.repos).toEqual([expect.objectContaining({ name: "repo-a" })]);
  });
});
