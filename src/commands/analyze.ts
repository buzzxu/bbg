import { runAnalyzeOrchestrator } from "../analyze/orchestrator.js";
import type { RunAnalyzeCommandInput, RunAnalyzeCommandResult } from "../analyze/types.js";

export type { RunAnalyzeCommandInput, RunAnalyzeCommandResult } from "../analyze/types.js";

export async function runAnalyzeCommand(input: RunAnalyzeCommandInput): Promise<RunAnalyzeCommandResult> {
  const orchestrated = await runAnalyzeOrchestrator(input);
  return orchestrated.result;
}
