import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const analyzerState = vi.hoisted(() => ({
  analyzeRepo: vi.fn(),
}));

const doctorState = vi.hoisted(() => ({
  runDoctor: vi.fn(),
}));

const workflowState = vi.hoisted(() => ({
  runWorkflowCommand: vi.fn(),
}));

const taskEnvState = vi.hoisted(() => ({
  runTaskEnvCommand: vi.fn(),
}));

const observeState = vi.hoisted(() => ({
  runObserveCommand: vi.fn(),
}));

const hermesState = vi.hoisted(() => ({
  runHermesCommand: vi.fn(),
}));

const runnerState = vi.hoisted(() => ({
  launchConfiguredAgentRunner: vi.fn(),
}));

vi.mock("../../src/analyzers/index.js", () => ({
  analyzeRepo: analyzerState.analyzeRepo,
}));

vi.mock("../../src/commands/doctor.js", () => ({
  runDoctor: doctorState.runDoctor,
}));

vi.mock("../../src/commands/workflow.js", () => ({
  runWorkflowCommand: workflowState.runWorkflowCommand,
}));

vi.mock("../../src/commands/task-env.js", () => ({
  runTaskEnvCommand: taskEnvState.runTaskEnvCommand,
}));

vi.mock("../../src/commands/observe.js", () => ({
  runObserveCommand: observeState.runObserveCommand,
}));

vi.mock("../../src/commands/hermes.js", () => ({
  runHermesCommand: hermesState.runHermesCommand,
}));

vi.mock("../../src/runtime/agent-runner.js", () => ({
  launchConfiguredAgentRunner: runnerState.launchConfiguredAgentRunner,
}));

import { parseConfig, serializeConfig } from "../../src/config/read-write.js";
import { runAnalyzeCommand } from "../../src/commands/analyze.js";
import { runInit } from "../../src/commands/init.js";
import { runResumeCommand } from "../../src/commands/resume.js";
import { runStartCommand } from "../../src/commands/start.js";
import { runStatusCommand } from "../../src/commands/status.js";
import { writeTextFile } from "../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-primary-flow-"));
  tempDirs.push(dir);
  return dir;
}

describe("target project primary flow", () => {
  beforeEach(() => {
    analyzerState.analyzeRepo.mockReset();
    doctorState.runDoctor.mockReset();
    workflowState.runWorkflowCommand.mockReset();
    taskEnvState.runTaskEnvCommand.mockReset();
    observeState.runObserveCommand.mockReset();
    hermesState.runHermesCommand.mockReset();
    runnerState.launchConfiguredAgentRunner.mockReset();

    analyzerState.analyzeRepo.mockResolvedValue({
      stack: {
        language: "typescript",
        framework: "node",
        buildTool: "npm",
        testFramework: "vitest",
        packageManager: "npm",
      },
      structure: ["src", "tests"],
      deps: ["zod"],
      testing: {
        framework: "vitest",
        hasTestDir: true,
        testPattern: "*.test.ts",
      },
    });
    doctorState.runDoctor.mockResolvedValue({
      ok: true,
      mode: "full",
      checks: [],
      errors: [],
      warnings: [],
      info: [],
      exitCode: 0,
      fixesApplied: [],
    });
    workflowState.runWorkflowCommand.mockResolvedValue({
      kind: "plan",
      task: "Fix checkout timeout",
      commandSpecPath: "commands/start.md",
      summary: "Fix the checkout timeout issue with regression coverage.",
      references: ["AGENTS.md", "RULES.md"],
      hermesRecommendations: ["Look up similar checkout incidents before coding."],
      decisions: {
        taskEnv: { decision: "required", reasons: ["multi-file-change"] },
        observe: { decision: "required", reasons: ["runtime-evidence-useful"] },
        tdd: { decision: "required", reasons: ["bug-fix"] },
        security: { decision: "not-required", reasons: [] },
        loop: { decision: "optional", reasons: ["repeated-verification-likely"] },
        hermesQuery: { decision: "recommended", reasons: ["possible-repeat-incident"] },
      },
      nextActions: ["implement", "add-tests", "verify"],
    });
    taskEnvState.runTaskEnvCommand.mockResolvedValue({
      mode: "start",
      env: {
        version: 1,
        id: "fix-checkout-timeout",
        task: "Fix checkout timeout",
        slug: "fix-checkout-timeout",
        createdAt: "2026-04-17T00:00:00.000Z",
        updatedAt: "2026-04-17T00:00:00.000Z",
        gitRoot: ".",
        baseRef: "HEAD",
        worktreePath: ".bbg/task-envs/fix-checkout-timeout/worktree",
        artifactRoot: ".bbg/task-envs/fix-checkout-timeout/artifacts",
        uiArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/ui",
        logArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/logs",
        metricArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/metrics",
        traceArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/traces",
        notesPath: ".bbg/task-envs/fix-checkout-timeout/notes.md",
        status: "active",
      },
    });
    observeState.runObserveCommand.mockResolvedValue({
      mode: "start",
      session: {
        version: 1,
        id: "fix-checkout-timeout",
        topic: "Fix checkout timeout",
        createdAt: "2026-04-17T00:00:00.000Z",
        updatedAt: "2026-04-17T00:00:00.000Z",
        envId: "fix-checkout-timeout",
        rootPath: ".bbg/task-envs/fix-checkout-timeout/artifacts",
        uiArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/ui",
        logArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/logs",
        metricArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/metrics",
        traceArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/traces",
        notesPath: ".bbg/task-envs/fix-checkout-timeout/observations/fix-checkout-timeout/notes.md",
      },
    });
    hermesState.runHermesCommand.mockResolvedValue({
      kind: "query",
      topic: "Fix checkout timeout",
      commandSpecPath: "commands/hermes-query.md",
      summary: "Similar checkout incidents found in Hermes.",
      references: ["commands/hermes-query.md"],
    });
    runnerState.launchConfiguredAgentRunner.mockResolvedValue(null);
  });

  afterEach(async () => {
    delete process.env.BBG_CURRENT_TOOL;
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("supports init -> analyze -> start -> resume -> status as the primary target-project path", async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });

    const configPath = join(cwd, ".bbg", "config.json");
    const config = parseConfig(await readFile(configPath, "utf8"));
    config.repos = [
      {
        name: "app",
        gitUrl: "https://example.com/app.git",
        branch: "main",
        type: "backend",
        stack: {
          language: "typescript",
          framework: "node",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
        },
        description: "application service",
      },
    ];
    config.updatedAt = "2026-04-17T00:00:00.000Z";
    await writeTextFile(configPath, serializeConfig(config));
    await mkdir(join(cwd, "app"), { recursive: true });

    const analyze = await runAnalyzeCommand({ cwd });
    expect(analyze.analyzedRepos).toEqual(["app"]);
    expect(analyze.repositoryDocs).toContain("docs/repositories/app.md");

    process.env.BBG_CURRENT_TOOL = "claude";
    const started = await runStartCommand({ cwd, task: "Fix checkout timeout" });
    expect(started.session.taskId).toBe("fix-checkout-timeout");
    expect(started.session.status).toBe("implementing");
    expect(started.session.tool).toBe("claude");
    expect(started.context.hermesQuery).toEqual({
      executed: true,
      strategy: "default",
      topic: "Fix checkout timeout",
      summary: "Similar checkout incidents found in Hermes.",
      commandSpecPath: "commands/hermes-query.md",
      references: ["commands/hermes-query.md"],
      influencedWorkflow: true,
      influencedRecovery: false,
      influencedVerification: false,
    });

    const resumed = await runResumeCommand({ cwd, taskId: started.session.taskId });
    expect(resumed.session.entrypoint).toBe("resume");
    expect(resumed.session.taskId).toBe(started.session.taskId);
    expect(resumed.context.hermesQuery.summary).toBe("Similar checkout incidents found in Hermes.");

    const status = await runStatusCommand({ cwd });
    expect(status.analyze.runId).toBe(analyze.runId);
    expect(status.tasks).toEqual([
      expect.objectContaining({
        taskId: "fix-checkout-timeout",
      }),
    ]);
  });

  it("marks the task blocked when terminal start cannot launch the configured runner", async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });

    const configPath = join(cwd, ".bbg", "config.json");
    const config = parseConfig(await readFile(configPath, "utf8"));
    config.repos = [
      {
        name: "app",
        gitUrl: "https://example.com/app.git",
        branch: "main",
        type: "backend",
        stack: {
          language: "typescript",
          framework: "node",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
        },
        description: "application service",
      },
    ];
    config.agentRunner = {
      defaultTool: "claude",
      tools: {
        claude: {
          type: "cli",
          command: "claude",
          args: ["resume", "{taskId}"],
          detached: true,
        },
      },
    };
    config.updatedAt = "2026-04-17T00:00:00.000Z";
    await writeTextFile(configPath, serializeConfig(config));
    await mkdir(join(cwd, "app"), { recursive: true });
    runnerState.launchConfiguredAgentRunner.mockRejectedValue(new Error("claude missing"));

    await runAnalyzeCommand({ cwd });
    const started = await runStartCommand({ cwd, task: "Fix checkout timeout" });

    expect(started.session.status).toBe("blocked");
    expect(started.session.blockedReason).toBe("runner launch failed");
    expect(started.session.lastError).toContain("claude missing");

    const status = await runStatusCommand({ cwd });
    expect(status.tasks).toEqual([
      expect.objectContaining({
        taskId: "fix-checkout-timeout",
        status: "blocked",
        blockedReason: "runner launch failed",
      }),
    ]);
  });

  it("rejects resume for a completed task", async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });

    const configPath = join(cwd, ".bbg", "config.json");
    const config = parseConfig(await readFile(configPath, "utf8"));
    config.repos = [
      {
        name: "app",
        gitUrl: "https://example.com/app.git",
        branch: "main",
        type: "backend",
        stack: {
          language: "typescript",
          framework: "node",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
        },
        description: "application service",
      },
    ];
    config.updatedAt = "2026-04-17T00:00:00.000Z";
    await writeTextFile(configPath, serializeConfig(config));
    await mkdir(join(cwd, "app"), { recursive: true });

    process.env.BBG_CURRENT_TOOL = "claude";
    await runAnalyzeCommand({ cwd });
    const started = await runStartCommand({ cwd, task: "Fix checkout timeout" });

    const sessionPath = join(cwd, ".bbg", "tasks", started.session.taskId, "session.json");
    const completedSession = {
      ...started.session,
      status: "completed",
      currentStep: "complete",
      updatedAt: "2026-04-17T00:10:00.000Z",
    };
    await writeTextFile(sessionPath, JSON.stringify(completedSession, null, 2));

    await expect(runResumeCommand({ cwd, taskId: started.session.taskId }))
      .rejects
      .toThrow(`Task '${started.session.taskId}' is already completed and cannot be resumed.`);
  });
});
