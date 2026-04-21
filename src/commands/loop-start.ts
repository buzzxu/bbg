import { join } from "node:path";
import type { BbgConfig } from "../config/schema.js";
import { parseConfig } from "../config/read-write.js";
import { runAutonomousLoop, type LoopState } from "../runtime/loops.js";
import { buildDefaultRuntimeConfig, type RuntimeCommandCheckName } from "../runtime/schema.js";
import { assignLoopToTask, inferActiveTaskSession, readTaskSession } from "../runtime/tasks.js";
import { exists, readTextFile } from "../utils/fs.js";
import { slugifyValue } from "../utils/slug.js";

export interface RunLoopStartCommandInput {
  cwd: string;
  id?: string;
  taskId?: string;
  envId?: string;
  checks?: RuntimeCommandCheckName[];
  maxIterations?: number;
  pollIntervalMs?: number;
  idleTimeoutMs?: number;
}

const DEFAULT_LOOP_CHECKS: RuntimeCommandCheckName[] = ["build", "tests", "typecheck"];

async function loadConfig(cwd: string): Promise<BbgConfig> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  return parseConfig(await readTextFile(configPath));
}

export async function runLoopStartCommand(input: RunLoopStartCommandInput): Promise<LoopState> {
  const config = await loadConfig(input.cwd);
  const runtime = config.runtime ?? buildDefaultRuntimeConfig();
  const taskSession = input.taskId
    ? await readTaskSession(input.cwd, input.taskId).catch(() => null)
    : await inferActiveTaskSession(input.cwd);
  const taskId = input.taskId?.trim() || taskSession?.taskId || null;
  const taskEnvId = input.envId?.trim() || taskSession?.taskEnvId || null;
  const id = slugifyValue(input.id ?? new Date().toISOString(), "loop");
  const checks = input.checks?.length ? input.checks : DEFAULT_LOOP_CHECKS;

  const loop = await runAutonomousLoop({
    cwd: input.cwd,
    runtime,
    repos: config.repos,
    id,
    taskId,
    taskEnvId,
    checks,
    maxIterations: Math.max(1, input.maxIterations ?? 5),
    pollIntervalMs: Math.max(250, input.pollIntervalMs ?? 1000),
    idleTimeoutMs: Math.max(250, input.idleTimeoutMs ?? 5000),
  });

  if (taskId) {
    await assignLoopToTask({
      cwd: input.cwd,
      taskId,
      loopId: loop.id,
    });
  }

  return loop;
}
