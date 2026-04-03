import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { runCheckpointCommand } from "../commands/checkpoint.js";
import { runQualityGateCommand } from "../commands/quality-gate.js";
import { runVerifyCommand } from "../commands/verify.js";
import { readJsonStore, writeJsonStore } from "../runtime/store.js";
import { exists, writeTextFile } from "../utils/fs.js";
import { gradeDeterministicResult } from "./graders.js";
import {
  isEvalDatasetDocument,
  isEvalExperimentDocument,
  type EvalCommandDefinition,
  type EvalDatasetCase,
  type EvalDatasetDocument,
  type EvalExperimentDocument,
  type EvalSetupStep,
} from "./schema.js";

export interface EvalCaseReport {
  id: string;
  passed: boolean;
  failures: string[];
  actual: Record<string, unknown>;
}

export interface EvalExperimentReport {
  experimentName: string;
  datasetName: string;
  passed: number;
  failed: number;
  results: EvalCaseReport[];
  reportFile?: string;
}

function resolveDocumentPath(cwd: string, filePath: string): string {
  return isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
}

function isPathInsideDirectory(root: string, target: string): boolean {
  const pathRelative = relative(root, target);
  return pathRelative === "" || (!pathRelative.startsWith("..") && !isAbsolute(pathRelative));
}

function resolvePathWithinDirectory(root: string, filePath: string, message: string): string {
  const resolvedPath = resolve(root, filePath);
  if (!isPathInsideDirectory(root, resolvedPath)) {
    throw new Error(message);
  }

  return resolvedPath;
}

function resolveRepoLocalPath(cwd: string, filePath: string, message: string): string {
  const resolvedPath = resolveDocumentPath(cwd, filePath);
  if (!isPathInsideDirectory(cwd, resolvedPath)) {
    throw new Error(message);
  }

  return resolvedPath;
}

function resolveStrictRepoRelativePath(cwd: string, baseDir: string, filePath: string, message: string): string {
  if (isAbsolute(filePath)) {
    throw new Error(message);
  }

  const resolvedPath = resolve(baseDir, filePath);
  if (!isPathInsideDirectory(cwd, resolvedPath)) {
    throw new Error(message);
  }

  return resolvedPath;
}

function toRelativeReportPath(cwd: string, filePath: string): string {
  return filePath.startsWith(`${cwd}/`) ? filePath.slice(cwd.length + 1) : filePath;
}

async function readDatasetDocument(filePath: string): Promise<EvalDatasetDocument> {
  return readJsonStore<EvalDatasetDocument>(
    filePath,
    { version: 1, name: "", description: "", cases: [] },
    isEvalDatasetDocument,
  );
}

async function readExperimentDocument(filePath: string): Promise<EvalExperimentDocument> {
  return readJsonStore<EvalExperimentDocument>(
    filePath,
    { version: 1, name: "", dataset: "" },
    isEvalExperimentDocument,
  );
}

async function runCommand(command: EvalCommandDefinition, cwd: string): Promise<Record<string, unknown>> {
  if (command.name === "quality-gate") {
    const result = await runQualityGateCommand({ cwd });
    return {
      ok: result.ok,
      failedChecks: Object.values(result.checks)
        .filter((check) => !check.ok)
        .map((check) => check.name)
        .sort(),
    };
  }

  if (command.name === "checkpoint") {
    const result = await runCheckpointCommand({ cwd, name: command.options?.name });
    return {
      ok: result.ok,
      checkpointFile: result.checkpointFile,
      failedChecks: Object.values(result.checks)
        .filter((check) => !check.ok)
        .map((check) => check.name)
        .sort(),
    };
  }

  const result = await runVerifyCommand({ cwd, checkpoint: command.options?.checkpoint });
  return {
    ok: result.ok,
    checkpointName: result.checkpointName,
    changedFiles: result.changedFiles,
    mismatchedChecks: Object.entries(result.comparisons)
      .filter(([, comparison]) => !comparison.matchesCheckpoint)
      .map(([name]) => name)
      .sort(),
  };
}

async function applySetupStep(workspace: string, step: EvalSetupStep): Promise<void> {
  if (step.type === "write-file") {
    await writeTextFile(
      resolvePathWithinDirectory(workspace, step.path, "Eval setup write path must stay within the cloned workspace."),
      step.content,
    );
    return;
  }

  const result = await runCommand(step.command, workspace);
  if (result.ok !== true) {
    throw new Error(`Eval setup command failed: ${step.command.name}`);
  }
}

async function cloneWorkspace(sourceWorkspace: string): Promise<string> {
  const tempRoot = await mkdtemp(join(tmpdir(), "bbg-eval-workspace-"));
  const clonedWorkspace = join(tempRoot, "workspace");
  await cp(sourceWorkspace, clonedWorkspace, { recursive: true });
  return tempRoot;
}

async function runEvalCase(datasetDirectory: string, testCase: EvalDatasetCase): Promise<EvalCaseReport> {
  const sourceWorkspace = resolvePathWithinDirectory(
    datasetDirectory,
    testCase.workspace,
    "Eval workspace must stay within the dataset directory.",
  );
  const tempRoot = await cloneWorkspace(sourceWorkspace);
  const workspace = join(tempRoot, "workspace");

  try {
    for (const step of testCase.setup ?? []) {
      await applySetupStep(workspace, step);
    }

    const actual = await runCommand(testCase.command, workspace);
    const graded = gradeDeterministicResult(testCase.expect, actual);
    return {
      id: testCase.id,
      passed: graded.passed,
      failures: graded.failures,
      actual,
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function writeReportIfNeeded(cwd: string, reportFile: string | undefined, report: EvalExperimentReport): Promise<string | undefined> {
  if (reportFile === undefined) {
    return undefined;
  }

  const absoluteReportFile = resolveRepoLocalPath(cwd, reportFile, "Eval report path must stay within the current repository.");
  await writeJsonStore(absoluteReportFile, report);
  return toRelativeReportPath(cwd, absoluteReportFile);
}

export async function runEvalExperiment(input: {
  cwd: string;
  datasetPath?: string;
  experimentPath?: string;
}): Promise<EvalExperimentReport> {
  if (!input.datasetPath && !input.experimentPath) {
    throw new Error("Provide either a dataset path or an experiment path.");
  }

  const experimentFile = input.experimentPath
    ? resolveRepoLocalPath(input.cwd, input.experimentPath, "Eval experiment path must stay within the current repository.")
    : undefined;
  if (experimentFile && !(await exists(experimentFile))) {
    throw new Error(`Eval experiment not found: ${input.experimentPath as string}`);
  }

  const experiment = experimentFile ? await readExperimentDocument(experimentFile) : undefined;
  const datasetFile = input.datasetPath
    ? resolveStrictRepoRelativePath(
        input.cwd,
        input.cwd,
        input.datasetPath,
        "Eval dataset path must stay within the current repository.",
      )
    : resolveStrictRepoRelativePath(
        input.cwd,
        dirname(experimentFile as string),
        experiment?.dataset ?? "",
        "Eval dataset path must stay within the current repository.",
      );

  if (!(await exists(datasetFile))) {
    throw new Error(`Eval dataset not found: ${toRelativeReportPath(input.cwd, datasetFile)}`);
  }

  const dataset = await readDatasetDocument(datasetFile);
  const datasetDirectory = dirname(datasetFile);
  const results: EvalCaseReport[] = [];

  for (const testCase of dataset.cases) {
    results.push(await runEvalCase(datasetDirectory, testCase));
  }

  const report: EvalExperimentReport = {
    experimentName: experiment?.name ?? dataset.name,
    datasetName: dataset.name,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    results,
  };

  const reportFile = await writeReportIfNeeded(
    input.cwd,
    experiment?.reportFile ? resolve(dirname(experimentFile as string), experiment.reportFile) : undefined,
    report,
  );

  return reportFile ? { ...report, reportFile } : report;
}
