import { readTaskStatusSummary } from "../runtime/tasks.js";

export interface RunStatusCommandInput {
  cwd: string;
}

export async function runStatusCommand(input: RunStatusCommandInput) {
  return readTaskStatusSummary(input.cwd);
}
