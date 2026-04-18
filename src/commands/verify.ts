import { join } from "node:path";
import type { BbgConfig } from "../config/schema.js";
import { parseConfig } from "../config/read-write.js";
import { assertPolicyAllowsCommand } from "../policy/engine.js";
import { verifyCheckpoint, type VerifyResult } from "../runtime/checkpoints.js";
import { summarizeObserveSession } from "../runtime/observe.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import { getTaskRoot, listTaskSessions, readTaskSession, syncTaskContextFromSession, updateTaskSessionAfterVerify } from "../runtime/tasks.js";
import { writeVerifyWikiArtifacts } from "../runtime/wiki.js";
import { exists, readTextFile } from "../utils/fs.js";
import type { WorkflowDecisionSet } from "../workflow/types.js";

export interface RunVerifyCommandInput {
  cwd: string;
  checkpoint?: string;
}

export interface RunVerifyCommandResult extends VerifyResult {
  taskVerification: {
    taskId: string;
    status: string;
    currentStep: string | null;
    taskEnvId: string | null;
    ok: boolean;
    reasons: string[];
    missingEvidence: string[];
    observeRequired: boolean;
    observationReadiness: "not-required" | "empty" | "partial" | "ready";
    observations: Array<{
      id: string;
      readiness: "empty" | "partial" | "ready";
      totalArtifacts: number;
      evidenceKinds: string[];
    }>;
    hermesQueryExecuted: boolean;
  } | null;
}

async function loadConfig(cwd: string): Promise<BbgConfig> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  return parseConfig(await readTextFile(configPath));
}

async function inferTaskId(cwd: string): Promise<string | null> {
  const fromEnv = process.env.BBG_TASK_ID?.trim();
  if (fromEnv) {
    try {
      const session = await readTaskSession(cwd, fromEnv);
      return session.taskId;
    } catch {
      // Ignore stale environment variable and fall back to latest task session.
    }
  }

  const sessions = await listTaskSessions(cwd);
  return sessions.find((session) => session.status !== "completed")?.taskId ?? null;
}

async function readTaskDecisions(cwd: string, taskId: string): Promise<WorkflowDecisionSet | null> {
  const decisionsPath = join(getTaskRoot(cwd, taskId), "decisions.json");
  if (!(await exists(decisionsPath))) {
    return null;
  }

  return JSON.parse(await readTextFile(decisionsPath)) as WorkflowDecisionSet;
}

async function buildTaskVerificationContext(cwd: string): Promise<RunVerifyCommandResult["taskVerification"]> {
  const taskId = await inferTaskId(cwd);
  if (!taskId) {
    return null;
  }

  const [session, decisions] = await Promise.all([
    readTaskSession(cwd, taskId),
    readTaskDecisions(cwd, taskId),
  ]);
  const hermesQueryExecuted = process.env.BBG_DISABLE_HERMES?.trim() === "1"
    ? false
    : session.nextActions.includes("review-hermes-context");
  const observations = (
    await Promise.all(
      session.observeSessionIds.map(async (id) => {
        try {
          const summary = await summarizeObserveSession(cwd, id);
          return {
            id: summary.id,
            readiness: summary.readiness,
            totalArtifacts: summary.totalArtifacts,
            evidenceKinds: summary.evidenceKinds,
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter((summary): summary is NonNullable<typeof summary> => summary !== null);

  const observeRequired = decisions?.observe.decision === "required";
  let observationReadiness: "not-required" | "empty" | "partial" | "ready" = "not-required";
  if (observeRequired) {
    if (observations.some((observation) => observation.readiness === "ready")) {
      observationReadiness = "ready";
    } else if (observations.some((observation) => observation.readiness === "partial")) {
      observationReadiness = "partial";
    } else {
      observationReadiness = "empty";
    }
  }

  const reasons: string[] = [];
  const missingEvidence: string[] = [];
  if (session.status === "blocked" || session.status === "failed") {
    reasons.push(`task-status-${session.status}`);
    missingEvidence.push("task-not-ready");
  }
  if (observeRequired && observationReadiness !== "ready") {
    reasons.push(`observation-${observationReadiness}`);
    missingEvidence.push("observation-evidence");
  }

  const ok = reasons.length === 0;

  return {
    taskId: session.taskId,
    status: session.status,
    currentStep: session.currentStep,
    taskEnvId: session.taskEnvId,
    ok,
    reasons,
    missingEvidence,
    observeRequired,
    observationReadiness,
    observations,
    hermesQueryExecuted,
  };
}

export async function runVerifyCommand(input: RunVerifyCommandInput): Promise<RunVerifyCommandResult> {
  const config = await loadConfig(input.cwd);
  const runtime = config.runtime ?? buildDefaultRuntimeConfig();
  await assertPolicyAllowsCommand({ cwd: input.cwd, runtime, command: "verify" });
  const result = await verifyCheckpoint({ cwd: input.cwd, runtime, repos: config.repos, checkpoint: input.checkpoint });
  let taskVerification = await buildTaskVerificationContext(input.cwd);
  if (taskVerification) {
    const sourceSession = await readTaskSession(input.cwd, taskVerification.taskId);
    const reasons = [
      ...(result.ok ? [] : ["checkpoint-or-runtime-verification-failed"]),
      ...taskVerification.reasons,
    ];
    const updatedSession = await updateTaskSessionAfterVerify({
      cwd: input.cwd,
      taskId: taskVerification.taskId,
      ok: result.ok && taskVerification.ok,
      failureReason: reasons.length > 0 ? reasons.join(", ") : null,
      summary: {
        ok: result.ok && taskVerification.ok,
        reasons,
        missingEvidence: taskVerification.missingEvidence,
        observeRequired: taskVerification.observeRequired,
        observationReadiness: taskVerification.observationReadiness,
      },
      hermesQueryExecuted: taskVerification.hermesQueryExecuted,
    });
    await syncTaskContextFromSession({
      cwd: input.cwd,
      taskId: taskVerification.taskId,
      session: updatedSession,
      defaultTool: config.agentRunner?.defaultTool?.trim() || null,
      hermesQueryPatch: taskVerification.hermesQueryExecuted
        ? {
            influencedVerification: true,
            influencedRecovery: !result.ok || !taskVerification.ok,
          }
        : undefined,
    });
    await writeVerifyWikiArtifacts({
      cwd: input.cwd,
      taskId: taskVerification.taskId,
      task: sourceSession.task,
      taskStatus: updatedSession.status,
      observationReadiness: taskVerification.observationReadiness,
      reasons,
      missingEvidence: taskVerification.missingEvidence,
      recoveryPlanKind: updatedSession.status === "completed" ? "none" : "retry-implement",
      recoveryActions: updatedSession.nextActions,
      hermesQueryExecuted: taskVerification.hermesQueryExecuted,
    });
    taskVerification = {
      ...taskVerification,
      status: updatedSession.status,
      currentStep: updatedSession.currentStep,
    };
  }
  return {
    ...result,
    taskVerification,
  };
}
