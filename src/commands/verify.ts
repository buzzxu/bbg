import { join } from "node:path";
import type { BbgConfig } from "../config/schema.js";
import { parseConfig } from "../config/read-write.js";
import { assertPolicyAllowsCommand } from "../policy/engine.js";
import { verifyCheckpoint, type VerifyResult } from "../runtime/checkpoints.js";
import { summarizeObserveSession } from "../runtime/observe.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import {
  getTaskRoot,
  listTaskSessions,
  readTaskContext,
  readTaskSession,
  syncTaskContextFromSession,
  updateTaskSessionAfterVerify,
} from "../runtime/tasks.js";
import { writeVerifyWikiArtifacts } from "../runtime/wiki.js";
import { appendAnalyzeKnowledgeValidationEvents } from "../analyze/knowledge-validation.js";
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
    reviewGate: {
      level: "none" | "recommended" | "required";
      reason: string;
      reviewPack: string[];
      stopConditions: string[];
    };
    lastReviewResult: {
      reviewer: string;
      status: "passed" | "failed";
      summary: string;
      findings: string[];
    } | null;
    reviewersRecommended: string[];
    guideReferences: string[];
    languageReviewHint: string | null;
    hermesQueryExecuted: boolean;
    matchedKnowledgeItemIds: string[];
    validationEventsPath: string | null;
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

  const [session, decisions, context] = await Promise.all([
    readTaskSession(cwd, taskId),
    readTaskDecisions(cwd, taskId),
    readTaskContext(cwd, taskId),
  ]);
  const hermesQueryExecuted =
    process.env.BBG_DISABLE_HERMES?.trim() === "1" ? false : session.nextActions.includes("review-hermes-context");
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

  const reviewGateRequired = context.reviewGate.level === "required";
  if (reviewGateRequired && !session.lastReviewResult) {
    reasons.push("review-gate-pending");
    missingEvidence.push("language-review");
  } else if (reviewGateRequired && session.lastReviewResult?.status === "failed") {
    reasons.push("review-gate-failed");
    missingEvidence.push("review-findings");
  }

  const ok = reasons.length === 0;

  const executionRoute = context.executionRoute;

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
    reviewGate: {
      level: context.reviewGate.level,
      reason: context.reviewGate.reason,
      reviewPack: [...context.reviewGate.reviewPack],
      stopConditions: [...context.reviewGate.stopConditions],
    },
    lastReviewResult: session.lastReviewResult
      ? {
          reviewer: session.lastReviewResult.reviewer,
          status: session.lastReviewResult.status,
          summary: session.lastReviewResult.summary,
          findings: [...session.lastReviewResult.findings],
        }
      : null,
    reviewersRecommended: executionRoute?.recommendation.reviewerAgents ?? context.languageGuidance.reviewerAgents,
    guideReferences: executionRoute?.recommendation.guideReferences ?? context.languageGuidance.guideReferences,
    languageReviewHint: context.languageGuidance.reviewHint,
    hermesQueryExecuted,
    matchedKnowledgeItemIds: context.impactGuidance.matchedKnowledgeItemIds,
    validationEventsPath: null,
  };
}

export async function runVerifyCommand(input: RunVerifyCommandInput): Promise<RunVerifyCommandResult> {
  const config = await loadConfig(input.cwd);
  const runtime = config.runtime ?? buildDefaultRuntimeConfig();
  await assertPolicyAllowsCommand({ cwd: input.cwd, runtime, command: "verify" });
  const result = await verifyCheckpoint({ cwd: input.cwd, runtime, repos: config.repos, checkpoint: input.checkpoint });
  let taskVerification = await buildTaskVerificationContext(input.cwd);
  if (taskVerification) {
    const tv = taskVerification;
    const sourceSession = await readTaskSession(input.cwd, tv.taskId);
    const reasons = [...(result.ok ? [] : ["checkpoint-or-runtime-verification-failed"]), ...tv.reasons];
    const updatedSession = await updateTaskSessionAfterVerify({
      cwd: input.cwd,
      taskId: tv.taskId,
      ok: result.ok && tv.ok,
      failureReason: reasons.length > 0 ? reasons.join(", ") : null,
      summary: {
        ok: result.ok && tv.ok,
        reasons,
        missingEvidence: tv.missingEvidence,
        observeRequired: tv.observeRequired,
        observationReadiness: tv.observationReadiness,
      },
      hermesQueryExecuted: tv.hermesQueryExecuted,
    });
    await syncTaskContextFromSession({
      cwd: input.cwd,
      taskId: tv.taskId,
      session: updatedSession,
      defaultTool: config.agentRunner?.defaultTool?.trim() || null,
      hermesQueryPatch: tv.hermesQueryExecuted
        ? {
            influencedVerification: true,
            influencedRecovery: !result.ok || !tv.ok,
          }
        : undefined,
    });
    await writeVerifyWikiArtifacts({
      cwd: input.cwd,
      taskId: tv.taskId,
      task: sourceSession.task,
      taskStatus: updatedSession.status,
      observationReadiness: tv.observationReadiness,
      reasons,
      missingEvidence: tv.missingEvidence,
      recoveryPlanKind: updatedSession.status === "completed" ? "none" : "retry-implement",
      recoveryActions: updatedSession.nextActions,
      hermesQueryExecuted: tv.hermesQueryExecuted,
    });

    const validationEventsPath = await appendAnalyzeKnowledgeValidationEvents({
      cwd: input.cwd,
      events: tv.matchedKnowledgeItemIds.map((knowledgeItemId, index) => ({
        id: `verify:${tv.taskId}:${knowledgeItemId}:${result.ok && tv.ok ? "confirmed" : "contradicted"}`,
        knowledgeItemId,
        source: "verify" as const,
        runId: null,
        recordedAt: new Date().toISOString(),
        outcome: result.ok && tv.ok ? ("confirmed" as const) : ("contradicted" as const),
        confidenceDelta: result.ok && tv.ok ? 0.08 : -0.12,
        notes:
          result.ok && tv.ok
            ? `Verification confirmed task alignment (${tv.taskId}).`
            : `Verification found unresolved signals for task ${tv.taskId}.`,
        evidenceRefs: [`verify:task:${tv.taskId}`, `verify:index:${index}`],
      })),
    });

    taskVerification = {
      ...tv,
      status: updatedSession.status,
      currentStep: updatedSession.currentStep,
      validationEventsPath,
    };
  }
  return {
    ...result,
    taskVerification,
  };
}
