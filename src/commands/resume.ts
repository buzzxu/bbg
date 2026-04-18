import { resumeTask } from "../runtime/tasks.js";

export interface RunResumeCommandInput {
  cwd: string;
  taskId: string;
}

export async function runResumeCommand(input: RunResumeCommandInput) {
  return resumeTask(input.cwd, input.taskId);
}
