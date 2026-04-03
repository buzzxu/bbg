import { join } from "node:path";
import type { BbgConfig } from "../config/schema.js";
import { parseConfig } from "../config/read-write.js";
import { assertPolicyAllowsCommand } from "../policy/engine.js";
import { runQualityGate, type QualityGateResult } from "../runtime/quality-gate.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import { exists, readTextFile } from "../utils/fs.js";

export interface RunQualityGateCommandInput {
  cwd: string;
}

async function loadConfig(cwd: string): Promise<BbgConfig> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  return parseConfig(await readTextFile(configPath));
}

export async function runQualityGateCommand(input: RunQualityGateCommandInput): Promise<QualityGateResult> {
  const config = await loadConfig(input.cwd);
  const runtime = config.runtime ?? buildDefaultRuntimeConfig();
  await assertPolicyAllowsCommand({ cwd: input.cwd, runtime, command: "quality-gate" });
  return runQualityGate({ cwd: input.cwd, runtime, repos: config.repos });
}
