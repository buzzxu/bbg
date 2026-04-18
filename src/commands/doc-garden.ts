import { join } from "node:path";
import { parseConfig } from "../config/read-write.js";
import { exists, readTextFile } from "../utils/fs.js";
import { readLatestDocGardenReport, runDocGardenScan, type DocGardenReport } from "../runtime/doc-garden.js";

export interface RunDocGardenCommandInput {
  cwd: string;
  mode: "scan" | "status";
}

export interface RunDocGardenCommandResult {
  mode: "scan" | "status";
  report: DocGardenReport | null;
}

async function assertInitialized(cwd: string): Promise<void> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  parseConfig(await readTextFile(configPath));
}

export async function runDocGardenCommand(input: RunDocGardenCommandInput): Promise<RunDocGardenCommandResult> {
  await assertInitialized(input.cwd);
  if (input.mode === "scan") {
    return { mode: "scan", report: await runDocGardenScan(input.cwd) };
  }

  return { mode: "status", report: await readLatestDocGardenReport(input.cwd) };
}
