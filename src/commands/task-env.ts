import { join } from "node:path";
import { parseConfig } from "../config/read-write.js";
import { exists, readTextFile } from "../utils/fs.js";
import {
  attachTaskEnv,
  finishTaskEnv,
  listTaskEnvs,
  repairTaskEnv,
  startTaskEnv,
  type TaskEnvManifest,
} from "../runtime/task-envs.js";

export interface RunTaskEnvCommandInput {
  cwd: string;
  mode: "start" | "finish" | "status" | "attach" | "repair";
  task?: string;
  id?: string;
  baseRef?: string;
}

export interface RunTaskEnvCommandResult {
  mode: "start" | "finish" | "status" | "attach" | "repair";
  env?: TaskEnvManifest;
  envs?: TaskEnvManifest[];
}

async function assertInitialized(cwd: string): Promise<void> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  parseConfig(await readTextFile(configPath));
}

export async function runTaskEnvCommand(input: RunTaskEnvCommandInput): Promise<RunTaskEnvCommandResult> {
  await assertInitialized(input.cwd);

  if (input.mode === "status") {
    return {
      mode: "status",
      envs: await listTaskEnvs(input.cwd),
    };
  }

  if (input.mode === "start") {
    if (!input.task || input.task.trim().length === 0) {
      throw new Error("task-env start requires task text.");
    }

    return {
      mode: "start",
      env: await startTaskEnv({ cwd: input.cwd, task: input.task, baseRef: input.baseRef }),
    };
  }

  if (!input.id || input.id.trim().length === 0) {
    throw new Error(`task-env ${input.mode} requires an environment id.`);
  }

  if (input.mode === "attach") {
    return {
      mode: "attach",
      env: await attachTaskEnv({ cwd: input.cwd, id: input.id }),
    };
  }

  if (input.mode === "repair") {
    return {
      mode: "repair",
      env: await repairTaskEnv({ cwd: input.cwd, id: input.id }),
    };
  }

  return {
    mode: "finish",
    env: await finishTaskEnv({ cwd: input.cwd, id: input.id }),
  };
}
