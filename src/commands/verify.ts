import { join } from "node:path";
import type { BbgConfig } from "../config/schema.js";
import { parseConfig } from "../config/read-write.js";
import { assertPolicyAllowsCommand } from "../policy/engine.js";
import { verifyCheckpoint, type VerifyResult } from "../runtime/checkpoints.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import { exists, readTextFile } from "../utils/fs.js";

export interface RunVerifyCommandInput {
  cwd: string;
  checkpoint?: string;
}

async function loadConfig(cwd: string): Promise<BbgConfig> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  return parseConfig(await readTextFile(configPath));
}

export async function runVerifyCommand(input: RunVerifyCommandInput): Promise<VerifyResult> {
  const config = await loadConfig(input.cwd);
  const runtime = config.runtime ?? buildDefaultRuntimeConfig();
  await assertPolicyAllowsCommand({ cwd: input.cwd, runtime, command: "verify" });
  return verifyCheckpoint({ cwd: input.cwd, runtime, repos: config.repos, checkpoint: input.checkpoint });
}
