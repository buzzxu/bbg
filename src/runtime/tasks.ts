import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { runHermesCommand } from "../commands/hermes.js";
import { runObserveCommand } from "../commands/observe.js";
import { runTaskEnvCommand } from "../commands/task-env.js";
import { runWorkflowCommand } from "../commands/workflow.js";
import { parseConfig } from "../config/read-write.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";
import { slugifyValue } from "../utils/slug.js";
import { launchConfiguredAgentRunner } from "./agent-runner.js";
import { listLoopStates, readLoopState } from "./loops.js";
import { summarizeObserveSession } from "./observe.js";
import { buildDefaultRuntimeConfig } from "./schema.js";
import { readJsonStore, writeJsonStore } from "./store.js";
import { listTaskEnvs } from "./task-envs.js";
import { writeTaskWikiArtifact } from "./wiki.js";
import type {
  StartTaskResult,
  TaskContext,
  TaskObservationSummary,
  TaskRecoveryPlan,
  TaskRunnerState,
  TaskResumeStrategy,
  TaskSession,
  TaskStatusEntry,
  TaskStatusSummary,
  TaskVerificationSummary,
} from "./task-types.js";

const TASK_STORE_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTaskSession(value: unknown): value is TaskSession {
  return isRecord(value)
    && typeof value.version === "number"
    && typeof value.taskId === "string"
    && typeof value.task === "string"
    && typeof value.status === "string"
    && typeof value.entrypoint === "string"
    && (value.tool === null || typeof value.tool === "string")
    && typeof value.startedAt === "string"
    && typeof value.updatedAt === "string"
    && typeof value.workflowKind === "string"
    && (value.currentStep === null || typeof value.currentStep === "string")
    && typeof value.attemptCount === "number"
    && (value.taskEnvId === null || typeof value.taskEnvId === "string")
    && Array.isArray(value.observeSessionIds)
    && (value.loopId === null || typeof value.loopId === "string")
    && Array.isArray(value.nextActions)
    && (value.lastError === null || typeof value.lastError === "string")
    && (value.lastErrorAt === null || typeof value.lastErrorAt === "string")
    && (value.blockedReason === null || typeof value.blockedReason === "string")
    && isRecord(value.runner)
    && typeof value.runner.mode === "string"
    && (value.runner.tool === null || typeof value.runner.tool === "string")
    && typeof value.runner.launched === "boolean"
    && (value.runner.command === null || typeof value.runner.command === "string")
    && Array.isArray(value.runner.args)
    && (value.runner.launchedAt === null || typeof value.runner.launchedAt === "string")
    && (value.runner.lastAttemptAt === null || typeof value.runner.lastAttemptAt === "string")
    && (value.runner.lastLaunchError === null || typeof value.runner.lastLaunchError === "string")
    && (value.lastVerification === null || (
      isRecord(value.lastVerification)
      && typeof value.lastVerification.ok === "boolean"
      && typeof value.lastVerification.verifiedAt === "string"
      && Array.isArray(value.lastVerification.reasons)
      && Array.isArray(value.lastVerification.missingEvidence)
      && typeof value.lastVerification.observeRequired === "boolean"
      && typeof value.lastVerification.observationReadiness === "string"
    ))
    && (value.lastRecoveryAction === null || (
      isRecord(value.lastRecoveryAction)
      && typeof value.lastRecoveryAction.kind === "string"
      && typeof value.lastRecoveryAction.at === "string"
      && typeof value.lastRecoveryAction.detail === "string"
    ))
    && isRecord(value.autonomy)
    && typeof value.autonomy.maxAttempts === "number"
    && typeof value.autonomy.maxVerifyFailures === "number"
    && typeof value.autonomy.maxDurationMs === "number"
    && typeof value.autonomy.verifyFailureCount === "number"
    && typeof value.autonomy.escalated === "boolean"
    && (value.autonomy.escalationReason === null || typeof value.autonomy.escalationReason === "string")
    && (value.autonomy.escalatedAt === null || typeof value.autonomy.escalatedAt === "string");
}

function isTaskContext(value: unknown): value is TaskContext {
  return isRecord(value)
    && typeof value.version === "number"
    && typeof value.taskId === "string"
    && (value.analyzeRunId === null || typeof value.analyzeRunId === "string")
    && Array.isArray(value.references)
    && typeof value.commandSpecPath === "string"
    && typeof value.summary === "string"
    && Array.isArray(value.hermesRecommendations)
    && isRecord(value.hermesQuery)
    && typeof value.hermesQuery.executed === "boolean"
    && (value.hermesQuery.strategy === "default" || value.hermesQuery.strategy === "disabled" || value.hermesQuery.strategy === "forced")
    && (value.hermesQuery.topic === null || typeof value.hermesQuery.topic === "string")
    && (value.hermesQuery.summary === null || typeof value.hermesQuery.summary === "string")
    && (value.hermesQuery.commandSpecPath === null || typeof value.hermesQuery.commandSpecPath === "string")
    && Array.isArray(value.hermesQuery.references)
    && typeof value.hermesQuery.influencedWorkflow === "boolean"
    && typeof value.hermesQuery.influencedRecovery === "boolean"
    && typeof value.hermesQuery.influencedVerification === "boolean"
    && isRecord(value.taskState)
    && typeof value.taskState.status === "string"
    && (value.taskState.currentStep === null || typeof value.taskState.currentStep === "string")
    && (value.taskState.taskEnvId === null || typeof value.taskState.taskEnvId === "string")
    && Array.isArray(value.taskState.observeSessionIds)
    && (value.taskState.loopId === null || typeof value.taskState.loopId === "string")
    && (value.taskState.loop === null || (
      isRecord(value.taskState.loop)
      && typeof value.taskState.loop.id === "string"
      && (value.taskState.loop.taskEnvId === null || typeof value.taskState.loop.taskEnvId === "string")
      && typeof value.taskState.loop.status === "string"
      && typeof value.taskState.loop.iterations === "number"
      && typeof value.taskState.loop.updatedAt === "string"
    ))
    && Array.isArray(value.taskState.nextActions)
    && isRecord(value.taskState.runner)
    && typeof value.taskState.runner.mode === "string"
    && (value.taskState.runner.tool === null || typeof value.taskState.runner.tool === "string")
    && typeof value.taskState.runner.launched === "boolean"
    && (value.taskState.runner.command === null || typeof value.taskState.runner.command === "string")
    && Array.isArray(value.taskState.runner.args)
    && (value.taskState.runner.launchedAt === null || typeof value.taskState.runner.launchedAt === "string")
    && (value.taskState.runner.lastAttemptAt === null || typeof value.taskState.runner.lastAttemptAt === "string")
    && (value.taskState.runner.lastLaunchError === null || typeof value.taskState.runner.lastLaunchError === "string")
    && (value.taskState.lastVerification === null || (
      isRecord(value.taskState.lastVerification)
      && typeof value.taskState.lastVerification.ok === "boolean"
      && typeof value.taskState.lastVerification.verifiedAt === "string"
      && Array.isArray(value.taskState.lastVerification.reasons)
      && Array.isArray(value.taskState.lastVerification.missingEvidence)
      && typeof value.taskState.lastVerification.observeRequired === "boolean"
      && typeof value.taskState.lastVerification.observationReadiness === "string"
    ))
    && (value.taskState.lastRecoveryAction === null || (
      isRecord(value.taskState.lastRecoveryAction)
      && typeof value.taskState.lastRecoveryAction.kind === "string"
      && typeof value.taskState.lastRecoveryAction.at === "string"
      && typeof value.taskState.lastRecoveryAction.detail === "string"
    ))
    && isRecord(value.taskState.autonomy)
    && typeof value.taskState.autonomy.maxAttempts === "number"
    && typeof value.taskState.autonomy.maxVerifyFailures === "number"
    && typeof value.taskState.autonomy.maxDurationMs === "number"
    && typeof value.taskState.autonomy.verifyFailureCount === "number"
    && typeof value.taskState.autonomy.escalated === "boolean"
    && (value.taskState.autonomy.escalationReason === null || typeof value.taskState.autonomy.escalationReason === "string")
    && (value.taskState.autonomy.escalatedAt === null || typeof value.taskState.autonomy.escalatedAt === "string")
    && isRecord(value.recovery)
    && (value.recovery.resumeStrategy === null || (
      isRecord(value.recovery.resumeStrategy)
      && typeof value.recovery.resumeStrategy.kind === "string"
      && (value.recovery.resumeStrategy.preferredTool === null || typeof value.recovery.resumeStrategy.preferredTool === "string")
      && (value.recovery.resumeStrategy.fallbackTool === null || typeof value.recovery.resumeStrategy.fallbackTool === "string")
      && typeof value.recovery.resumeStrategy.reason === "string"
    ))
    && (value.recovery.recoveryPlan === null || (
      isRecord(value.recovery.recoveryPlan)
      && typeof value.recovery.recoveryPlan.kind === "string"
      && Array.isArray(value.recovery.recoveryPlan.actions)
      && typeof value.recovery.recoveryPlan.reason === "string"
    ));
}

export function getTaskRoot(cwd: string, taskId: string): string {
  return join(cwd, ".bbg", "tasks", taskId);
}

function getSessionPath(cwd: string, taskId: string): string {
  return join(getTaskRoot(cwd, taskId), "session.json");
}

function getDecisionsPath(cwd: string, taskId: string): string {
  return join(getTaskRoot(cwd, taskId), "decisions.json");
}

function getContextPath(cwd: string, taskId: string): string {
  return join(getTaskRoot(cwd, taskId), "context.json");
}

function getHandoffPath(cwd: string, taskId: string): string {
  return join(getTaskRoot(cwd, taskId), "handoff.md");
}

function buildTaskContext(base: Omit<TaskContext, "taskState" | "recovery">, input: {
  session: TaskSession;
  resumeStrategy?: TaskResumeStrategy | null;
  recoveryPlan?: TaskRecoveryPlan | null;
  loop?: TaskContext["taskState"]["loop"];
}): TaskContext {
  return {
    ...base,
    taskState: {
      status: input.session.status,
      currentStep: input.session.currentStep,
      taskEnvId: input.session.taskEnvId,
      observeSessionIds: [...input.session.observeSessionIds],
      loopId: input.session.loopId,
      loop: input.loop ? {
        ...input.loop,
      } : null,
      nextActions: [...input.session.nextActions],
      runner: {
        ...input.session.runner,
        args: [...input.session.runner.args],
      },
      lastVerification: input.session.lastVerification ? {
        ...input.session.lastVerification,
        reasons: [...input.session.lastVerification.reasons],
        missingEvidence: [...input.session.lastVerification.missingEvidence],
      } : null,
      lastRecoveryAction: input.session.lastRecoveryAction ? { ...input.session.lastRecoveryAction } : null,
      autonomy: {
        ...input.session.autonomy,
      },
    },
    recovery: {
      resumeStrategy: input.resumeStrategy ? {
        ...input.resumeStrategy,
      } : null,
      recoveryPlan: input.recoveryPlan ? {
        ...input.recoveryPlan,
        actions: [...input.recoveryPlan.actions],
      } : null,
    },
  };
}

async function readTaskLoopContext(cwd: string, loopId: string | null): Promise<TaskContext["taskState"]["loop"]> {
  if (!loopId) {
    return null;
  }

  try {
    const loop = await readLoopState(cwd, loopId);
    return {
      id: loop.id,
      taskEnvId: loop.taskEnvId,
      status: loop.status,
      iterations: loop.iterations.length,
      updatedAt: loop.updatedAt,
    };
  } catch {
    return null;
  }
}

async function buildTaskContextWithRuntime(
  cwd: string,
  base: Omit<TaskContext, "taskState" | "recovery">,
  input: {
    session: TaskSession;
    resumeStrategy?: TaskResumeStrategy | null;
    recoveryPlan?: TaskRecoveryPlan | null;
  },
): Promise<TaskContext> {
  const loop = await readTaskLoopContext(cwd, input.session.loopId);
  return buildTaskContext(base, {
    ...input,
    loop,
  });
}

async function writeTaskContextStore(cwd: string, taskId: string, context: TaskContext): Promise<void> {
  await writeJsonStore(getContextPath(cwd, taskId), context);
}

function detectCurrentTool(): string | null {
  const rawValue = process.env.BBG_CURRENT_TOOL?.trim().toLowerCase();
  return rawValue?.length ? rawValue : null;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function detectHermesStrategy(): TaskContext["hermesQuery"]["strategy"] {
  if (process.env.BBG_FORCE_HERMES?.trim() === "1") {
    return "forced";
  }

  if (process.env.BBG_DISABLE_HERMES?.trim() === "1") {
    return "disabled";
  }

  return "default";
}

function prependHermesReviewAction(actions: string[]): string[] {
  const filtered = actions.filter((action) => action !== "review-hermes-context");
  return ["review-hermes-context", ...filtered];
}

async function assertInitialized(cwd: string): Promise<void> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  parseConfig(await readTextFile(configPath));
}

async function readConfig(cwd: string) {
  const configPath = join(cwd, ".bbg", "config.json");
  return parseConfig(await readTextFile(configPath));
}

function detectRunnerMode(currentTool: string | null): TaskRunnerState["mode"] {
  return currentTool ? "current" : "prepare";
}

function createRunnerState(input?: Partial<TaskRunnerState>): TaskRunnerState {
  return {
    mode: "prepare",
    tool: null,
    launched: false,
    command: null,
    args: [],
    launchedAt: null,
    lastAttemptAt: null,
    lastLaunchError: null,
    ...input,
  };
}

function createAutonomyState(input?: Partial<TaskSession["autonomy"]>): TaskSession["autonomy"] {
  const defaults = buildDefaultRuntimeConfig().autonomy;
  return {
    maxAttempts: defaults.maxAttempts,
    maxVerifyFailures: defaults.maxVerifyFailures,
    maxDurationMs: defaults.maxDurationMs,
    verifyFailureCount: 0,
    escalated: false,
    escalationReason: null,
    escalatedAt: null,
    ...input,
  };
}

function setTaskError(session: TaskSession, message: string, blockedReason?: string): void {
  const timestamp = new Date().toISOString();
  session.lastError = message;
  session.lastErrorAt = timestamp;
  session.updatedAt = timestamp;
  if (blockedReason) {
    session.blockedReason = blockedReason;
    session.status = "blocked";
  }
}

function clearTaskError(session: TaskSession): void {
  session.lastError = null;
  session.lastErrorAt = null;
  session.blockedReason = null;
}

function deriveRetryPlan(failureReason: string | null | undefined): {
  currentStep: TaskSession["currentStep"];
  nextActions: string[];
} {
  const normalizedReason = failureReason?.toLowerCase() ?? "";
  if (normalizedReason.includes("observation-empty")
    || normalizedReason.includes("observation-partial")
    || normalizedReason.includes("observation-evidence")) {
    return {
      currentStep: "verify",
      nextActions: ["collect-evidence", "verify"],
    };
  }

  if (normalizedReason.includes("checkpoint-or-runtime-verification-failed")) {
    return {
      currentStep: "implement",
      nextActions: ["investigate-failures", "implement", "verify"],
    };
  }

  return {
    currentStep: "implement",
    nextActions: ["implement", "verify"],
  };
}

function needsObservationRecovery(session: TaskSession): boolean {
  const normalizedReason = session.lastError?.toLowerCase() ?? "";
  const missingEvidence = session.lastVerification?.missingEvidence ?? [];
  return missingEvidence.includes("observation-evidence")
    || normalizedReason.includes("observation-empty")
    || normalizedReason.includes("observation-partial")
    || normalizedReason.includes("observation-evidence");
}

function deriveAutonomyEscalation(session: TaskSession, now = new Date()): {
  exceeded: boolean;
  reason: string | null;
} {
  if (session.autonomy.escalated && session.autonomy.escalationReason) {
    return {
      exceeded: true,
      reason: session.autonomy.escalationReason,
    };
  }

  if (session.attemptCount > session.autonomy.maxAttempts) {
    return {
      exceeded: true,
      reason: `attempt budget exceeded (${session.attemptCount}/${session.autonomy.maxAttempts})`,
    };
  }

  if (session.autonomy.verifyFailureCount >= session.autonomy.maxVerifyFailures) {
    return {
      exceeded: true,
      reason: `verification failure budget exceeded (${session.autonomy.verifyFailureCount}/${session.autonomy.maxVerifyFailures})`,
    };
  }

  const startedAt = Date.parse(session.startedAt);
  if (Number.isFinite(startedAt)) {
    const elapsedMs = now.getTime() - startedAt;
    if (elapsedMs > session.autonomy.maxDurationMs) {
      return {
        exceeded: true,
        reason: `task duration budget exceeded (${elapsedMs}ms/${session.autonomy.maxDurationMs}ms)`,
      };
    }
  }

  return {
    exceeded: false,
    reason: null,
  };
}

function applyAutonomyEscalation(session: TaskSession, reason: string, at: string): TaskSession {
  return {
    ...session,
    status: "blocked",
    currentStep: "review",
    nextActions: ["manual-review"],
    lastError: reason,
    lastErrorAt: at,
    blockedReason: "autonomy budget exceeded",
    lastRecoveryAction: {
      kind: "autonomy-budget-escalation",
      at,
      detail: reason,
    },
    autonomy: {
      ...session.autonomy,
      escalated: true,
      escalationReason: reason,
      escalatedAt: at,
    },
  };
}

function deriveResumeStrategy(session: TaskSession, defaultTool: string | null): TaskResumeStrategy {
  const lastRunnerTool = session.runner.launched && session.runner.tool ? session.runner.tool : null;
  if (lastRunnerTool) {
    return {
      kind: "last-runner",
      preferredTool: lastRunnerTool,
      fallbackTool: defaultTool && defaultTool !== lastRunnerTool ? defaultTool : null,
      reason: session.status === "blocked"
        ? "retry the most recent successful runner before falling back"
        : "continue with the most recent successful runner",
    };
  }

  if (defaultTool) {
    return {
      kind: "default-runner",
      preferredTool: defaultTool,
      fallbackTool: null,
      reason: "no successful runner recorded; use the configured default runner",
    };
  }

  return {
    kind: "manual",
    preferredTool: null,
    fallbackTool: null,
    reason: "no runner is configured; resume from the current AI tool or terminal manually",
  };
}

function deriveRecoveryPlan(session: TaskSession, resumeStrategy: TaskResumeStrategy): TaskRecoveryPlan {
  if (session.status === "completed") {
    return {
      kind: "none",
      actions: [],
      reason: "task is already completed",
    };
  }

  if (session.status === "blocked") {
    if (session.autonomy.escalated) {
      return {
        kind: "manual-review",
        actions: ["manual-review"],
        reason: session.autonomy.escalationReason ?? "autonomy budget exceeded and requires manual review",
      };
    }

    if (session.blockedReason === "task-env recovery failed") {
      return {
        kind: "manual-review",
        actions: ["repair-task-env", "resume"],
        reason: "task environment recovery failed and requires manual review",
      };
    }

    return {
      kind: "resume-runner",
      actions: ["resume"],
      reason: `task is blocked; retry using ${resumeStrategy.preferredTool ?? "the current tool"} first`,
    };
  }

  if ((session.status === "retrying" || session.status === "verifying")
    && session.nextActions.includes("collect-evidence")) {
    return {
      kind: "collect-evidence",
      actions: session.nextActions,
      reason: "task needs more observation evidence before verification can complete",
    };
  }

  const missingEvidence = session.lastVerification?.missingEvidence ?? [];
  if ((session.status === "retrying" || session.status === "verifying")
    && missingEvidence.includes("observation-evidence")) {
    return {
      kind: "collect-evidence",
      actions: ["collect-evidence", "verify"],
      reason: "verification is missing observation evidence",
    };
  }

  if (session.status === "retrying" || session.status === "implementing") {
    return {
      kind: "retry-implement",
      actions: session.nextActions.length > 0 ? session.nextActions : ["implement", "verify"],
      reason: "task should continue implementation and then re-run verification",
    };
  }

  if (session.status === "prepared" || session.status === "planning" || session.status === "ready") {
    return {
      kind: "resume-runner",
      actions: ["resume"],
      reason: `task is prepared; continue with ${resumeStrategy.preferredTool ?? "manual resume"}`,
    };
  }

  return {
    kind: "manual-review",
    actions: session.nextActions,
    reason: "task needs manual review before the next recovery step",
  };
}

async function readLatestAnalyzeSummary(cwd: string): Promise<{
  runId: string | null;
  status: string | null;
  scope: string | null;
}> {
  const pathValue = join(cwd, ".bbg", "analyze", "latest.json");
  if (!(await exists(pathValue))) {
    return {
      runId: null,
      status: null,
      scope: null,
    };
  }

  const parsed = JSON.parse(await readTextFile(pathValue)) as Record<string, unknown>;
  return {
    runId: typeof parsed.runId === "string" ? parsed.runId : null,
    status: typeof parsed.status === "string" ? parsed.status : null,
    scope: typeof parsed.scope === "string" ? parsed.scope : null,
  };
}

async function allocateTaskId(cwd: string, task: string): Promise<string> {
  const base = slugifyValue(task);
  let candidate = base;
  let counter = 2;

  while (await exists(getTaskRoot(cwd, candidate))) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function writeHandoff(cwd: string, taskId: string, input: {
  task: string;
  summary: string;
  commandSpecPath: string;
  references: string[];
  decisions: Record<string, { decision: string; reasons: string[] }>;
  taskEnvId: string | null;
  observeSessionIds: string[];
  hermesRecommendations: string[];
  hermesQuery: TaskContext["hermesQuery"];
  status: TaskSession["status"];
  currentStep: TaskSession["currentStep"];
  runner: TaskSession["runner"];
  loopId: TaskSession["loopId"];
  loop: TaskContext["taskState"]["loop"];
  lastVerification: TaskSession["lastVerification"];
  lastRecoveryAction: TaskSession["lastRecoveryAction"];
  autonomy: TaskSession["autonomy"];
  resumeStrategy?: TaskResumeStrategy;
  recoveryPlan?: TaskRecoveryPlan;
  nextActions: string[];
}): Promise<void> {
  const lines = [
    "# Task Handoff",
    "",
    `- Task ID: ${taskId}`,
    `- Task: ${input.task}`,
    `- Workflow Summary: ${input.summary}`,
    `- Command Spec: ${input.commandSpecPath}`,
    `- Task Environment: ${input.taskEnvId ?? "(none)"}`,
    `- Observation Sessions: ${input.observeSessionIds.length > 0 ? input.observeSessionIds.join(", ") : "(none)"}`,
    "",
    "## Task State",
    "",
    `- Status: ${input.status}`,
    `- Current Step: ${input.currentStep ?? "(none)"}`,
    `- Runner: ${input.runner.tool ?? input.runner.mode}`,
    `- Runner Launched: ${input.runner.launched ? "yes" : "no"}`,
    `- Loop: ${input.loopId ?? "(none)"}`,
    ...(input.loop
      ? [
          `- Loop Status: ${input.loop.status}`,
          `- Loop Iterations: ${input.loop.iterations}`,
          `- Loop Updated At: ${input.loop.updatedAt}`,
        ]
      : ["- Loop Status: (none)", "- Loop Iterations: (none)", "- Loop Updated At: (none)"]),
    ...(input.runner.command
      ? [`- Runner Command: ${[input.runner.command, ...input.runner.args].join(" ")}`]
      : ["- Runner Command: (none)"]),
    "",
    "## References",
    "",
    ...input.references.map((reference) => `- ${reference}`),
    "",
    "## Decisions",
    "",
    ...Object.entries(input.decisions).flatMap(([name, decision]) => [
      `### ${name}`,
      "",
      `- Decision: ${decision.decision}`,
      ...(decision.reasons.length > 0 ? decision.reasons.map((reason) => `- Reason: ${reason}`) : ["- Reason: (none)"]),
      "",
    ]),
    "## Hermes Recommendations",
    "",
    ...(input.hermesRecommendations.length > 0
      ? input.hermesRecommendations.map((recommendation) => `- ${recommendation}`)
      : ["- (none)"]),
    "",
    "## Hermes Query",
    "",
    `- Executed: ${input.hermesQuery.executed ? "yes" : "no"}`,
    `- Strategy: ${input.hermesQuery.strategy}`,
    `- Topic: ${input.hermesQuery.topic ?? "(none)"}`,
    `- Summary: ${input.hermesQuery.summary ?? "(none)"}`,
    `- Command Spec: ${input.hermesQuery.commandSpecPath ?? "(none)"}`,
    `- Influenced Workflow: ${input.hermesQuery.influencedWorkflow ? "yes" : "no"}`,
    `- Influenced Recovery: ${input.hermesQuery.influencedRecovery ? "yes" : "no"}`,
    `- Influenced Verification: ${input.hermesQuery.influencedVerification ? "yes" : "no"}`,
    ...(
      input.hermesQuery.references.length > 0
        ? ["- References:", ...input.hermesQuery.references.map((reference) => `  - ${reference}`)]
        : ["- References: (none)"]
    ),
    "",
    "## Verification State",
    "",
    ...(input.lastVerification
      ? [
          `- Verified At: ${input.lastVerification.verifiedAt}`,
          `- OK: ${input.lastVerification.ok ? "yes" : "no"}`,
          `- Observation Readiness: ${input.lastVerification.observationReadiness}`,
          ...(input.lastVerification.reasons.length > 0
            ? ["- Reasons:", ...input.lastVerification.reasons.map((reason) => `  - ${reason}`)]
            : ["- Reasons: (none)"]),
          ...(input.lastVerification.missingEvidence.length > 0
            ? ["- Missing Evidence:", ...input.lastVerification.missingEvidence.map((item) => `  - ${item}`)]
            : ["- Missing Evidence: (none)"]),
        ]
      : ["- Verified At: (none)", "- OK: (none)", "- Observation Readiness: (none)", "- Reasons: (none)", "- Missing Evidence: (none)"]),
    "",
    "## Recovery",
    "",
    ...(input.lastRecoveryAction
      ? [
          `- Last Recovery Action: ${input.lastRecoveryAction.kind}`,
          `- Recovery At: ${input.lastRecoveryAction.at}`,
          `- Recovery Detail: ${input.lastRecoveryAction.detail}`,
        ]
      : ["- Last Recovery Action: (none)", "- Recovery At: (none)", "- Recovery Detail: (none)"]),
    ...(input.resumeStrategy
      ? [
          `- Resume Strategy: ${input.resumeStrategy.kind}`,
          `- Preferred Tool: ${input.resumeStrategy.preferredTool ?? "(none)"}`,
          `- Fallback Tool: ${input.resumeStrategy.fallbackTool ?? "(none)"}`,
          `- Resume Reason: ${input.resumeStrategy.reason}`,
        ]
      : []),
    ...(input.recoveryPlan
      ? [
          `- Recovery Plan: ${input.recoveryPlan.kind}`,
          `- Recovery Reason: ${input.recoveryPlan.reason}`,
          ...(input.recoveryPlan.actions.length > 0
            ? ["- Recovery Actions:", ...input.recoveryPlan.actions.map((action) => `  - ${action}`)]
            : ["- Recovery Actions: (none)"]),
        ]
      : []),
    "",
    "## Autonomy Guardrails",
    "",
    `- Attempt Budget: ${input.autonomy.maxAttempts}`,
    `- Verify Failure Budget: ${input.autonomy.maxVerifyFailures}`,
    `- Verify Failure Count: ${input.autonomy.verifyFailureCount}`,
    `- Duration Budget (ms): ${input.autonomy.maxDurationMs}`,
    `- Escalated: ${input.autonomy.escalated ? "yes" : "no"}`,
    `- Escalation Reason: ${input.autonomy.escalationReason ?? "(none)"}`,
    `- Escalated At: ${input.autonomy.escalatedAt ?? "(none)"}`,
    "",
    "## Next Actions",
    "",
    ...(input.nextActions.length > 0 ? input.nextActions.map((action) => `- ${action}`) : ["- (none)"]),
    "",
  ];
  await writeTextFile(getHandoffPath(cwd, taskId), lines.join("\n"));
}

export async function startTask(cwd: string, task: string): Promise<StartTaskResult> {
  await assertInitialized(cwd);
  const config = await readConfig(cwd);

  const taskText = task.trim();
  if (taskText.length === 0) {
    throw new Error("start requires task text.");
  }

  const taskId = await allocateTaskId(cwd, taskText);
  const now = new Date().toISOString();
  let tool = detectCurrentTool();
  const sessionPath = getSessionPath(cwd, taskId);
  const session: TaskSession = {
    version: TASK_STORE_VERSION,
    taskId,
    task: taskText,
    status: "planning",
    entrypoint: "start",
    tool,
    startedAt: now,
    updatedAt: now,
    workflowKind: "plan",
    currentStep: "workflow-plan",
    attemptCount: 1,
    taskEnvId: null,
    observeSessionIds: [],
    loopId: null,
    nextActions: [],
    lastError: null,
    lastErrorAt: null,
    blockedReason: null,
    runner: {
      ...createRunnerState({
        mode: detectRunnerMode(tool),
        tool,
        lastAttemptAt: now,
      }),
    },
    lastVerification: null,
    lastRecoveryAction: null,
    autonomy: createAutonomyState(config.runtime?.autonomy),
  };
  await writeJsonStore(sessionPath, session);

  const workflow = await runWorkflowCommand({ cwd, kind: "plan", task: taskText });

  let taskEnvId: string | null = null;
  if (workflow.decisions.taskEnv.decision === "required") {
    session.currentStep = "task-env";
    session.updatedAt = new Date().toISOString();
    await writeJsonStore(sessionPath, session);
    try {
      const taskEnv = await runTaskEnvCommand({ cwd, mode: "start", task: taskText });
      taskEnvId = taskEnv.env?.id ?? null;
    } catch (error: unknown) {
      setTaskError(session, error instanceof Error ? error.message : String(error), "task-env setup failed");
      await writeJsonStore(sessionPath, session);
      throw error;
    }
  }

  const observeSessionIds: string[] = [];
  if (workflow.decisions.observe.decision === "required") {
    session.currentStep = "observe";
    session.updatedAt = new Date().toISOString();
    await writeJsonStore(sessionPath, session);
    try {
      const observe = await runObserveCommand({
        cwd,
        mode: "start",
        topic: taskText,
        envId: taskEnvId ?? undefined,
      });
      if (observe.session?.id) {
        observeSessionIds.push(observe.session.id);
      }
    } catch (error: unknown) {
      setTaskError(session, error instanceof Error ? error.message : String(error), "observation setup failed");
      await writeJsonStore(sessionPath, session);
      throw error;
    }
  }

  const hermesRecommendations = [...workflow.hermesRecommendations];
  const hermesStrategy = detectHermesStrategy();
  const hermesQuery: TaskContext["hermesQuery"] = {
    executed: false,
    strategy: hermesStrategy,
    topic: null,
    summary: null,
    commandSpecPath: null,
    references: [],
    influencedWorkflow: false,
    influencedRecovery: false,
    influencedVerification: false,
  };
  if (hermesStrategy !== "disabled" && (workflow.decisions.hermesQuery.decision === "recommended" || hermesStrategy === "forced")) {
    session.currentStep = "hermes-query";
    session.updatedAt = new Date().toISOString();
    await writeJsonStore(sessionPath, session);
    try {
      const hermes = await runHermesCommand({ cwd, kind: "query", topic: taskText });
      hermesRecommendations.unshift(hermes.summary);
      hermesQuery.executed = true;
      hermesQuery.topic = hermes.topic;
      hermesQuery.summary = hermes.summary;
      hermesQuery.commandSpecPath = hermes.commandSpecPath;
      hermesQuery.references = hermes.references;
      hermesQuery.influencedWorkflow = true;
    } catch (error: unknown) {
      setTaskError(session, error instanceof Error ? error.message : String(error), "hermes query failed");
      await writeJsonStore(sessionPath, session);
      throw error;
    }
  }

  session.currentStep = "handoff";
  session.updatedAt = new Date().toISOString();
  session.workflowKind = workflow.kind;
  session.taskEnvId = taskEnvId;
  session.observeSessionIds = observeSessionIds;
  session.nextActions = hermesQuery.executed ? prependHermesReviewAction(workflow.nextActions) : workflow.nextActions;
  session.status = tool ? "implementing" : "prepared";
  clearTaskError(session);
  let context: TaskContext = await buildTaskContextWithRuntime(cwd, {
    version: TASK_STORE_VERSION,
    taskId,
    analyzeRunId: (await readLatestAnalyzeSummary(cwd)).runId,
    references: workflow.references,
    commandSpecPath: workflow.commandSpecPath,
    summary: workflow.summary,
    hermesRecommendations,
    hermesQuery,
  }, {
    session,
  });
  const wikiArtifact = await writeTaskWikiArtifact({
    cwd,
    taskId,
    task: taskText,
    summary: workflow.summary,
    commandSpecPath: workflow.commandSpecPath,
    references: context.references,
    taskEnvId,
    nextActions: session.nextActions,
    hermesSummary: hermesQuery.summary,
  });
  context = {
    ...context,
    references: unique([...context.references, "docs/wiki/index.md", wikiArtifact.wikiPath]),
  };

  const decisionsPath = getDecisionsPath(cwd, taskId);
  const contextPath = getContextPath(cwd, taskId);
  await Promise.all([
    writeJsonStore(sessionPath, session),
    writeJsonStore(decisionsPath, workflow.decisions),
    writeTaskContextStore(cwd, taskId, context),
    writeHandoff(cwd, taskId, {
      task: taskText,
      summary: workflow.summary,
      commandSpecPath: workflow.commandSpecPath,
      references: context.references,
      decisions: workflow.decisions,
      taskEnvId,
      observeSessionIds,
      hermesRecommendations,
      hermesQuery,
      status: session.status,
      currentStep: session.currentStep,
      runner: session.runner,
      loopId: session.loopId,
      loop: context.taskState.loop,
      lastVerification: session.lastVerification,
      lastRecoveryAction: session.lastRecoveryAction,
      autonomy: session.autonomy,
      nextActions: workflow.nextActions,
    }),
  ]);

  if (!tool) {
    try {
      const launched = await launchConfiguredAgentRunner({
        cwd,
        config,
        taskId,
        task: taskText,
        handoffPath: ".bbg/tasks/" + taskId + "/handoff.md",
        contextPath: ".bbg/tasks/" + taskId + "/context.json",
        decisionsPath: ".bbg/tasks/" + taskId + "/decisions.json",
        taskStatus: session.status,
        currentStep: session.currentStep,
        attemptCount: session.attemptCount,
        verifyFailureCount: session.autonomy.verifyFailureCount,
        autonomyEscalated: session.autonomy.escalated,
        autonomyEscalationReason: session.autonomy.escalationReason,
        loopId: session.loopId,
        loopStatus: context.taskState.loop?.status ?? null,
        loopIterations: context.taskState.loop?.iterations ?? null,
      });
      if (launched) {
        const launchedAt = launched.launchedAt ?? new Date().toISOString();
        tool = launched.tool;
        session.tool = tool;
        session.status = "implementing";
        session.runner = createRunnerState({
          mode: "agent",
          tool,
          launched: true,
          command: launched.command,
          args: launched.args,
          launchedAt,
          lastAttemptAt: launchedAt,
          lastLaunchError: null,
        });
        session.currentStep = "implement";
        session.updatedAt = new Date().toISOString();
        clearTaskError(session);
        await writeJsonStore(sessionPath, session);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setTaskError(session, error instanceof Error ? error.message : String(error), "runner launch failed");
      session.runner = createRunnerState({
        mode: "agent",
        tool: config.agentRunner?.defaultTool?.trim() || null,
        launched: false,
        lastAttemptAt: new Date().toISOString(),
        lastLaunchError: message,
      });
      await writeJsonStore(sessionPath, session);
    }
  } else {
    session.runner = createRunnerState({
      mode: "current",
      tool,
      launched: true,
      launchedAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      lastLaunchError: null,
    });
    session.currentStep = "implement";
    session.updatedAt = new Date().toISOString();
    await writeJsonStore(sessionPath, session);
  }

  context = await buildTaskContextWithRuntime(cwd, context, { session });
  await writeTaskContextStore(cwd, taskId, context);

  await writeHandoff(cwd, taskId, {
    task: taskText,
    summary: workflow.summary,
    commandSpecPath: workflow.commandSpecPath,
    references: context.references,
    decisions: workflow.decisions,
    taskEnvId: session.taskEnvId,
    observeSessionIds: session.observeSessionIds,
    hermesRecommendations,
    hermesQuery,
    status: session.status,
    currentStep: session.currentStep,
    runner: session.runner,
    loopId: session.loopId,
    loop: context.taskState.loop,
    lastVerification: session.lastVerification,
    lastRecoveryAction: session.lastRecoveryAction,
    autonomy: session.autonomy,
    nextActions: session.nextActions,
  });

  return {
    session,
    decisions: workflow.decisions,
    context,
    handoffPath: ".bbg/tasks/" + taskId + "/handoff.md",
    contextPath: ".bbg/tasks/" + taskId + "/context.json",
    decisionsPath: ".bbg/tasks/" + taskId + "/decisions.json",
  };
}

export async function readTaskSession(cwd: string, taskId: string): Promise<TaskSession> {
  const session = await readJsonStore(getSessionPath(cwd, taskId), {
    version: TASK_STORE_VERSION,
    taskId: "",
    task: "",
    status: "prepared",
    entrypoint: "start",
    tool: null,
    startedAt: "",
    updatedAt: "",
    workflowKind: "plan",
    currentStep: null,
    attemptCount: 0,
    taskEnvId: null,
    observeSessionIds: [],
    loopId: null,
    nextActions: [],
    lastError: null,
    lastErrorAt: null,
    blockedReason: null,
    runner: {
      ...createRunnerState(),
    },
    lastVerification: null,
    lastRecoveryAction: null,
    autonomy: createAutonomyState(),
  } satisfies TaskSession, isTaskSession);
  if (session.taskId.length === 0) {
    throw new Error(`Task '${taskId}' not found.`);
  }
  return session;
}

export async function updateTaskSessionAfterVerify(input: {
  cwd: string;
  taskId: string;
  ok: boolean;
  failureReason?: string | null;
  summary?: Omit<TaskVerificationSummary, "verifiedAt">;
  hermesQueryExecuted?: boolean;
}): Promise<TaskSession> {
  const session = await readTaskSession(input.cwd, input.taskId);
  const updatedAt = new Date().toISOString();
  const retryPlan = deriveRetryPlan(input.failureReason);

  const updatedSession: TaskSession = {
    ...session,
    status: input.ok ? "completed" : "retrying",
    currentStep: input.ok ? "complete" : retryPlan.currentStep,
    updatedAt,
    nextActions: input.ok
      ? []
      : (input.hermesQueryExecuted ? prependHermesReviewAction(retryPlan.nextActions) : retryPlan.nextActions),
    lastError: input.ok ? null : (input.failureReason ?? "verification incomplete"),
    lastErrorAt: input.ok ? null : updatedAt,
    blockedReason: null,
    lastVerification: input.summary ? {
      ...input.summary,
      verifiedAt: updatedAt,
    } : session.lastVerification,
    lastRecoveryAction: session.lastRecoveryAction,
    autonomy: {
      ...session.autonomy,
      verifyFailureCount: input.ok ? session.autonomy.verifyFailureCount : session.autonomy.verifyFailureCount + 1,
      escalated: input.ok ? false : session.autonomy.escalated,
      escalationReason: input.ok ? null : session.autonomy.escalationReason,
      escalatedAt: input.ok ? null : session.autonomy.escalatedAt,
    },
  };
  const autonomy = deriveAutonomyEscalation(updatedSession, new Date(updatedAt));
  const finalSession = autonomy.exceeded && autonomy.reason
    ? applyAutonomyEscalation(updatedSession, autonomy.reason, updatedAt)
    : updatedSession;

  await writeJsonStore(getSessionPath(input.cwd, input.taskId), finalSession);
  return finalSession;
}

export async function syncTaskContextFromSession(input: {
  cwd: string;
  taskId: string;
  session: TaskSession;
  defaultTool?: string | null;
  hermesQueryPatch?: Partial<TaskContext["hermesQuery"]>;
}): Promise<TaskContext> {
  const current = await readJsonStore(getContextPath(input.cwd, input.taskId), {
    version: TASK_STORE_VERSION,
    taskId: "",
    analyzeRunId: null,
    references: [],
    commandSpecPath: "",
    summary: "",
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
      status: "prepared",
      currentStep: null,
      taskEnvId: null,
      observeSessionIds: [],
      loopId: null,
      loop: null,
      nextActions: [],
      runner: {
        ...createRunnerState(),
      },
      lastVerification: null,
      lastRecoveryAction: null,
      autonomy: createAutonomyState(),
    },
    recovery: {
      resumeStrategy: null,
      recoveryPlan: null,
    },
  } satisfies TaskContext, isTaskContext);
  const resumeStrategy = deriveResumeStrategy(input.session, input.defaultTool?.trim() || null);
  const recoveryPlan = deriveRecoveryPlan(input.session, resumeStrategy);
  const updated = await buildTaskContextWithRuntime(input.cwd, {
    ...current,
    hermesQuery: {
      ...current.hermesQuery,
      ...input.hermesQueryPatch,
    },
  }, {
    session: input.session,
    resumeStrategy,
    recoveryPlan,
  });
  await writeTaskContextStore(input.cwd, input.taskId, updated);
  return updated;
}

export async function assignLoopToTask(input: {
  cwd: string;
  taskId: string;
  loopId: string;
}): Promise<TaskSession> {
  await assertInitialized(input.cwd);
  const [config, session] = await Promise.all([
    readConfig(input.cwd),
    readTaskSession(input.cwd, input.taskId),
  ]);
  const updatedSession: TaskSession = {
    ...session,
    loopId: input.loopId,
    status: session.status === "completed" || session.status === "blocked" ? session.status : "verifying",
    currentStep: session.status === "completed" ? "complete" : "verify",
    nextActions: session.nextActions.includes("verify")
      ? session.nextActions
      : [...session.nextActions, "verify"],
    updatedAt: new Date().toISOString(),
  };
  const resumeStrategy = deriveResumeStrategy(updatedSession, config.agentRunner?.defaultTool?.trim() || null);
  const recoveryPlan = deriveRecoveryPlan(updatedSession, resumeStrategy);
  const current = await readJsonStore(getContextPath(input.cwd, input.taskId), {
    version: TASK_STORE_VERSION,
    taskId: "",
    analyzeRunId: null,
    references: [],
    commandSpecPath: "",
    summary: "",
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
      status: "prepared",
      currentStep: null,
      taskEnvId: null,
      observeSessionIds: [],
      loopId: null,
      loop: null,
      nextActions: [],
      runner: {
        ...createRunnerState(),
      },
      lastVerification: null,
      lastRecoveryAction: null,
      autonomy: createAutonomyState(),
    },
    recovery: {
      resumeStrategy: null,
      recoveryPlan: null,
    },
  } satisfies TaskContext, isTaskContext);
  const updatedContext = await buildTaskContextWithRuntime(input.cwd, current, {
    session: updatedSession,
    resumeStrategy,
    recoveryPlan,
  });
  const decisions = await readJsonStore(getDecisionsPath(input.cwd, input.taskId), {
    taskEnv: { decision: "not-required", reasons: [] },
    observe: { decision: "not-required", reasons: [] },
    tdd: { decision: "optional", reasons: [] },
    security: { decision: "not-required", reasons: [] },
    loop: { decision: "not-required", reasons: [] },
    hermesQuery: { decision: "not-required", reasons: [] },
  }, (value): value is StartTaskResult["decisions"] => isRecord(value));

  await Promise.all([
    writeJsonStore(getSessionPath(input.cwd, input.taskId), updatedSession),
    writeTaskContextStore(input.cwd, input.taskId, updatedContext),
    writeHandoff(input.cwd, input.taskId, {
      task: updatedSession.task,
      summary: current.summary,
      commandSpecPath: current.commandSpecPath,
      references: current.references,
      decisions,
      taskEnvId: updatedSession.taskEnvId,
      observeSessionIds: updatedSession.observeSessionIds,
      hermesRecommendations: current.hermesRecommendations,
      hermesQuery: current.hermesQuery,
      status: updatedSession.status,
      currentStep: updatedSession.currentStep,
      runner: updatedSession.runner,
      loopId: updatedSession.loopId,
      loop: updatedContext.taskState.loop,
      lastVerification: updatedSession.lastVerification,
      lastRecoveryAction: updatedSession.lastRecoveryAction,
      autonomy: updatedSession.autonomy,
      resumeStrategy,
      recoveryPlan,
      nextActions: updatedSession.nextActions,
    }),
  ]);

  return updatedSession;
}

export async function inferActiveTaskSession(cwd: string): Promise<TaskSession | null> {
  await assertInitialized(cwd);
  const fromEnv = process.env.BBG_TASK_ID?.trim();
  if (fromEnv) {
    try {
      return await readTaskSession(cwd, fromEnv);
    } catch {
      // ignore stale env value
    }
  }

  const sessions = await listTaskSessions(cwd);
  return sessions.find((session) => session.status !== "completed") ?? null;
}

export async function resumeTask(cwd: string, taskId: string): Promise<StartTaskResult> {
  await assertInitialized(cwd);
  const config = await readConfig(cwd);

  const session = await readTaskSession(cwd, taskId);
  if (session.status === "completed") {
    throw new Error(`Task '${taskId}' is already completed and cannot be resumed.`);
  }
  const decisions = await readJsonStore(getDecisionsPath(cwd, taskId), {
    taskEnv: { decision: "not-required", reasons: [] },
    observe: { decision: "not-required", reasons: [] },
    tdd: { decision: "optional", reasons: [] },
    security: { decision: "not-required", reasons: [] },
    loop: { decision: "not-required", reasons: [] },
    hermesQuery: { decision: "not-required", reasons: [] },
  }, (value): value is StartTaskResult["decisions"] => isRecord(value));
  const context = await readJsonStore(getContextPath(cwd, taskId), {
    version: TASK_STORE_VERSION,
    taskId: "",
    analyzeRunId: null,
    references: [],
    commandSpecPath: "",
    summary: "",
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
      status: "prepared",
      currentStep: null,
      taskEnvId: null,
      observeSessionIds: [],
      loopId: null,
      loop: null,
      nextActions: [],
      runner: {
        ...createRunnerState(),
      },
      lastVerification: null,
      lastRecoveryAction: null,
      autonomy: createAutonomyState(),
    },
    recovery: {
      resumeStrategy: null,
      recoveryPlan: null,
    },
  } satisfies TaskContext, isTaskContext);

  const now = new Date().toISOString();
  const currentTool = detectCurrentTool();
  const autonomyExceededBeforeResume = deriveAutonomyEscalation(session, new Date(now));
  if (autonomyExceededBeforeResume.exceeded && autonomyExceededBeforeResume.reason) {
    const escalatedSession = applyAutonomyEscalation({
      ...session,
      entrypoint: "resume",
      updatedAt: now,
      attemptCount: session.attemptCount + 1,
    }, autonomyExceededBeforeResume.reason, now);
    const resumeStrategy = deriveResumeStrategy(escalatedSession, config.agentRunner?.defaultTool?.trim() || null);
    const recoveryPlan = deriveRecoveryPlan(escalatedSession, resumeStrategy);
    const updatedContext = await buildTaskContextWithRuntime(cwd, context, {
      session: escalatedSession,
      resumeStrategy,
      recoveryPlan,
    });
    await Promise.all([
      writeJsonStore(getSessionPath(cwd, taskId), escalatedSession),
      writeTaskContextStore(cwd, taskId, updatedContext),
      writeHandoff(cwd, taskId, {
        task: escalatedSession.task,
        summary: context.summary,
        commandSpecPath: context.commandSpecPath,
        references: context.references,
        decisions,
        taskEnvId: escalatedSession.taskEnvId,
        observeSessionIds: escalatedSession.observeSessionIds,
        hermesRecommendations: context.hermesRecommendations,
        hermesQuery: context.hermesQuery,
        status: escalatedSession.status,
        currentStep: escalatedSession.currentStep,
        runner: escalatedSession.runner,
        loopId: escalatedSession.loopId,
        loop: updatedContext.taskState.loop,
        lastVerification: escalatedSession.lastVerification,
        lastRecoveryAction: escalatedSession.lastRecoveryAction,
        autonomy: escalatedSession.autonomy,
        resumeStrategy,
        recoveryPlan,
        nextActions: escalatedSession.nextActions,
      }),
    ]);

    return {
      session: escalatedSession,
      decisions,
      context: updatedContext,
      handoffPath: ".bbg/tasks/" + taskId + "/handoff.md",
      contextPath: ".bbg/tasks/" + taskId + "/context.json",
      decisionsPath: ".bbg/tasks/" + taskId + "/decisions.json",
    };
  }

  let tool = currentTool;
  let status = session.status === "failed" || session.status === "blocked" ? "retrying" : session.status;
  let lastError = session.lastError;
  let lastErrorAt = session.lastErrorAt;
  let blockedReason = session.blockedReason;
  const retryPlan = deriveRetryPlan(session.lastError);
  const runner: TaskRunnerState = createRunnerState({
    ...session.runner,
    mode: currentTool ? "current" : session.runner.mode,
    tool,
    lastAttemptAt: now,
  });

  if (session.taskEnvId) {
    try {
      const attached = await runTaskEnvCommand({ cwd, mode: "attach", id: session.taskEnvId });
      if (attached.env?.status === "stale" || attached.env?.status === "broken") {
        await runTaskEnvCommand({ cwd, mode: "repair", id: session.taskEnvId });
      }
    } catch (error: unknown) {
      status = "blocked";
      lastError = error instanceof Error ? error.message : String(error);
      lastErrorAt = now;
      blockedReason = "task-env recovery failed";
    }
  }

  if (status !== "blocked" && !tool) {
    const preferredRunnerTool = session.runner.launched && session.runner.tool ? session.runner.tool : null;
    try {
      const launched = await launchConfiguredAgentRunner({
        cwd,
        config,
        taskId,
        task: session.task,
        handoffPath: ".bbg/tasks/" + taskId + "/handoff.md",
        contextPath: ".bbg/tasks/" + taskId + "/context.json",
        decisionsPath: ".bbg/tasks/" + taskId + "/decisions.json",
        taskStatus: status,
        currentStep: retryPlan.currentStep,
        resumeStrategyKind: deriveResumeStrategy(session, config.agentRunner?.defaultTool?.trim() || null).kind,
        recoveryPlanKind: deriveRecoveryPlan(session, deriveResumeStrategy(session, config.agentRunner?.defaultTool?.trim() || null)).kind,
        recoveryActions: deriveRecoveryPlan(session, deriveResumeStrategy(session, config.agentRunner?.defaultTool?.trim() || null)).actions,
        attemptCount: session.attemptCount,
        verifyFailureCount: session.autonomy.verifyFailureCount,
        autonomyEscalated: session.autonomy.escalated,
        autonomyEscalationReason: session.autonomy.escalationReason,
        loopId: session.loopId,
        loopStatus: context.taskState.loop?.status ?? null,
        loopIterations: context.taskState.loop?.iterations ?? null,
        preferredTool: preferredRunnerTool,
      });
      if (launched) {
        const launchedAt = launched.launchedAt ?? now;
        tool = launched.tool;
        status = session.status === "retrying" ? (retryPlan.currentStep === "verify" ? "verifying" : "implementing") : "implementing";
        lastError = null;
        lastErrorAt = null;
        blockedReason = null;
        runner.mode = "agent";
        runner.tool = tool;
        runner.launched = true;
        runner.command = launched.command;
        runner.args = launched.args;
        runner.launchedAt = launchedAt;
        runner.lastAttemptAt = launchedAt;
        runner.lastLaunchError = null;
      } else {
        const fallbackTool = preferredRunnerTool && preferredRunnerTool !== config.agentRunner?.defaultTool?.trim()
          ? config.agentRunner?.defaultTool?.trim() ?? null
          : null;
        if (fallbackTool) {
          const fallbackLaunched = await launchConfiguredAgentRunner({
            cwd,
            config,
            taskId,
            task: session.task,
            handoffPath: ".bbg/tasks/" + taskId + "/handoff.md",
            contextPath: ".bbg/tasks/" + taskId + "/context.json",
            decisionsPath: ".bbg/tasks/" + taskId + "/decisions.json",
            taskStatus: status,
            currentStep: retryPlan.currentStep,
            resumeStrategyKind: deriveResumeStrategy(session, config.agentRunner?.defaultTool?.trim() || null).kind,
            recoveryPlanKind: deriveRecoveryPlan(session, deriveResumeStrategy(session, config.agentRunner?.defaultTool?.trim() || null)).kind,
            recoveryActions: deriveRecoveryPlan(session, deriveResumeStrategy(session, config.agentRunner?.defaultTool?.trim() || null)).actions,
            attemptCount: session.attemptCount,
            verifyFailureCount: session.autonomy.verifyFailureCount,
            autonomyEscalated: session.autonomy.escalated,
            autonomyEscalationReason: session.autonomy.escalationReason,
            loopId: session.loopId,
            loopStatus: context.taskState.loop?.status ?? null,
            loopIterations: context.taskState.loop?.iterations ?? null,
            preferredTool: fallbackTool,
          });
          if (fallbackLaunched) {
            const launchedAt = fallbackLaunched.launchedAt ?? now;
            tool = fallbackLaunched.tool;
            status = session.status === "retrying" ? (retryPlan.currentStep === "verify" ? "verifying" : "implementing") : "implementing";
            lastError = null;
            lastErrorAt = null;
            blockedReason = null;
            runner.mode = "agent";
            runner.tool = tool;
            runner.launched = true;
            runner.command = fallbackLaunched.command;
            runner.args = fallbackLaunched.args;
            runner.launchedAt = launchedAt;
            runner.lastAttemptAt = launchedAt;
            runner.lastLaunchError = null;
          } else {
            status = "prepared";
            runner.mode = "prepare";
            runner.tool = null;
            runner.launched = false;
            runner.command = null;
            runner.args = [];
            runner.launchedAt = null;
            runner.lastLaunchError = null;
          }
        } else {
          status = "prepared";
          runner.mode = "prepare";
          runner.tool = null;
          runner.launched = false;
          runner.command = null;
          runner.args = [];
          runner.launchedAt = null;
          runner.lastLaunchError = null;
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = message;
      lastErrorAt = now;
      blockedReason = "runner launch failed";
      status = "blocked";
      runner.mode = "agent";
      runner.launched = false;
      runner.lastAttemptAt = now;
      runner.lastLaunchError = message;
    }
  } else if (currentTool) {
    status = session.status === "retrying" ? (retryPlan.currentStep === "verify" ? "verifying" : "implementing") : "implementing";
    lastError = null;
    lastErrorAt = null;
    blockedReason = null;
    runner.mode = "current";
    runner.tool = tool;
    runner.launched = true;
    runner.command = null;
    runner.args = [];
    runner.launchedAt = now;
    runner.lastAttemptAt = now;
    runner.lastLaunchError = null;
  }

  let observeSessionIds = [...session.observeSessionIds];
  let lastRecoveryAction = session.lastRecoveryAction;
  if (status !== "blocked"
    && session.taskEnvId
    && observeSessionIds.length === 0
    && needsObservationRecovery(session)) {
    try {
      const observe = await runObserveCommand({
        cwd,
        mode: "start",
        topic: session.task,
        envId: session.taskEnvId,
      });
      if (observe.session?.id) {
        observeSessionIds = [observe.session.id];
        lastRecoveryAction = {
          kind: "auto-observe-start",
          at: now,
          detail: `started observation session '${observe.session.id}' for recovery`,
        };
      }
    } catch {
      // Best effort only; resume should still succeed without a fresh observe session.
    }
  }

  const resumedSession: TaskSession = {
    ...session,
    entrypoint: "resume",
    tool,
    status,
    updatedAt: now,
    currentStep: status === "blocked" ? session.currentStep : (status === "verifying" || status === "implementing" ? retryPlan.currentStep : "implement"),
    attemptCount: session.attemptCount + 1,
    observeSessionIds,
    nextActions: status === "verifying" || status === "implementing" ? retryPlan.nextActions : session.nextActions,
    lastError,
    lastErrorAt,
    blockedReason,
    runner,
    lastRecoveryAction,
    autonomy: session.autonomy,
  };
  const autonomy = deriveAutonomyEscalation(resumedSession, new Date(now));
  const finalResumedSession = autonomy.exceeded && autonomy.reason
    ? applyAutonomyEscalation(resumedSession, autonomy.reason, now)
    : resumedSession;
  const resumeStrategy = deriveResumeStrategy(finalResumedSession, config.agentRunner?.defaultTool?.trim() || null);
  const recoveryPlan = deriveRecoveryPlan(finalResumedSession, resumeStrategy);
  const updatedContext = await buildTaskContextWithRuntime(cwd, context, {
    session: finalResumedSession,
    resumeStrategy,
    recoveryPlan,
  });
  await Promise.all([
    writeJsonStore(getSessionPath(cwd, taskId), finalResumedSession),
    writeTaskContextStore(cwd, taskId, updatedContext),
    writeHandoff(cwd, taskId, {
      task: finalResumedSession.task,
      summary: context.summary,
      commandSpecPath: context.commandSpecPath,
      references: context.references,
      decisions,
      taskEnvId: finalResumedSession.taskEnvId,
      observeSessionIds: finalResumedSession.observeSessionIds,
      hermesRecommendations: context.hermesRecommendations,
      hermesQuery: context.hermesQuery,
      status: finalResumedSession.status,
      currentStep: finalResumedSession.currentStep,
      runner: finalResumedSession.runner,
      loopId: finalResumedSession.loopId,
      loop: updatedContext.taskState.loop,
      lastVerification: finalResumedSession.lastVerification,
      lastRecoveryAction: finalResumedSession.lastRecoveryAction,
      autonomy: finalResumedSession.autonomy,
      resumeStrategy,
      recoveryPlan,
      nextActions: finalResumedSession.nextActions,
    }),
  ]);

  return {
    session: finalResumedSession,
    decisions,
    context: updatedContext,
    handoffPath: ".bbg/tasks/" + taskId + "/handoff.md",
    contextPath: ".bbg/tasks/" + taskId + "/context.json",
    decisionsPath: ".bbg/tasks/" + taskId + "/decisions.json",
  };
}

export async function listTaskSessions(cwd: string): Promise<TaskSession[]> {
  const root = join(cwd, ".bbg", "tasks");
  if (!(await exists(root))) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const sessions = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        readJsonStore(getSessionPath(cwd, entry.name), {
          version: TASK_STORE_VERSION,
          taskId: "",
          task: "",
          status: "prepared",
          entrypoint: "start",
          tool: null,
          startedAt: "",
          updatedAt: "",
          workflowKind: "plan",
          currentStep: null,
          attemptCount: 0,
          taskEnvId: null,
          observeSessionIds: [],
          loopId: null,
          nextActions: [],
          lastError: null,
          lastErrorAt: null,
          blockedReason: null,
          runner: {
            ...createRunnerState(),
          },
          lastVerification: null,
          lastRecoveryAction: null,
          autonomy: createAutonomyState(),
        } satisfies TaskSession, isTaskSession),
      ),
  );

  return sessions
    .filter((session) => session.taskId.length > 0)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function readTaskStatusSummary(cwd: string): Promise<TaskStatusSummary> {
  await assertInitialized(cwd);
  const [config, taskSessions, loopStates] = await Promise.all([readConfig(cwd), listTaskSessions(cwd), listLoopStates(cwd)]);
  const defaultTool = config.agentRunner?.defaultTool?.trim() || null;
  const tasks: TaskStatusEntry[] = taskSessions.map((task) => {
    const resumeStrategy = deriveResumeStrategy(task, defaultTool);
    return {
      ...task,
      resumeStrategy,
      recoveryPlan: deriveRecoveryPlan(task, resumeStrategy),
    };
  });
  const observationIds = [...new Set(tasks.flatMap((task) => task.observeSessionIds))];
  const observations = (
    await Promise.all(
      observationIds.map(async (id): Promise<TaskObservationSummary | null> => {
        try {
          const summary = await summarizeObserveSession(cwd, id);
          return {
            id: summary.id,
            topic: summary.topic,
            envId: summary.envId,
            rootPath: summary.rootPath,
            uiArtifacts: summary.uiArtifacts,
            logArtifacts: summary.logArtifacts,
            metricArtifacts: summary.metricArtifacts,
            traceArtifacts: summary.traceArtifacts,
            evidenceKinds: summary.evidenceKinds,
            totalArtifacts: summary.totalArtifacts,
            readiness: summary.readiness,
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter((summary): summary is TaskObservationSummary => summary !== null);

  return {
    analyze: await readLatestAnalyzeSummary(cwd),
    tasks,
    taskEnvs: await listTaskEnvs(cwd),
    observations,
    loops: loopStates.map((loop) => ({
      id: loop.id,
      taskId: loop.taskId,
      taskEnvId: loop.taskEnvId,
      status: loop.status,
      iterations: loop.iterations.length,
      updatedAt: loop.updatedAt,
    })),
  };
}
