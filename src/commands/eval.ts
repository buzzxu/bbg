import { isAbsolute, relative, resolve } from "node:path";
import { buildEvalBenchmarkReport, type EvalBenchmarkReport } from "../evals/benchmark.js";
import { seedEvalArtifacts, type SeedEvalArtifactsResult } from "../evals/datasets.js";
import { summarizeEvalHistory, type EvalHistorySummary } from "../evals/history.js";
import {
  compareEvalReports,
  runEvalExperiment,
  runEvalSuite,
  type EvalCompareResult,
  type EvalExperimentReport,
  type EvalSuiteReport,
} from "../evals/runner.js";
import { writeJsonStore } from "../runtime/store.js";

export interface RunEvalSeedCommandResult extends SeedEvalArtifactsResult {
  mode: "seed";
}

export interface RunEvalRunCommandResult {
  mode: "run";
  report: EvalExperimentReport;
}

export interface RunEvalSuiteCommandResult {
  mode: "suite";
  report: EvalSuiteReport;
}

export interface RunEvalCompareCommandResult {
  mode: "compare";
  comparison: EvalCompareResult;
}

export interface RunEvalHistoryCommandResult {
  mode: "history";
  history: EvalHistorySummary;
}

export interface RunEvalBenchmarkCommandResult {
  mode: "benchmark";
  report: EvalBenchmarkReport;
}

export type RunEvalCommandResult =
  | RunEvalSeedCommandResult
  | RunEvalRunCommandResult
  | RunEvalSuiteCommandResult
  | RunEvalCompareCommandResult
  | RunEvalHistoryCommandResult
  | RunEvalBenchmarkCommandResult;

function resolveRepoLocalPath(cwd: string, filePath: string): string {
  const resolvedPath = resolve(cwd, filePath);
  const pathRelative = relative(cwd, resolvedPath);
  if (isAbsolute(filePath) || (pathRelative !== "" && pathRelative.startsWith(".."))) {
    throw new Error("Eval benchmark report path must stay within the current repository.");
  }

  return resolvedPath;
}

export async function runEvalCommand(input: {
  cwd: string;
  mode: "seed" | "run" | "suite" | "compare" | "history" | "benchmark";
  dataset?: string;
  experiment?: string;
  suite?: string;
  base?: string;
  head?: string;
  limit?: number;
  reportFile?: string;
}): Promise<RunEvalCommandResult> {
  if (input.mode === "seed") {
    return {
      mode: "seed",
      ...(await seedEvalArtifacts({ cwd: input.cwd })),
    };
  }

  if (input.mode === "run") {
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

  if (input.mode === "suite") {
    if (!input.suite) {
      throw new Error("Provide a suite path.");
    }
    const report = await runEvalSuite({
      cwd: input.cwd,
      suitePath: input.suite,
    });
    return {
      mode: "suite",
      report,
    };
  }

  if (input.mode === "history") {
    return {
      mode: "history",
      history: await summarizeEvalHistory(input.cwd, input.limit),
    };
  }

  if (input.mode === "benchmark") {
    const report = await buildEvalBenchmarkReport(input.cwd, input.limit ?? 10);
    if (input.reportFile) {
      const absoluteReportFile = resolveRepoLocalPath(input.cwd, input.reportFile);
      await writeJsonStore(absoluteReportFile, report);
    }

    return {
      mode: "benchmark",
      report,
    };
  }

  if (!input.base || !input.head) {
    throw new Error("Provide both base and head report paths.");
  }

  const comparison = await compareEvalReports({
    cwd: input.cwd,
    basePath: input.base,
    headPath: input.head,
  });
  return {
    mode: "compare",
    comparison,
  };
}
