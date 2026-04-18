import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readTextFile, writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

const workflowState = vi.hoisted(() => ({ runWorkflowCommand: vi.fn() }));
const taskEnvState = vi.hoisted(() => ({ runTaskEnvCommand: vi.fn() }));
const observeState = vi.hoisted(() => ({ runObserveCommand: vi.fn() }));
const hermesState = vi.hoisted(() => ({ runHermesCommand: vi.fn() }));
const runnerState = vi.hoisted(() => ({ launchConfiguredAgentRunner: vi.fn() }));

vi.mock("../../../src/commands/workflow.js", () => ({
  runWorkflowCommand: workflowState.runWorkflowCommand,
}));
vi.mock("../../../src/commands/task-env.js", () => ({
  runTaskEnvCommand: taskEnvState.runTaskEnvCommand,
}));
vi.mock("../../../src/commands/observe.js", () => ({
  runObserveCommand: observeState.runObserveCommand,
}));
vi.mock("../../../src/commands/hermes.js", () => ({
  runHermesCommand: hermesState.runHermesCommand,
}));
vi.mock("../../../src/runtime/agent-runner.js", () => ({
  launchConfiguredAgentRunner: runnerState.launchConfiguredAgentRunner,
}));

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-tasks-runtime-"));
  tempDirs.push(dir);
  return dir;
}

async function initializeWorkspace(cwd: string): Promise<void> {
  await writeTextFile(
    join(cwd, ".bbg", "config.json"),
    JSON.stringify({
      version: "1.0.0",
      projectName: "demo",
      projectDescription: "demo project",
      createdAt: "2026-04-17T16:00:00.000Z",
      updatedAt: "2026-04-17T16:00:00.000Z",
      repos: [{
        name: "app",
        gitUrl: "git@example.com:demo/app.git",
        branch: "main",
        type: "backend",
        stack: {
          language: "typescript",
          framework: "node",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
        },
        description: "demo app",
      }],
      governance: {
        riskThresholds: {
          high: { grade: "A", minScore: 90 },
          medium: { grade: "B", minScore: 75 },
          low: { grade: "C", minScore: 60 },
        },
        enableRedTeam: false,
        enableCrossAudit: false,
      },
      context: {},
    }),
  );
}

describe("tasks runtime", () => {
  beforeEach(() => {
    vi.resetModules();
    workflowState.runWorkflowCommand.mockReset();
    taskEnvState.runTaskEnvCommand.mockReset();
    observeState.runObserveCommand.mockReset();
    hermesState.runHermesCommand.mockReset();
    runnerState.launchConfiguredAgentRunner.mockReset();

    workflowState.runWorkflowCommand.mockResolvedValue({
      kind: "plan",
      task: "Fix checkout timeout",
      commandSpecPath: "commands/plan.md",
      summary: "Plan the fix from canonical guidance.",
      references: ["AGENTS.md", "RULES.md"],
      hermesRecommendations: ["If similar work exists, consult Hermes first."],
      decisions: {
        taskEnv: { decision: "required", reasons: ["debug-or-stabilization-task"] },
        observe: { decision: "required", reasons: ["runtime-evidence-useful"] },
        tdd: { decision: "required", reasons: ["testing-or-regression-signal"] },
        security: { decision: "not-required", reasons: [] },
        loop: { decision: "optional", reasons: ["runtime-checks-may-repeat"] },
        hermesQuery: { decision: "recommended", reasons: ["plan-benefits-from-local-history"] },
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
        createdAt: "2026-04-17T16:00:00.000Z",
        updatedAt: "2026-04-17T16:00:00.000Z",
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
        createdAt: "2026-04-17T16:00:00.000Z",
        updatedAt: "2026-04-17T16:00:00.000Z",
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
      summary: "Check similar incidents in Hermes.",
      references: ["commands/hermes-query.md"],
    });
    runnerState.launchConfiguredAgentRunner.mockResolvedValue(null);
  });

  afterEach(async () => {
    delete process.env.BBG_CURRENT_TOOL;
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("creates task session artifacts and auto-runs low-risk preparation steps", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";

    const { startTask, readTaskStatusSummary } = await import("../../../src/runtime/tasks.js");
    const result = await startTask(cwd, "Fix checkout timeout");

    expect(result.session.taskId).toBe("fix-checkout-timeout");
    expect(result.session.status).toBe("implementing");
    expect(result.session.tool).toBe("claude");
    expect(result.session.currentStep).toBe("implement");
    expect(result.session.attemptCount).toBe(1);
    expect(result.session.runner).toEqual({
      mode: "current",
      tool: "claude",
      launched: true,
      command: null,
      args: [],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
    expect(result.session.taskEnvId).toBe("fix-checkout-timeout");
    expect(result.session.observeSessionIds).toEqual(["fix-checkout-timeout"]);
    expect(taskEnvState.runTaskEnvCommand).toHaveBeenCalledWith({
      cwd,
      mode: "start",
      task: "Fix checkout timeout",
    });
    expect(observeState.runObserveCommand).toHaveBeenCalledWith({
      cwd,
      mode: "start",
      topic: "Fix checkout timeout",
      envId: "fix-checkout-timeout",
    });
    expect(hermesState.runHermesCommand).toHaveBeenCalledWith({
      cwd,
      kind: "query",
      topic: "Fix checkout timeout",
    });
    expect(result.context.hermesQuery).toEqual({
      executed: true,
      topic: "Fix checkout timeout",
      summary: "Check similar incidents in Hermes.",
      commandSpecPath: "commands/hermes-query.md",
      references: ["commands/hermes-query.md"],
      strategy: "default",
      influencedWorkflow: true,
      influencedRecovery: false,
      influencedVerification: false,
    });
    expect(result.context.references).toEqual(expect.arrayContaining([
      "AGENTS.md",
      "RULES.md",
      "docs/wiki/index.md",
      "docs/wiki/concepts/fix-checkout-timeout.md",
    ]));
    expect(result.context.taskState).toMatchObject({
      status: "implementing",
      currentStep: "implement",
      taskEnvId: "fix-checkout-timeout",
      observeSessionIds: ["fix-checkout-timeout"],
      nextActions: ["review-hermes-context", "implement", "add-tests", "verify"],
      lastVerification: null,
      lastRecoveryAction: null,
    });
    expect(result.context.recovery).toMatchObject({
      resumeStrategy: null,
      recoveryPlan: null,
    });

    const handoff = await readTextFile(join(cwd, result.handoffPath));
    expect(handoff).toContain("Task ID: fix-checkout-timeout");
    expect(handoff).toContain("## Task State");
    expect(handoff).toContain("- Status: implementing");
    expect(handoff).toContain("- Current Step: implement");
    expect(handoff).toContain("Task Environment: fix-checkout-timeout");
    expect(handoff).toContain("## Hermes Query");
    expect(handoff).toContain("- Executed: yes");
    expect(handoff).toContain("- Summary: Check similar incidents in Hermes.");
    const wikiConcept = await readTextFile(join(cwd, "docs", "wiki", "concepts", "fix-checkout-timeout.md"));
    expect(wikiConcept).toContain("# fix-checkout-timeout Task Knowledge");
    expect(wikiConcept).toContain("- Hermes Summary: Check similar incidents in Hermes.");

    const status = await readTaskStatusSummary(cwd);
    expect(status.tasks).toHaveLength(1);
    expect(status.tasks[0]?.taskId).toBe("fix-checkout-timeout");
  });

  it("resumes an existing task session and refreshes the handoff", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    process.env.BBG_CURRENT_TOOL = "codex";

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.entrypoint).toBe("resume");
    expect(resumed.session.tool).toBe("codex");
    expect(resumed.session.taskId).toBe(created.session.taskId);
    expect(resumed.session.attemptCount).toBe(2);
    expect(resumed.session.currentStep).toBe("implement");
  });

  it("launches the configured default runner when no current tool is active", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    runnerState.launchConfiguredAgentRunner.mockResolvedValue({
      tool: "claude",
      command: "claude",
      args: ["resume", "fix-checkout-timeout"],
    });

    const { startTask } = await import("../../../src/runtime/tasks.js");
    const result = await startTask(cwd, "Fix checkout timeout");

    expect(result.session.status).toBe("implementing");
    expect(result.session.tool).toBe("claude");
    expect(result.session.runner).toEqual({
      mode: "agent",
      tool: "claude",
      launched: true,
      command: "claude",
      args: ["resume", "fix-checkout-timeout"],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
    expect(runnerState.launchConfiguredAgentRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd,
        taskId: "fix-checkout-timeout",
        task: "Fix checkout timeout",
        taskStatus: "prepared",
        currentStep: "handoff",
      }),
    );
  });

  it("blocks resume when task environment recovery fails", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    taskEnvState.runTaskEnvCommand.mockImplementation(async (input: { mode: string }) => {
      if (input.mode === "attach") {
        throw new Error("worktree missing");
      }
      return {
        mode: "repair",
        env: undefined,
      };
    });

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.status).toBe("blocked");
    expect(resumed.session.blockedReason).toBe("task-env recovery failed");
    expect(resumed.session.lastError).toContain("worktree missing");
  });

  it("recovers a blocked task when resumed from the current tool", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify({
        ...created.session,
        status: "blocked",
        blockedReason: "runner launch failed",
        lastError: "launcher unavailable",
        lastErrorAt: "2026-04-17T16:10:00.000Z",
      }, null, 2),
    );
    process.env.BBG_CURRENT_TOOL = "codex";

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.status).toBe("implementing");
    expect(resumed.session.blockedReason).toBeNull();
    expect(resumed.session.lastError).toBeNull();
    expect(resumed.session.runner).toEqual({
      mode: "current",
      tool: "codex",
      launched: true,
      command: null,
      args: [],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
  });

  it("resumes an observation-driven retry into verifying with evidence collection actions", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify({
        ...created.session,
        status: "retrying",
        currentStep: "verify",
        observeSessionIds: [],
        nextActions: ["collect-evidence", "verify"],
        lastError: "observation-empty: no UI or log artifacts were collected",
        lastErrorAt: "2026-04-17T16:10:00.000Z",
      }, null, 2),
    );
    process.env.BBG_CURRENT_TOOL = "codex";

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.status).toBe("verifying");
    expect(resumed.session.currentStep).toBe("verify");
    expect(resumed.session.observeSessionIds).toEqual(["fix-checkout-timeout"]);
    expect(resumed.session.lastRecoveryAction).toEqual({
      kind: "auto-observe-start",
      at: expect.any(String),
      detail: "started observation session 'fix-checkout-timeout' for recovery",
    });
    expect(resumed.context.taskState).toMatchObject({
      status: "verifying",
      currentStep: "verify",
      observeSessionIds: ["fix-checkout-timeout"],
    });
    expect(resumed.context.recovery).toMatchObject({
      resumeStrategy: {
        kind: "last-runner",
        preferredTool: "codex",
      },
      recoveryPlan: {
        kind: "collect-evidence",
        actions: ["collect-evidence", "verify"],
      },
    });
    expect(resumed.session.nextActions).toEqual(["collect-evidence", "verify"]);
    expect(resumed.session.lastError).toBeNull();
    expect(observeState.runObserveCommand).toHaveBeenLastCalledWith({
      cwd,
      mode: "start",
      topic: "Fix checkout timeout",
      envId: "fix-checkout-timeout",
    });
    const handoff = await readTextFile(join(cwd, resumed.handoffPath));
    expect(handoff).toContain("## Recovery");
    expect(handoff).toContain("- Last Recovery Action: auto-observe-start");
    expect(handoff).toContain("- Resume Strategy: last-runner");
    expect(handoff).toContain("- Recovery Plan: collect-evidence");
    expect(resumed.session.runner).toEqual({
      mode: "current",
      tool: "codex",
      launched: true,
      command: null,
      args: [],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
  });

  it("resumes a runtime verification retry into implementing with investigation actions", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify({
        ...created.session,
        status: "retrying",
        currentStep: "implement",
        nextActions: ["investigate-failures", "implement", "verify"],
        lastError: "checkpoint-or-runtime-verification-failed",
        lastErrorAt: "2026-04-17T16:10:00.000Z",
      }, null, 2),
    );
    process.env.BBG_CURRENT_TOOL = "codex";

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.status).toBe("implementing");
    expect(resumed.session.currentStep).toBe("implement");
    expect(resumed.session.nextActions).toEqual(["investigate-failures", "implement", "verify"]);
    expect(resumed.session.lastError).toBeNull();
    expect(resumed.session.runner).toEqual({
      mode: "current",
      tool: "codex",
      launched: true,
      command: null,
      args: [],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
  });

  it("prefers the last successful runner tool and falls back to the default runner on resume", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "config.json"),
      JSON.stringify({
        version: "1.0.0",
        projectName: "demo",
        projectDescription: "demo project",
        createdAt: "2026-04-17T16:00:00.000Z",
        updatedAt: "2026-04-17T16:00:00.000Z",
        repos: [{
          name: "app",
          gitUrl: "git@example.com:demo/app.git",
          branch: "main",
          type: "backend",
          stack: {
            language: "typescript",
            framework: "node",
            buildTool: "npm",
            testFramework: "vitest",
            packageManager: "npm",
          },
          description: "demo app",
        }],
        governance: {
          riskThresholds: {
            high: { grade: "A", minScore: 90 },
            medium: { grade: "B", minScore: 75 },
            low: { grade: "C", minScore: 60 },
          },
          enableRedTeam: false,
          enableCrossAudit: false,
        },
        context: {},
        agentRunner: {
          defaultTool: "claude",
          tools: {
            claude: { command: "claude", args: ["resume", "{taskId}"] },
            codex: { command: "codex", args: ["resume", "{taskId}"] },
          },
        },
      }),
    );

    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify({
        ...created.session,
        status: "blocked",
        blockedReason: "runner launch failed",
        lastError: "launcher unavailable",
        lastErrorAt: "2026-04-17T16:10:00.000Z",
        tool: null,
        runner: {
          mode: "agent",
          tool: "codex",
          launched: true,
          command: "codex",
          args: ["resume", "fix-checkout-timeout"],
          launchedAt: "2026-04-17T16:05:00.000Z",
          lastAttemptAt: "2026-04-17T16:10:00.000Z",
          lastLaunchError: "launcher unavailable",
        },
      }, null, 2),
    );
    runnerState.launchConfiguredAgentRunner.mockClear();
    runnerState.launchConfiguredAgentRunner
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        tool: "claude",
        command: "claude",
        args: ["resume", "fix-checkout-timeout"],
      });

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(runnerState.launchConfiguredAgentRunner).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        preferredTool: "codex",
        taskStatus: "retrying",
        currentStep: "implement",
        resumeStrategyKind: "last-runner",
        recoveryPlanKind: "resume-runner",
        recoveryActions: ["resume"],
      }),
    );
    expect(runnerState.launchConfiguredAgentRunner).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        preferredTool: "claude",
        taskStatus: "retrying",
        currentStep: "implement",
        resumeStrategyKind: "last-runner",
        recoveryPlanKind: "resume-runner",
        recoveryActions: ["resume"],
      }),
    );
    expect(resumed.session.status).toBe("implementing");
    expect(resumed.session.tool).toBe("claude");
    expect(resumed.session.runner).toEqual({
      mode: "agent",
      tool: "claude",
      launched: true,
      command: "claude",
      args: ["resume", "fix-checkout-timeout"],
      launchedAt: expect.any(String),
      lastAttemptAt: expect.any(String),
      lastLaunchError: null,
    });
  });

  it("includes task environment health and observation summaries in status", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";

    const { startTask, readTaskStatusSummary } = await import("../../../src/runtime/tasks.js");
    const result = await startTask(cwd, "Fix checkout timeout");

    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "worktree"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "ui"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "logs"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "metrics"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "traces"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "observations", "fix-checkout-timeout"), {
      recursive: true,
    });
    await writeTextFile(
      join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "manifest.json"),
      JSON.stringify({
        version: 1,
        id: "fix-checkout-timeout",
        task: "Fix checkout timeout",
        slug: "fix-checkout-timeout",
        createdAt: "2026-04-17T16:00:00.000Z",
        updatedAt: "2026-04-17T16:00:00.000Z",
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
      }, null, 2),
    );
    await writeTextFile(
      join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "observations", "fix-checkout-timeout", "manifest.json"),
      JSON.stringify({
        version: 1,
        id: "fix-checkout-timeout",
        topic: "Fix checkout timeout",
        createdAt: "2026-04-17T16:00:00.000Z",
        updatedAt: "2026-04-17T16:00:00.000Z",
        envId: "fix-checkout-timeout",
        rootPath: ".bbg/task-envs/fix-checkout-timeout/artifacts",
        uiArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/ui",
        logArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/logs",
        metricArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/metrics",
        traceArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/traces",
        notesPath: ".bbg/task-envs/fix-checkout-timeout/observations/fix-checkout-timeout/notes.md",
      }, null, 2),
    );
    await writeTextFile(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "ui", "screen.png"), "");
    await writeTextFile(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "logs", "app.log"), "");

    const status = await readTaskStatusSummary(cwd);

    expect(status.tasks).toHaveLength(1);
    expect(status.taskEnvs).toEqual([
      expect.objectContaining({
        id: "fix-checkout-timeout",
        status: "active",
      }),
    ]);
    expect(status.observations).toEqual([
      expect.objectContaining({
        id: "fix-checkout-timeout",
        envId: "fix-checkout-timeout",
        uiArtifacts: 1,
        logArtifacts: 1,
        metricArtifacts: 0,
        traceArtifacts: 0,
        evidenceKinds: ["ui", "logs"],
        totalArtifacts: 2,
        readiness: "ready",
      }),
    ]);
    expect(result.session.observeSessionIds).toEqual(["fix-checkout-timeout"]);
    expect(status.tasks[0]?.resumeStrategy).toEqual({
      kind: "last-runner",
      preferredTool: "claude",
      fallbackTool: null,
      reason: "continue with the most recent successful runner",
    });
    expect(status.tasks[0]?.recoveryPlan).toEqual({
      kind: "retry-implement",
      actions: ["review-hermes-context", "implement", "add-tests", "verify"],
      reason: "task should continue implementation and then re-run verification",
    });
    expect(status.tasks[0]?.lastRecoveryAction).toBeNull();
  });

  it("writes loop runtime details into task context and handoff after loop assignment", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";

    const { startTask, assignLoopToTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "loops", "main-loop.json"),
      JSON.stringify({
        version: 1,
        id: "main-loop",
        taskId: created.session.taskId,
        taskEnvId: "fix-checkout-timeout",
        startedAt: "2026-04-17T16:00:00.000Z",
        updatedAt: "2026-04-17T16:10:00.000Z",
        status: "waiting-for-change",
        checks: ["build", "tests"],
        maxIterations: 5,
        pollIntervalMs: 1000,
        idleTimeoutMs: 5000,
        iterations: [
          {
            iteration: 1,
            timestamp: "2026-04-17T16:05:00.000Z",
            changedFiles: [],
            checks: {},
          },
        ],
      }, null, 2),
    );

    await assignLoopToTask({
      cwd,
      taskId: created.session.taskId,
      loopId: "main-loop",
    });

    const context = JSON.parse(await readTextFile(join(cwd, created.contextPath))) as {
      taskState: {
        loopId: string | null;
        loop: {
          id: string;
          taskEnvId: string | null;
          status: string;
          iterations: number;
          updatedAt: string;
        } | null;
      };
    };
    expect(context.taskState.loopId).toBe("main-loop");
    expect(context.taskState.loop).toEqual({
      id: "main-loop",
      taskEnvId: "fix-checkout-timeout",
      status: "waiting-for-change",
      iterations: 1,
      updatedAt: "2026-04-17T16:10:00.000Z",
    });

    const handoff = await readTextFile(join(cwd, created.handoffPath));
    expect(handoff).toContain("- Loop: main-loop");
    expect(handoff).toContain("- Loop Status: waiting-for-change");
    expect(handoff).toContain("- Loop Iterations: 1");
  });

  it("derives a default-runner resume strategy when no successful runner is recorded", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "config.json"),
      JSON.stringify({
        version: "1.0.0",
        projectName: "demo",
        projectDescription: "demo project",
        createdAt: "2026-04-17T16:00:00.000Z",
        updatedAt: "2026-04-17T16:00:00.000Z",
        repos: [{
          name: "app",
          gitUrl: "git@example.com:demo/app.git",
          branch: "main",
          type: "backend",
          stack: {
            language: "typescript",
            framework: "node",
            buildTool: "npm",
            testFramework: "vitest",
            packageManager: "npm",
          },
          description: "demo app",
        }],
        governance: {
          riskThresholds: {
            high: { grade: "A", minScore: 90 },
            medium: { grade: "B", minScore: 75 },
            low: { grade: "C", minScore: 60 },
          },
          enableRedTeam: false,
          enableCrossAudit: false,
        },
        context: {},
        agentRunner: {
          defaultTool: "claude",
          tools: {
            claude: { command: "claude", args: ["resume", "{taskId}"] },
          },
        },
      }),
    );
    process.env.BBG_CURRENT_TOOL = "claude";
    const { startTask, readTaskStatusSummary } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify({
        ...created.session,
        tool: null,
        runner: {
          mode: "prepare",
          tool: null,
          launched: false,
          command: null,
          args: [],
          launchedAt: null,
          lastAttemptAt: "2026-04-17T16:10:00.000Z",
          lastLaunchError: "claude missing",
        },
      }, null, 2),
    );

    const status = await readTaskStatusSummary(cwd);

    expect(status.tasks[0]?.resumeStrategy).toEqual({
      kind: "default-runner",
      preferredTool: "claude",
      fallbackTool: null,
      reason: "no successful runner recorded; use the configured default runner",
    });
    expect(status.tasks[0]?.recoveryPlan).toEqual({
      kind: "retry-implement",
      actions: ["review-hermes-context", "implement", "add-tests", "verify"],
      reason: "task should continue implementation and then re-run verification",
    });
    expect(status.tasks[0]?.lastRecoveryAction).toBeNull();
  });

  it("escalates to manual review when the attempt budget is exceeded on resume", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";
    const { startTask, resumeTask } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify({
        ...created.session,
        attemptCount: 6,
        status: "retrying",
        currentStep: "implement",
        nextActions: ["implement", "verify"],
      }, null, 2),
    );

    const resumed = await resumeTask(cwd, created.session.taskId);

    expect(resumed.session.status).toBe("blocked");
    expect(resumed.session.blockedReason).toBe("autonomy budget exceeded");
    expect(resumed.session.autonomy.escalated).toBe(true);
    expect(resumed.session.lastRecoveryAction).toEqual({
      kind: "autonomy-budget-escalation",
      at: expect.any(String),
      detail: expect.stringContaining("attempt budget exceeded"),
    });
    expect(resumed.context.recovery.recoveryPlan).toMatchObject({
      kind: "manual-review",
      actions: ["manual-review"],
    });
  });

  it("escalates to manual review when verification failure budget is exceeded", async () => {
    const cwd = await makeTempDir();
    await initializeWorkspace(cwd);
    process.env.BBG_CURRENT_TOOL = "claude";
    const { startTask, updateTaskSessionAfterVerify } = await import("../../../src/runtime/tasks.js");
    const created = await startTask(cwd, "Fix checkout timeout");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", created.session.taskId, "session.json"),
      JSON.stringify({
        ...created.session,
        autonomy: {
          ...created.session.autonomy,
          maxVerifyFailures: 1,
        },
      }, null, 2),
    );

    const updated = await updateTaskSessionAfterVerify({
      cwd,
      taskId: created.session.taskId,
      ok: false,
      failureReason: "checkpoint-or-runtime-verification-failed",
      summary: {
        ok: false,
        reasons: ["checkpoint-or-runtime-verification-failed"],
        missingEvidence: [],
        observeRequired: false,
        observationReadiness: "not-required",
      },
    });

    expect(updated.status).toBe("blocked");
    expect(updated.blockedReason).toBe("autonomy budget exceeded");
    expect(updated.autonomy.escalated).toBe(true);
    expect(updated.lastRecoveryAction?.kind).toBe("autonomy-budget-escalation");
  });
});
