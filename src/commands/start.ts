import { startTask } from "../runtime/tasks.js";

export interface RunStartCommandInput {
  cwd: string;
  task: string;
}

export async function runStartCommand(input: RunStartCommandInput) {
  return startTask(input.cwd, input.task);
}
