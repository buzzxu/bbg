import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeTextFile } from "../../../src/utils/fs.js";

const execaState = vi.hoisted(() => ({
  execa: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: execaState.execa,
}));

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-loop-command-"));
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
        runtime: {
          telemetry: { enabled: false, file: ".bbg/telemetry/events.json" },
          evaluation: { enabled: true, file: ".bbg/evaluations/history.json" },
          policy: { enabled: true, file: ".bbg/policy/decisions.json" },
          context: { enabled: true, repoMapFile: ".bbg/context/repo-map.json", sessionHistoryFile: ".bbg/sessions/history.json" },
          autonomy: { maxAttempts: 5, maxVerifyFailures: 3, maxDurationMs: 3600000 },
          commands: {
            build: { command: "node", args: ["-e", "process.exit(0)"] },
            tests: { command: "node", args: ["-e", "process.exit(0)"] },
            typecheck: { command: "node", args: ["-e", "process.exit(0)"] },
          },
        },
      },
      null,
      2,
    )}\n`,
  );
}

describe("loop commands", () => {
  beforeEach(() => {
    execaState.execa.mockReset();
    execaState.execa.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
  });

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("creates a waiting loop state and can read it back", async () => {
    const cwd = await makeTempDir();
    await seedConfig(cwd);
    await writeTextFile(join(cwd, "README.md"), "# Loop test\n");

    const { runLoopStartCommand } = await import("../../../src/commands/loop-start.js");
    const { runLoopStatusCommand } = await import("../../../src/commands/loop-status.js");

    const started = await runLoopStartCommand({
      cwd,
      id: "main-loop",
      checks: ["build"],
      maxIterations: 2,
      pollIntervalMs: 10,
      idleTimeoutMs: 20,
    });

    expect(started.id).toBe("main-loop");
    expect(["completed", "waiting-for-change"]).toContain(started.status);

    const status = await runLoopStatusCommand({ cwd, id: "main-loop" });
    expect(status.id).toBe("main-loop");
    expect(status.iterations.length).toBeGreaterThan(0);
  });

  it("binds a loop to a task session and marks the task as verifying", async () => {
    const cwd = await makeTempDir();
    await seedConfig(cwd);
    await writeTextFile(join(cwd, "README.md"), "# Loop test\n");
    await writeTextFile(
      join(cwd, ".bbg", "tasks", "fix-checkout-timeout", "session.json"),
      `${JSON.stringify({
        version: 1,
        taskId: "fix-checkout-timeout",
        task: "Fix checkout timeout",
        status: "implementing",
        entrypoint: "start",
        tool: "claude",
        startedAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
        workflowKind: "plan",
        currentStep: "implement",
        attemptCount: 1,
        taskEnvId: "fix-checkout-timeout",
        observeSessionIds: [],
        loopId: null,
        nextActions: ["implement", "verify"],
        lastError: null,
        lastErrorAt: null,
        blockedReason: null,
        runner: {
          mode: "current",
          tool: "claude",
          launched: true,
          command: null,
          args: [],
          launchedAt: "2026-04-18T00:00:00.000Z",
          lastAttemptAt: "2026-04-18T00:00:00.000Z",
          lastLaunchError: null,
        },
        lastVerification: null,
        lastRecoveryAction: null,
        autonomy: {
          maxAttempts: 5,
          maxVerifyFailures: 3,
          maxDurationMs: 3600000,
          verifyFailureCount: 0,
          escalated: false,
          escalationReason: null,
          escalatedAt: null,
        },
      }, null, 2)}\n`,
    );
    await writeTextFile(
      join(cwd, ".bbg", "tasks", "fix-checkout-timeout", "context.json"),
      `${JSON.stringify({
        version: 1,
        taskId: "fix-checkout-timeout",
        analyzeRunId: null,
        references: ["AGENTS.md"],
        commandSpecPath: "commands/start.md",
        summary: "Fix checkout timeout",
        hermesRecommendations: [],
        hermesQuery: {
          executed: false,
          strategy: "default",
          topic: null,
          summary: null,
          commandSpecPath: null,
          references: [],
          influencedWorkflow: false,
          influencedRecovery: false,
          influencedVerification: false,
        },
        taskState: {
          status: "implementing",
          currentStep: "implement",
          taskEnvId: "fix-checkout-timeout",
          observeSessionIds: [],
          loopId: null,
          loop: null,
          nextActions: ["implement", "verify"],
          runner: {
            mode: "current",
            tool: "claude",
            launched: true,
            command: null,
            args: [],
            launchedAt: "2026-04-18T00:00:00.000Z",
            lastAttemptAt: "2026-04-18T00:00:00.000Z",
            lastLaunchError: null,
          },
          lastVerification: null,
          lastRecoveryAction: null,
          autonomy: {
            maxAttempts: 5,
            maxVerifyFailures: 3,
            maxDurationMs: 3600000,
            verifyFailureCount: 0,
            escalated: false,
            escalationReason: null,
            escalatedAt: null,
          },
        },
        recovery: {
          resumeStrategy: null,
          recoveryPlan: null,
        },
      }, null, 2)}\n`,
    );
    await writeTextFile(
      join(cwd, ".bbg", "tasks", "fix-checkout-timeout", "decisions.json"),
      `${JSON.stringify({
        taskEnv: { decision: "required", reasons: ["debug-or-stabilization-task"] },
        observe: { decision: "not-required", reasons: [] },
        tdd: { decision: "required", reasons: ["testing-or-regression-signal"] },
        security: { decision: "not-required", reasons: [] },
        loop: { decision: "optional", reasons: ["runtime-checks-may-repeat"] },
        hermesQuery: { decision: "not-required", reasons: [] },
      }, null, 2)}\n`,
    );

    const { runLoopStartCommand } = await import("../../../src/commands/loop-start.js");
    const { readTaskSession } = await import("../../../src/runtime/tasks.js");

    const started = await runLoopStartCommand({
      cwd,
      id: "main-loop",
      taskId: "fix-checkout-timeout",
      checks: ["build"],
      maxIterations: 2,
      pollIntervalMs: 10,
      idleTimeoutMs: 20,
    });

    expect(started.taskId).toBe("fix-checkout-timeout");
    expect(started.taskEnvId).toBe("fix-checkout-timeout");

    const session = await readTaskSession(cwd, "fix-checkout-timeout");
    expect(session.loopId).toBe("main-loop");
    expect(session.status).toBe("verifying");
    expect(session.currentStep).toBe("verify");
    expect(session.nextActions).toEqual(["implement", "verify"]);
  });
});
