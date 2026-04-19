import { spawn } from "node:child_process";
import type { BbgConfig } from "../config/schema.js";

export interface LaunchAgentRunnerInput {
  cwd: string;
  config: BbgConfig;
  taskId: string;
  task: string;
  handoffPath: string;
  contextPath: string;
  decisionsPath: string;
  taskStatus?: string | null;
  currentStep?: string | null;
  loopId?: string | null;
  loopStatus?: string | null;
  loopIterations?: number | null;
  resumeStrategyKind?: string | null;
  recoveryPlanKind?: string | null;
  recoveryActions?: string[];
  reviewGateLevel?: string | null;
  reviewGateReviewers?: string[];
  reviewGatePack?: string[];
  reviewGateStopConditions?: string[];
  attemptCount?: number | null;
  verifyFailureCount?: number | null;
  autonomyEscalated?: boolean | null;
  autonomyEscalationReason?: string | null;
  preferredTool?: string | null;
}

export interface LaunchAgentRunnerResult {
  tool: string;
  command: string;
  args: string[];
  launchedAt: string;
}

function applyTemplate(value: string, input: LaunchAgentRunnerInput): string {
  return value
    .replaceAll("{taskId}", input.taskId)
    .replaceAll("{task}", input.task)
    .replaceAll("{handoffPath}", input.handoffPath)
    .replaceAll("{contextPath}", input.contextPath)
    .replaceAll("{decisionsPath}", input.decisionsPath)
    .replaceAll("{taskStatus}", input.taskStatus ?? "")
    .replaceAll("{currentStep}", input.currentStep ?? "")
    .replaceAll("{loopId}", input.loopId ?? "")
    .replaceAll("{loopStatus}", input.loopStatus ?? "")
    .replaceAll("{loopIterations}", input.loopIterations === null || input.loopIterations === undefined ? "" : String(input.loopIterations))
    .replaceAll("{resumeStrategyKind}", input.resumeStrategyKind ?? "")
    .replaceAll("{recoveryPlanKind}", input.recoveryPlanKind ?? "")
    .replaceAll("{recoveryActions}", (input.recoveryActions ?? []).join(","))
    .replaceAll("{reviewGateLevel}", input.reviewGateLevel ?? "")
    .replaceAll("{reviewGateReviewers}", (input.reviewGateReviewers ?? []).join(","))
    .replaceAll("{reviewGatePack}", (input.reviewGatePack ?? []).join(","))
    .replaceAll("{reviewGateStopConditions}", (input.reviewGateStopConditions ?? []).join(","))
    .replaceAll("{attemptCount}", input.attemptCount === null || input.attemptCount === undefined ? "" : String(input.attemptCount))
    .replaceAll("{verifyFailureCount}", input.verifyFailureCount === null || input.verifyFailureCount === undefined ? "" : String(input.verifyFailureCount))
    .replaceAll("{autonomyEscalated}", input.autonomyEscalated === null || input.autonomyEscalated === undefined ? "" : String(input.autonomyEscalated))
    .replaceAll("{autonomyEscalationReason}", input.autonomyEscalationReason ?? "");
}

export async function launchConfiguredAgentRunner(
  input: LaunchAgentRunnerInput,
): Promise<LaunchAgentRunnerResult | null> {
  const agentRunner = input.config.agentRunner;
  const preferredTool = input.preferredTool?.trim();
  const tool = preferredTool || agentRunner?.defaultTool?.trim();
  if (!tool) {
    return null;
  }

  const toolConfig = agentRunner.tools?.[tool];
  if (!toolConfig || toolConfig.command.trim().length === 0) {
    return null;
  }

  const args = (toolConfig.args ?? []).map((arg) => applyTemplate(arg, input));
  const env = {
    ...process.env,
    ...Object.fromEntries(
      Object.entries(toolConfig.env ?? {}).map(([key, value]) => [key, applyTemplate(value, input)]),
    ),
    BBG_CURRENT_TOOL: tool,
    BBG_TASK_ID: input.taskId,
    BBG_TASK: input.task,
    BBG_HANDOFF_PATH: input.handoffPath,
    BBG_CONTEXT_PATH: input.contextPath,
    BBG_DECISIONS_PATH: input.decisionsPath,
    BBG_TASK_STATUS: input.taskStatus ?? "",
    BBG_TASK_STEP: input.currentStep ?? "",
    BBG_LOOP_ID: input.loopId ?? "",
    BBG_LOOP_STATUS: input.loopStatus ?? "",
    BBG_LOOP_ITERATIONS: input.loopIterations === null || input.loopIterations === undefined ? "" : String(input.loopIterations),
    BBG_RESUME_STRATEGY: input.resumeStrategyKind ?? "",
    BBG_RECOVERY_PLAN: input.recoveryPlanKind ?? "",
    BBG_RECOVERY_ACTIONS: (input.recoveryActions ?? []).join(","),
    BBG_REVIEW_GATE_LEVEL: input.reviewGateLevel ?? "",
    BBG_REVIEW_GATE_REVIEWERS: (input.reviewGateReviewers ?? []).join(","),
    BBG_REVIEW_GATE_PACK: (input.reviewGatePack ?? []).join(","),
    BBG_REVIEW_GATE_STOP_CONDITIONS: (input.reviewGateStopConditions ?? []).join(","),
    BBG_ATTEMPT_COUNT: input.attemptCount === null || input.attemptCount === undefined ? "" : String(input.attemptCount),
    BBG_VERIFY_FAILURE_COUNT: input.verifyFailureCount === null || input.verifyFailureCount === undefined ? "" : String(input.verifyFailureCount),
    BBG_AUTONOMY_ESCALATED: input.autonomyEscalated === null || input.autonomyEscalated === undefined ? "" : String(input.autonomyEscalated),
    BBG_AUTONOMY_ESCALATION_REASON: input.autonomyEscalationReason ?? "",
  };

  const child = spawn(toolConfig.command, args, {
    cwd: input.cwd,
    env,
    detached: toolConfig.detached ?? true,
    stdio: "ignore",
  });

  child.unref();

  return {
    tool,
    command: toolConfig.command,
    args,
    launchedAt: new Date().toISOString(),
  };
}
