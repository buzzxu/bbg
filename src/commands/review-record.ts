import { readTaskContext, recordTaskReviewResult, syncTaskContextFromSession } from "../runtime/tasks.js";
import type { TaskSession } from "../runtime/task-types.js";

export interface RunReviewRecordCommandInput {
  cwd: string;
  taskId: string;
  reviewer: string;
  status: "passed" | "failed";
  summary: string;
  findings?: string[];
}

export interface RunReviewRecordCommandResult {
  session: TaskSession;
}

export async function runReviewRecordCommand(
  input: RunReviewRecordCommandInput,
): Promise<RunReviewRecordCommandResult> {
  const session = await recordTaskReviewResult({
    cwd: input.cwd,
    taskId: input.taskId,
    reviewer: input.reviewer,
    status: input.status,
    summary: input.summary,
    findings: input.findings,
  });
  const context = await readTaskContext(input.cwd, input.taskId);
  await syncTaskContextFromSession({
    cwd: input.cwd,
    taskId: input.taskId,
    session,
    hermesQueryPatch: context.hermesQuery.executed
      ? { influencedVerification: true }
      : undefined,
  });
  return { session };
}
