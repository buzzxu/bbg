import { join } from "node:path";
import { parseConfig } from "../config/read-write.js";
import { readLoopState, type LoopState } from "../runtime/loops.js";
import { inferActiveTaskSession } from "../runtime/tasks.js";
import { exists, readTextFile } from "../utils/fs.js";

export interface RunLoopStatusCommandInput {
  cwd: string;
  id?: string;
}

async function assertInitialized(cwd: string): Promise<void> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  parseConfig(await readTextFile(configPath));
}

export async function runLoopStatusCommand(input: RunLoopStatusCommandInput): Promise<LoopState> {
  await assertInitialized(input.cwd);
  if (input.id) {
    return readLoopState(input.cwd, input.id);
  }

  const task = await inferActiveTaskSession(input.cwd);
  if (task?.loopId) {
    return readLoopState(input.cwd, task.loopId);
  }

  return readLoopState(input.cwd);
}
