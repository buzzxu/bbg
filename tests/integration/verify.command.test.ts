import { mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runReviewRecordCommand } from "../../src/commands/review-record.js";
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

  it("includes task-level observation readiness when an active task session exists", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await runCheckpointCommand({ cwd, name: "baseline" });

    await mkdir(join(cwd, ".bbg", "tasks", "fix-checkout-timeout"), { recursive: true });
    await writeTextFile(
      join(cwd, ".bbg", "tasks", "fix-checkout-timeout", "session.json"),
      `${JSON.stringify({
        version: 1,
        taskId: "fix-checkout-timeout",
        task: "Fix checkout timeout",
        status: "ready",
        entrypoint: "start",
        tool: "claude",
        startedAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
        workflowKind: "plan",
        currentStep: "implement",
        attemptCount: 1,
        taskEnvId: "fix-checkout-timeout",
        observeSessionIds: ["fix-checkout-timeout"],
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
        lastReviewResult: null,
        autonomy: {
          maxAttempts: 5,
          maxVerifyFailures: 3,
          maxDurationMs: 604800000,
          verifyFailureCount: 0,
          escalated: false,
          escalationReason: null,
          escalatedAt: null,
        },
      }, null, 2)}\n`,
    );
    await writeTextFile(
      join(cwd, ".bbg", "tasks", "fix-checkout-timeout", "decisions.json"),
      `${JSON.stringify({
        taskEnv: { decision: "required", reasons: ["debug-or-stabilization-task"] },
        observe: { decision: "required", reasons: ["runtime-evidence-useful"] },
        tdd: { decision: "required", reasons: ["testing-or-regression-signal"] },
        security: { decision: "not-required", reasons: [] },
        loop: { decision: "optional", reasons: ["runtime-checks-may-repeat"] },
        hermesQuery: { decision: "recommended", reasons: ["plan-benefits-from-local-history"] },
      }, null, 2)}\n`,
    );

    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "ui"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "logs"), { recursive: true });
    await mkdir(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "observations", "fix-checkout-timeout"), {
      recursive: true,
    });
    await writeTextFile(
      join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "observations", "fix-checkout-timeout", "manifest.json"),
      `${JSON.stringify({
        version: 1,
        id: "fix-checkout-timeout",
        topic: "Fix checkout timeout",
        createdAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
        envId: "fix-checkout-timeout",
        rootPath: ".bbg/task-envs/fix-checkout-timeout/artifacts",
        uiArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/ui",
        logArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/logs",
        metricArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/metrics",
        traceArtifactsPath: ".bbg/task-envs/fix-checkout-timeout/artifacts/traces",
        notesPath: ".bbg/task-envs/fix-checkout-timeout/observations/fix-checkout-timeout/notes.md",
      }, null, 2)}\n`,
    );
    await writeFile(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "ui", "screen.png"), "");
    await writeFile(join(cwd, ".bbg", "task-envs", "fix-checkout-timeout", "artifacts", "logs", "app.log"), "");

    const result = await runVerifyCommand({ cwd, checkpoint: "baseline" });

    expect(result.taskVerification).toEqual({
      taskId: "fix-checkout-timeout",
      status: "completed",
      currentStep: "complete",
      taskEnvId: "fix-checkout-timeout",
      ok: true,
      hermesQueryExecuted: false,
      reasons: [],
      missingEvidence: [],
      observeRequired: true,
      observationReadiness: "ready",
      observations: [
        {
          id: "fix-checkout-timeout",
          readiness: "ready",
          totalArtifacts: 2,
          evidenceKinds: ["ui", "logs"],
        },
      ],
      reviewGate: {
        level: "none",
        reason: "No explicit language-specific review gate configured.",
        reviewPack: [],
        stopConditions: [],
      },
      lastReviewResult: null,
      reviewersRecommended: [],
      guideReferences: [],
      languageReviewHint: null,
    });

    const updatedSession = JSON.parse(
      await readFile(join(cwd, ".bbg", "tasks", "fix-checkout-timeout", "session.json"), "utf8"),
    ) as {
      status: string;
      currentStep: string;
      nextActions: string[];
      lastError: string | null;
      lastVerification: {
        ok: boolean;
        observationReadiness: string;
        missingEvidence: string[];
      } | null;
    };
    expect(updatedSession.status).toBe("completed");
    expect(updatedSession.currentStep).toBe("complete");
    expect(updatedSession.nextActions).toEqual([]);
    expect(updatedSession.lastError).toBeNull();
    expect(updatedSession.lastVerification).toMatchObject({
      ok: true,
      observationReadiness: "ready",
      missingEvidence: [],
    });
    const updatedContext = JSON.parse(
      await readFile(join(cwd, ".bbg", "tasks", "fix-checkout-timeout", "context.json"), "utf8"),
    ) as {
      taskState: {
        status: string;
        currentStep: string;
        lastVerification: {
          ok: boolean;
          observationReadiness: string;
        } | null;
      };
      recovery: {
        recoveryPlan: {
          kind: string;
        } | null;
      };
    };
    expect(updatedContext.taskState).toMatchObject({
      status: "completed",
      currentStep: "complete",
      lastVerification: {
        ok: true,
        observationReadiness: "ready",
      },
    });
    expect(updatedContext.recovery.recoveryPlan).toMatchObject({
      kind: "none",
    });
    await expect(readFile(join(cwd, "docs", "wiki", "reports", "workflow-stability-summary.md"), "utf8")).resolves.toContain(
      "Latest task: fix-checkout-timeout",
    );
    await expect(readFile(join(cwd, "docs", "wiki", "reports", "regression-risk-summary.md"), "utf8")).resolves.toContain(
      "Status: completed",
    );
  });

  it("marks task verification as incomplete when required observation evidence is missing", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await runCheckpointCommand({ cwd, name: "baseline" });

    await mkdir(join(cwd, ".bbg", "tasks", "fix-checkout-timeout"), { recursive: true });
    await writeTextFile(
      join(cwd, ".bbg", "tasks", "fix-checkout-timeout", "session.json"),
      `${JSON.stringify({
        version: 1,
        taskId: "fix-checkout-timeout",
        task: "Fix checkout timeout",
        status: "ready",
        entrypoint: "start",
        tool: "claude",
        startedAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
        workflowKind: "plan",
        currentStep: "verify",
        attemptCount: 1,
        taskEnvId: "fix-checkout-timeout",
        observeSessionIds: [],
        loopId: null,
        nextActions: ["verify"],
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
        lastReviewResult: null,
        autonomy: {
          maxAttempts: 5,
          maxVerifyFailures: 3,
          maxDurationMs: 604800000,
          verifyFailureCount: 0,
          escalated: false,
          escalationReason: null,
          escalatedAt: null,
        },
      }, null, 2)}\n`,
    );
    await writeTextFile(
      join(cwd, ".bbg", "tasks", "fix-checkout-timeout", "decisions.json"),
      `${JSON.stringify({
        taskEnv: { decision: "required", reasons: ["debug-or-stabilization-task"] },
        observe: { decision: "required", reasons: ["runtime-evidence-useful"] },
        tdd: { decision: "required", reasons: ["testing-or-regression-signal"] },
        security: { decision: "not-required", reasons: [] },
        loop: { decision: "optional", reasons: ["runtime-checks-may-repeat"] },
        hermesQuery: { decision: "recommended", reasons: ["plan-benefits-from-local-history"] },
      }, null, 2)}\n`,
    );

    const result = await runVerifyCommand({ cwd, checkpoint: "baseline" });

    expect(result.taskVerification).toEqual({
      taskId: "fix-checkout-timeout",
      status: "retrying",
      currentStep: "verify",
      taskEnvId: "fix-checkout-timeout",
      ok: false,
      hermesQueryExecuted: false,
      reasons: ["observation-empty"],
      missingEvidence: ["observation-evidence"],
      observeRequired: true,
      observationReadiness: "empty",
      observations: [],
      reviewGate: {
        level: "none",
        reason: "No explicit language-specific review gate configured.",
        reviewPack: [],
        stopConditions: [],
      },
      lastReviewResult: null,
      reviewersRecommended: [],
      guideReferences: [],
      languageReviewHint: null,
    });

    const updatedSession = JSON.parse(
      await readFile(join(cwd, ".bbg", "tasks", "fix-checkout-timeout", "session.json"), "utf8"),
    ) as {
      status: string;
      currentStep: string;
      lastError: string | null;
      nextActions: string[];
      lastVerification: {
        ok: boolean;
        observationReadiness: string;
        missingEvidence: string[];
      } | null;
    };
    expect(updatedSession.status).toBe("retrying");
    expect(updatedSession.currentStep).toBe("verify");
    expect(updatedSession.lastError).toContain("observation-empty");
    expect(updatedSession.nextActions).toEqual(["collect-evidence", "verify"]);
    expect(updatedSession.lastVerification).toMatchObject({
      ok: false,
      observationReadiness: "empty",
      missingEvidence: ["observation-evidence"],
    });
    const updatedContext = JSON.parse(
      await readFile(join(cwd, ".bbg", "tasks", "fix-checkout-timeout", "context.json"), "utf8"),
    ) as {
      taskState: {
        status: string;
        currentStep: string;
        lastVerification: {
          ok: boolean;
          observationReadiness: string;
          missingEvidence: string[];
        } | null;
      };
      recovery: {
        recoveryPlan: {
          kind: string;
          actions: string[];
        } | null;
      };
    };
    expect(updatedContext.taskState).toMatchObject({
      status: "retrying",
      currentStep: "verify",
      lastVerification: {
        ok: false,
        observationReadiness: "empty",
        missingEvidence: ["observation-evidence"],
      },
    });
    expect(updatedContext.recovery.recoveryPlan).toMatchObject({
      kind: "collect-evidence",
      actions: ["collect-evidence", "verify"],
    });
    await expect(readFile(join(cwd, "docs", "wiki", "reports", "workflow-stability-summary.md"), "utf8")).resolves.toContain(
      "Observation readiness: empty",
    );
    await expect(readFile(join(cwd, "docs", "wiki", "reports", "regression-risk-summary.md"), "utf8")).resolves.toContain(
      "Recovery plan: retry-implement",
    );
  });

  it("blocks completion until a required language review passes", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await runCheckpointCommand({ cwd, name: "baseline" });

    await mkdir(join(cwd, ".bbg", "tasks", "fix-java-boundary"), { recursive: true });
    await writeTextFile(
      join(cwd, ".bbg", "tasks", "fix-java-boundary", "session.json"),
      `${JSON.stringify({
        version: 1,
        taskId: "fix-java-boundary",
        task: "Fix Java boundary handling",
        status: "ready",
        entrypoint: "start",
        tool: "codex",
        startedAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
        workflowKind: "plan",
        currentStep: "verify",
        attemptCount: 1,
        taskEnvId: "fix-java-boundary",
        observeSessionIds: [],
        loopId: null,
        nextActions: ["verify"],
        lastError: null,
        lastErrorAt: null,
        blockedReason: null,
        runner: {
          mode: "current",
          tool: "codex",
          launched: true,
          command: null,
          args: [],
          launchedAt: "2026-04-18T00:00:00.000Z",
          lastAttemptAt: "2026-04-18T00:00:00.000Z",
          lastLaunchError: null,
        },
        lastVerification: null,
        lastRecoveryAction: null,
        lastReviewResult: null,
        autonomy: {
          maxAttempts: 5,
          maxVerifyFailures: 3,
          maxDurationMs: 604800000,
          verifyFailureCount: 0,
          escalated: false,
          escalationReason: null,
          escalatedAt: null,
        },
      }, null, 2)}\n`,
    );
    await writeTextFile(
      join(cwd, ".bbg", "tasks", "fix-java-boundary", "decisions.json"),
      `${JSON.stringify({
        taskEnv: { decision: "required", reasons: ["debug-or-stabilization-task"] },
        observe: { decision: "not-required", reasons: [] },
        tdd: { decision: "required", reasons: ["testing-or-regression-signal"] },
        security: { decision: "not-required", reasons: [] },
        loop: { decision: "optional", reasons: ["runtime-checks-may-repeat"] },
        hermesQuery: { decision: "not-required", reasons: [] },
      }, null, 2)}\n`,
    );
    await writeTextFile(
      join(cwd, ".bbg", "tasks", "fix-java-boundary", "context.json"),
      `${JSON.stringify({
        version: 1,
        taskId: "fix-java-boundary",
        analyzeRunId: null,
        references: ["docs/architecture/languages/java/application-patterns.md"],
        modelRoute: {
          classification: {
            domain: "implementation",
            complexity: "moderate",
            context: "medium",
            targetCommand: null,
            languages: ["java"],
          },
          recommendation: {
            modelClass: "premium",
            reason: "java boundary work benefits from stronger review before completion.",
            telemetryNote: "No local telemetry feedback available.",
            reviewerAgents: ["java-reviewer"],
            guideReferences: ["docs/architecture/languages/java/application-patterns.md"],
          },
        },
        languageGuidance: {
          languages: ["java"],
          guideReferences: ["docs/architecture/languages/java/application-patterns.md"],
          reviewerAgents: ["java-reviewer"],
          reviewHint: "Prefer java-reviewer for boundary and transaction-sensitive changes.",
        },
        reviewGate: {
          level: "required",
          reviewers: ["java-reviewer"],
          guideReferences: ["docs/architecture/languages/java/application-patterns.md"],
          reviewPack: ["layering", "domain-modeling", "transaction-boundaries"],
          stopConditions: [
            "domain-interface-change",
            "unknown-invariant-conflict",
            "transaction-or-security-boundary-change",
          ],
          reason: "Java boundary changes require explicit language review.",
        },
        commandSpecPath: "commands/plan.md",
        summary: "Validate Java boundary handling before delivery.",
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
          status: "ready",
          currentStep: "verify",
          taskEnvId: "fix-java-boundary",
          observeSessionIds: [],
          loopId: null,
          loop: null,
          nextActions: ["verify"],
          runner: {
            mode: "current",
            tool: "codex",
            launched: true,
            command: null,
            args: [],
            launchedAt: "2026-04-18T00:00:00.000Z",
            lastAttemptAt: "2026-04-18T00:00:00.000Z",
            lastLaunchError: null,
          },
          lastVerification: null,
          lastRecoveryAction: null,
          lastReviewResult: null,
          autonomy: {
            maxAttempts: 5,
            maxVerifyFailures: 3,
            maxDurationMs: 604800000,
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

    const pending = await runVerifyCommand({ cwd, checkpoint: "baseline" });

    expect(pending.taskVerification).toMatchObject({
      taskId: "fix-java-boundary",
      ok: false,
      reasons: ["review-gate-pending"],
      missingEvidence: ["language-review"],
      reviewGate: {
        level: "required",
        reason: "Java boundary changes require explicit language review.",
      },
      lastReviewResult: null,
    });

    await runReviewRecordCommand({
      cwd,
      taskId: "fix-java-boundary",
      reviewer: "java-reviewer",
      status: "passed",
      summary: "Layering and transaction boundaries look correct.",
      findings: [],
    });

    const passed = await runVerifyCommand({ cwd, checkpoint: "baseline" });

    expect(passed.taskVerification).toMatchObject({
      taskId: "fix-java-boundary",
      ok: true,
      reasons: [],
      missingEvidence: [],
      reviewGate: {
        level: "required",
      },
      lastReviewResult: {
        reviewer: "java-reviewer",
        status: "passed",
        summary: "Layering and transaction boundaries look correct.",
        findings: [],
      },
    });
  });
});
