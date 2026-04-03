import { seedEvalArtifacts, type SeedEvalArtifactsResult } from "../evals/datasets.js";
import { runEvalExperiment, type EvalExperimentReport } from "../evals/runner.js";

export interface RunEvalSeedCommandResult extends SeedEvalArtifactsResult {
  mode: "seed";
}

export interface RunEvalRunCommandResult {
  mode: "run";
  report: EvalExperimentReport;
}

export type RunEvalCommandResult = RunEvalSeedCommandResult | RunEvalRunCommandResult;

export async function runEvalCommand(input: {
  cwd: string;
  mode: "seed" | "run";
  dataset?: string;
  experiment?: string;
}): Promise<RunEvalCommandResult> {
  if (input.mode === "seed") {
    return {
      mode: "seed",
      ...(await seedEvalArtifacts({ cwd: input.cwd })),
    };
  }

  const report = await runEvalExperiment({
    cwd: input.cwd,
    datasetPath: input.dataset,
    experimentPath: input.experiment,
  });

  return {
    mode: "run",
    report,
  };
}
