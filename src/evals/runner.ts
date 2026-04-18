import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { runAnalyzeCommand } from "../commands/analyze.js";
import { runCheckpointCommand } from "../commands/checkpoint.js";
import { runLoopStartCommand } from "../commands/loop-start.js";
import { runLoopStatusCommand } from "../commands/loop-status.js";
import { runQualityGateCommand } from "../commands/quality-gate.js";
import { runResumeCommand } from "../commands/resume.js";
import { runStartCommand } from "../commands/start.js";
import { runStatusCommand } from "../commands/status.js";
import { runVerifyCommand } from "../commands/verify.js";
import { getTaskRoot, syncTaskContextFromSession, readTaskSession } from "../runtime/tasks.js";
import { readLoopState } from "../runtime/loops.js";
import { readJsonStore, writeJsonStore } from "../runtime/store.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";
import { gradeDeterministicResult } from "./graders.js";
import { appendEvalHistory } from "./history.js";
import { computeEvalMetrics, type EvalCaseMetrics, type EvalExperimentMetrics } from "./metrics.js";
import { buildMetricDiffs, summarizeMetricDiffs } from "./trends.js";
import {
  isEvalDatasetDocument,
  isEvalExperimentDocument,
  isEvalSuiteDocument,
  type EvalCommandDefinition,
  type EvalDatasetCase,
  type EvalDatasetDocument,
  type EvalExperimentDocument,
  type EvalSetupStep,
  type EvalSuiteDocument,
  type EvalTaskflowCase,
  type EvalTaskflowStep,
} from "./schema.js";

export interface EvalCaseReport {
  id: string;
  category: "command" | "taskflow";
  passed: boolean;
  failures: string[];
  actual: Record<string, unknown>;
  metrics?: EvalCaseMetrics;
}

export interface EvalExperimentReport {
  experimentName: string;
  datasetName: string;
  passed: number;
  failed: number;
  metrics: EvalExperimentMetrics;
  results: EvalCaseReport[];
  reportFile?: string;
  generatedAt: string;
}

export interface EvalSuiteReport {
  suiteName: string;
  passed: number;
  failed: number;
  metrics: EvalExperimentMetrics;
  reports: EvalExperimentReport[];
  reportFile?: string;
  generatedAt: string;
}

export interface EvalCompareResult {
  baseName: string;
  headName: string;
  metricDiffs: Record<string, number>;
  regressions: string[];
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

async function readSuiteDocument(filePath: string): Promise<EvalSuiteDocument> {
  return readJsonStore<EvalSuiteDocument>(
    filePath,
    { version: 1, name: "", experiments: [] },
    isEvalSuiteDocument,
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

  if (command.name === "verify") {
    const result = await runVerifyCommand({ cwd, checkpoint: command.options?.checkpoint });
    return {
      ok: result.ok,
      checkpointName: result.checkpointName,
      changedFiles: result.changedFiles,
      mismatchedChecks: Object.entries(result.comparisons)
        .filter(([, comparison]) => !comparison.matchesCheckpoint)
        .map(([name]) => name)
        .sort(),
      taskVerification: result.taskVerification,
    };
  }

  if (command.name === "analyze") {
    const result = await runAnalyzeCommand({
      cwd,
      repos: command.options?.repo ? [command.options.repo] : undefined,
      refresh: command.options?.refresh === "true",
    });
    return {
      ok: true,
      scope: result.scope,
      analyzedRepos: result.analyzedRepos,
      docsUpdated: result.docsUpdated,
      knowledgeUpdated: result.knowledgeUpdated,
    };
  }

  if (command.name === "status") {
    const result = await runStatusCommand({ cwd });
    return {
      ok: true,
      tasks: result.tasks,
      analyze: result.analyze,
      taskEnvs: result.taskEnvs,
      observations: result.observations,
      loops: result.loops,
    };
  }

  throw new Error(`Command eval does not support '${command.name}'. Use a taskflow dataset instead.`);
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

interface TaskflowState {
  lastTaskId: string | null;
  lastLoopId: string | null;
  env: Record<string, string | null>;
  commandResults: Array<Record<string, unknown>>;
}

function deriveCommandMetrics(actual: Record<string, unknown>): EvalCaseMetrics {
  const analyzedRepos = Array.isArray(actual.analyzedRepos) ? actual.analyzedRepos : [];
  const docsUpdated = Array.isArray(actual.docsUpdated) ? actual.docsUpdated : [];
  const knowledgeUpdated = Array.isArray(actual.knowledgeUpdated) ? actual.knowledgeUpdated : [];

  return {
    workspaceAnalyzed: actual.scope === "workspace" && analyzedRepos.length > 1,
    workspaceKnowledgeRecorded: actual.scope === "workspace" && docsUpdated.length > 0 && knowledgeUpdated.length > 0,
  };
}

async function withTemporaryEnv<T>(envValues: Record<string, string | null>, action: () => Promise<T>): Promise<T> {
  const previousValues = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(envValues)) {
    previousValues.set(key, process.env[key]);
    if (value === null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await action();
  } finally {
    for (const [key, previous] of previousValues.entries()) {
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  }
}

function resolveTaskIdForStep(state: TaskflowState, explicitTaskId?: string): string {
  const taskId = explicitTaskId?.trim() || state.lastTaskId;
  if (!taskId) {
    throw new Error("Taskflow step requires a task id but none is available yet.");
  }

  return taskId;
}

async function runTaskflowCommandStep(
  cwd: string,
  state: TaskflowState,
  command: EvalCommandDefinition,
): Promise<Record<string, unknown>> {
  if (command.name === "start") {
    const task = command.options?.task?.trim();
    if (!task) {
      throw new Error("Taskflow start command requires options.task.");
    }
    const result = await withTemporaryEnv(state.env, () => runStartCommand({ cwd, task }));
    state.lastTaskId = result.session.taskId;
    return {
      ok: true,
      taskId: result.session.taskId,
      status: result.session.status,
      currentStep: result.session.currentStep,
      tool: result.session.tool,
    };
  }

  if (command.name === "resume") {
    const taskId = resolveTaskIdForStep(state, command.options?.taskId);
    const result = await withTemporaryEnv(state.env, () => runResumeCommand({ cwd, taskId }));
    state.lastTaskId = result.session.taskId;
    return {
      ok: true,
      taskId: result.session.taskId,
      status: result.session.status,
      currentStep: result.session.currentStep,
      tool: result.session.tool,
    };
  }

  if (command.name === "status") {
    const result = await withTemporaryEnv(state.env, () => runStatusCommand({ cwd }));
    return {
      ok: true,
      tasks: result.tasks.map((task) => ({
        taskId: task.taskId,
        status: task.status,
        currentStep: task.currentStep,
      })),
      loops: result.loops.map((loop) => ({
        id: loop.id,
        status: loop.status,
        taskId: loop.taskId,
      })),
    };
  }

  if (command.name === "checkpoint") {
    const result = await withTemporaryEnv(state.env, () => runCheckpointCommand({
      cwd,
      name: command.options?.name,
    }));
    return {
      ok: result.ok,
      checkpointFile: result.checkpointFile,
    };
  }

  if (command.name === "verify") {
    const result = await withTemporaryEnv(state.env, () => runVerifyCommand({ cwd, checkpoint: command.options?.checkpoint }));
    if (result.taskVerification?.taskId) {
      state.lastTaskId = result.taskVerification.taskId;
    }
    return {
      ok: result.ok,
      taskVerification: result.taskVerification,
    };
  }

  if (command.name === "loop-start") {
    const checks = command.options?.checks
      ?.split(",")
      .map((value) => value.trim())
      .filter((value): value is "build" | "tests" | "typecheck" | "lint" =>
        value === "build" || value === "tests" || value === "typecheck" || value === "lint");
    const result = await withTemporaryEnv(state.env, () => runLoopStartCommand({
      cwd,
      id: command.options?.id,
      taskId: command.options?.taskId ?? state.lastTaskId ?? undefined,
      envId: command.options?.envId,
      checks,
      maxIterations: command.options?.maxIterations ? Number.parseInt(command.options.maxIterations, 10) : undefined,
      pollIntervalMs: command.options?.pollMs ? Number.parseInt(command.options.pollMs, 10) : undefined,
      idleTimeoutMs: command.options?.idleMs ? Number.parseInt(command.options.idleMs, 10) : undefined,
    }));
    state.lastLoopId = result.id;
    if (result.taskId) {
      state.lastTaskId = result.taskId;
    }
    return {
      ok: true,
      loopId: result.id,
      status: result.status,
      taskId: result.taskId,
      taskEnvId: result.taskEnvId,
    };
  }

  if (command.name === "loop-status") {
    const result = await withTemporaryEnv(state.env, () => runLoopStatusCommand({
      cwd,
      id: command.options?.id ?? state.lastLoopId ?? undefined,
    }));
    state.lastLoopId = result.id;
    if (result.taskId) {
      state.lastTaskId = result.taskId;
    }
    return {
      ok: true,
      loopId: result.id,
      status: result.status,
      taskId: result.taskId,
      taskEnvId: result.taskEnvId,
      iterations: result.iterations.length,
    };
  }

  if (command.name === "analyze") {
    const result = await withTemporaryEnv(state.env, () => runAnalyzeCommand({
      cwd,
      repos: command.options?.repo ? [command.options.repo] : undefined,
      refresh: command.options?.refresh === "true",
    }));
    return {
      ok: true,
      scope: result.scope,
      analyzedRepos: result.analyzedRepos,
      docsUpdated: result.docsUpdated,
      knowledgeUpdated: result.knowledgeUpdated,
    };
  }

  throw new Error(`Unsupported taskflow command: ${command.name}`);
}

async function applyTaskflowStep(cwd: string, state: TaskflowState, step: EvalTaskflowStep): Promise<void> {
  if (step.type === "write-file") {
    await writeTextFile(
      resolvePathWithinDirectory(cwd, step.path, "Eval taskflow write path must stay within the cloned workspace."),
      step.content,
    );
    return;
  }

  if (step.type === "set-env") {
    state.env = {
      ...state.env,
      ...step.values,
    };
    return;
  }

  if (step.type === "mutate-task-session") {
    const taskId = resolveTaskIdForStep(state, step.taskId);
    const session = await readTaskSession(cwd, taskId);
    const patchedSession = {
      ...session,
      ...step.patch,
      updatedAt: new Date().toISOString(),
    };
    await writeJsonStore(join(cwd, ".bbg", "tasks", taskId, "session.json"), patchedSession);
    await syncTaskContextFromSession({
      cwd,
      taskId,
      session: patchedSession,
      defaultTool: null,
    });
    return;
  }

  const result = await runTaskflowCommandStep(cwd, state, step.command);
  state.commandResults.push({
    step: step.command.name,
    result,
  });
}

async function snapshotTaskflowActual(cwd: string, state: TaskflowState): Promise<Record<string, unknown>> {
  const finalTask = state.lastTaskId ? await readTaskSession(cwd, state.lastTaskId).catch(() => null) : null;
  const finalLoop = state.lastLoopId ? await readLoopState(cwd, state.lastLoopId).catch(() => null) : null;
  const finalContext = state.lastTaskId
    ? await readJsonStore(join(getTaskRoot(cwd, state.lastTaskId), "context.json"), {} as Record<string, unknown>, (value): value is Record<string, unknown> => typeof value === "object" && value !== null)
      .catch(() => null)
    : null;
  const status = await runStatusCommand({ cwd });

  return {
    taskId: state.lastTaskId,
    loopId: state.lastLoopId,
    finalTask,
    finalLoop,
    finalContext,
    status: {
      tasks: status.tasks,
      loops: status.loops,
      observations: status.observations,
    },
    commandResults: state.commandResults,
  };
}

function deriveTaskflowMetrics(actual: Record<string, unknown>): EvalCaseMetrics {
  const finalTask = (actual.finalTask ?? null) as Record<string, unknown> | null;
  if (!finalTask || typeof finalTask !== "object") {
    return {};
  }

  const status = typeof finalTask.status === "string" ? finalTask.status : null;
  const attemptCount = typeof finalTask.attemptCount === "number" ? finalTask.attemptCount : 0;
  const lastVerification = finalTask.lastVerification && typeof finalTask.lastVerification === "object"
    ? finalTask.lastVerification as Record<string, unknown>
    : null;
  const lastRecoveryAction = finalTask.lastRecoveryAction && typeof finalTask.lastRecoveryAction === "object"
    ? finalTask.lastRecoveryAction as Record<string, unknown>
    : null;
  const runner = finalTask.runner && typeof finalTask.runner === "object"
    ? finalTask.runner as Record<string, unknown>
    : null;
  const finalLoop = actual.finalLoop && typeof actual.finalLoop === "object"
    ? actual.finalLoop as Record<string, unknown>
    : null;
  const finalContext = actual.finalContext && typeof actual.finalContext === "object"
    ? actual.finalContext as Record<string, unknown>
    : null;
  const taskState = finalContext?.taskState && typeof finalContext.taskState === "object"
    ? finalContext.taskState as Record<string, unknown>
    : null;
  const autonomy = taskState?.autonomy && typeof taskState.autonomy === "object"
    ? taskState.autonomy as Record<string, unknown>
    : finalTask.autonomy && typeof finalTask.autonomy === "object"
      ? finalTask.autonomy as Record<string, unknown>
      : null;
  const recovery = finalContext?.recovery && typeof finalContext.recovery === "object"
    ? finalContext.recovery as Record<string, unknown>
    : null;
  const recoveryPlan = recovery?.recoveryPlan && typeof recovery.recoveryPlan === "object"
    ? recovery.recoveryPlan as Record<string, unknown>
    : null;
  const recoveryPlanKind = typeof recoveryPlan?.kind === "string" ? recoveryPlan.kind : null;
  const loopBound = Boolean(
    finalLoop
      && typeof finalLoop.id === "string"
      && typeof finalLoop.taskId === "string"
      && typeof finalLoop.taskEnvId === "string"
      && finalTask.loopId === finalLoop.id
      && finalTask.taskId === finalLoop.taskId
      && finalTask.taskEnvId === finalLoop.taskEnvId,
  );
  const initialStartTool = actual.commandResults && Array.isArray(actual.commandResults)
    ? (
      actual.commandResults.find((entry) =>
        entry && typeof entry === "object"
        && (entry as Record<string, unknown>).step === "start"
        && typeof (entry as Record<string, unknown>).result === "object"
        && (entry as Record<string, unknown>).result !== null,
      ) as { result?: Record<string, unknown> } | undefined
    )?.result?.tool
    : null;
  const hermesQuery = finalContext?.hermesQuery && typeof finalContext.hermesQuery === "object"
    ? finalContext.hermesQuery as Record<string, unknown>
    : null;
  const workspaceAnalyzeResult = Array.isArray(actual.commandResults)
    ? (
      actual.commandResults.find((entry) =>
        entry && typeof entry === "object"
        && (entry as Record<string, unknown>).step === "analyze"
        && typeof (entry as Record<string, unknown>).result === "object"
        && (entry as Record<string, unknown>).result !== null,
      ) as { result?: Record<string, unknown> } | undefined
    )?.result
    : null;
  const workspaceAnalyzed = workspaceAnalyzeResult?.scope === "workspace"
    && Array.isArray(workspaceAnalyzeResult.analyzedRepos)
    && workspaceAnalyzeResult.analyzedRepos.length > 1;
  const workspaceKnowledgeRecorded = workspaceAnalyzed
    && Array.isArray(workspaceAnalyzeResult.docsUpdated)
    && workspaceAnalyzeResult.docsUpdated.length > 0
    && Array.isArray(workspaceAnalyzeResult.knowledgeUpdated)
    && workspaceAnalyzeResult.knowledgeUpdated.length > 0;

  return {
    workspaceAnalyzed,
    workspaceKnowledgeRecorded,
    hermesWorkflowInfluenced: hermesQuery?.influencedWorkflow === true,
    hermesRecoveryInfluenced: hermesQuery?.influencedRecovery === true,
    hermesVerificationInfluenced: hermesQuery?.influencedVerification === true,
    collectEvidenceRecovery: recoveryPlanKind === "collect-evidence",
    retryImplementRecovery: recoveryPlanKind === "retry-implement",
    manualReviewRequired: recoveryPlanKind === "manual-review",
    autoRecoveryActionExecuted: lastRecoveryAction !== null,
    autonomyGuardrailTriggered: autonomy?.escalated === true,
    budgetEscalationOccurred: lastRecoveryAction?.kind === "autonomy-budget-escalation",
    manualHandoffRequired: recoveryPlanKind === "manual-review" && autonomy?.escalated === true,
    taskCompleted: status === "completed",
    verificationPassed: lastVerification?.ok === true && attemptCount <= 1,
    verificationRecorded: lastVerification !== null,
    recoverySucceeded: attemptCount > 1 && (status === "implementing" || status === "verifying" || status === "completed"),
    blocked: status === "blocked",
    evidenceRecovered: lastRecoveryAction?.kind === "auto-observe-start",
    hermesContextUsed: hermesQuery?.executed === true,
    loopBound,
    loopCompleted: finalLoop?.status === "completed",
    runnerLaunched: runner?.launched === true,
    crossToolResumeSucceeded: finalTask.entrypoint === "resume"
      && typeof finalTask.tool === "string"
      && finalTask.tool.length > 0
      && typeof initialStartTool === "string"
      && initialStartTool.length > 0
      && initialStartTool !== finalTask.tool,
  };
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
      category: "command",
      passed: graded.passed,
      failures: graded.failures,
      actual,
      metrics: deriveCommandMetrics(actual),
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function runTaskflowCase(datasetDirectory: string, testCase: EvalTaskflowCase): Promise<EvalCaseReport> {
  const sourceWorkspace = resolvePathWithinDirectory(
    datasetDirectory,
    testCase.workspace,
    "Eval workspace must stay within the dataset directory.",
  );
  const tempRoot = await cloneWorkspace(sourceWorkspace);
  const workspace = join(tempRoot, "workspace");
  const state: TaskflowState = {
    lastTaskId: null,
    lastLoopId: null,
    env: {},
    commandResults: [],
  };

  try {
    for (const step of testCase.steps) {
      await applyTaskflowStep(workspace, state, step);
    }

    const actual = await snapshotTaskflowActual(workspace, state);
    const graded = gradeDeterministicResult(testCase.expect, actual);
    return {
      id: testCase.id,
      category: "taskflow",
      passed: graded.passed,
      failures: graded.failures,
      actual,
      metrics: deriveTaskflowMetrics(actual),
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function writeReportIfNeeded<T extends Record<string, unknown>>(cwd: string, reportFile: string | undefined, report: T): Promise<string | undefined> {
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

  if (dataset.kind === "taskflow") {
    for (const testCase of dataset.cases) {
      results.push(await runTaskflowCase(datasetDirectory, testCase));
    }
  } else {
    for (const testCase of dataset.cases) {
      results.push(await runEvalCase(datasetDirectory, testCase));
    }
  }

  const passed = results.filter((result) => result.passed).length;
  const report: EvalExperimentReport = {
    experimentName: experiment?.name ?? dataset.name,
    datasetName: dataset.name,
    passed,
    failed: results.length - passed,
    metrics: computeEvalMetrics({
      totalCases: results.length,
      passed,
      caseMetrics: results.flatMap((result) => result.metrics ? [result.metrics] : []),
    }),
    results,
    generatedAt: new Date().toISOString(),
  };

  const reportFile = await writeReportIfNeeded(
    input.cwd,
    experiment?.reportFile ? resolve(dirname(experimentFile as string), experiment.reportFile) : undefined,
    report,
  );
  const finalReport = reportFile ? { ...report, reportFile } : report;
  await appendEvalHistory(input.cwd, finalReport);
  return finalReport;
}

export async function runEvalSuite(input: {
  cwd: string;
  suitePath: string;
}): Promise<EvalSuiteReport> {
  const suiteFile = resolveRepoLocalPath(input.cwd, input.suitePath, "Eval suite path must stay within the current repository.");
  if (!(await exists(suiteFile))) {
    throw new Error(`Eval suite not found: ${input.suitePath}`);
  }

  const suite = await readSuiteDocument(suiteFile);
  const suiteDir = dirname(suiteFile);
  const reports: EvalExperimentReport[] = [];

  for (const experimentPath of suite.experiments) {
    reports.push(await runEvalExperiment({
      cwd: input.cwd,
      experimentPath: resolveStrictRepoRelativePath(
        input.cwd,
        suiteDir,
        experimentPath,
        "Eval experiment path must stay within the current repository.",
      ),
    }));
  }

  const allResults = reports.flatMap((report) => report.results);
  const passed = allResults.filter((result) => result.passed).length;
  const suiteReport: EvalSuiteReport = {
    suiteName: suite.name,
    passed,
    failed: allResults.length - passed,
    metrics: computeEvalMetrics({
      totalCases: allResults.length,
      passed,
      caseMetrics: allResults.flatMap((result) => result.metrics ? [result.metrics] : []),
    }),
    reports,
    generatedAt: new Date().toISOString(),
  };

  const reportFile = await writeReportIfNeeded(
    input.cwd,
    suite.reportFile ? resolve(dirname(suiteFile), suite.reportFile) : undefined,
    suiteReport,
  );
  const finalReport = reportFile ? { ...suiteReport, reportFile } : suiteReport;
  await appendEvalHistory(input.cwd, finalReport);
  return finalReport;
}

function isEvalExperimentReport(value: unknown): value is EvalExperimentReport {
  return typeof value === "object"
    && value !== null
    && typeof (value as EvalExperimentReport).experimentName === "string"
    && typeof (value as EvalExperimentReport).datasetName === "string"
    && typeof (value as EvalExperimentReport).passed === "number"
    && typeof (value as EvalExperimentReport).failed === "number"
    && typeof (value as EvalExperimentReport).generatedAt === "string"
    && Array.isArray((value as EvalExperimentReport).results)
    && typeof (value as EvalExperimentReport).metrics === "object";
}

function isEvalSuiteReport(value: unknown): value is EvalSuiteReport {
  return typeof value === "object"
    && value !== null
    && typeof (value as EvalSuiteReport).suiteName === "string"
    && typeof (value as EvalSuiteReport).passed === "number"
    && typeof (value as EvalSuiteReport).failed === "number"
    && typeof (value as EvalSuiteReport).generatedAt === "string"
    && Array.isArray((value as EvalSuiteReport).reports)
    && typeof (value as EvalSuiteReport).metrics === "object";
}

function extractReportName(report: EvalExperimentReport | EvalSuiteReport): string {
  return isEvalSuiteReport(report) ? report.suiteName : report.experimentName;
}

function extractMetrics(report: EvalExperimentReport | EvalSuiteReport): EvalExperimentMetrics {
  return report.metrics;
}

export async function compareEvalReports(input: {
  cwd: string;
  basePath: string;
  headPath: string;
}): Promise<EvalCompareResult> {
  const [basePath, headPath] = [
    resolveRepoLocalPath(input.cwd, input.basePath, "Eval report path must stay within the current repository."),
    resolveRepoLocalPath(input.cwd, input.headPath, "Eval report path must stay within the current repository."),
  ];
  const [base, head] = await Promise.all([
    readJsonStore(basePath, {} as EvalExperimentReport, (value): value is EvalExperimentReport | EvalSuiteReport =>
      isEvalExperimentReport(value) || isEvalSuiteReport(value)),
    readJsonStore(headPath, {} as EvalExperimentReport, (value): value is EvalExperimentReport | EvalSuiteReport =>
      isEvalExperimentReport(value) || isEvalSuiteReport(value)),
  ]);

  const baseMetrics = extractMetrics(base);
  const headMetrics = extractMetrics(head);
  const metricDiffs = buildMetricDiffs(baseMetrics, headMetrics);
  const { regressions } = summarizeMetricDiffs(metricDiffs);

  return {
    baseName: extractReportName(base),
    headName: extractReportName(head),
    metricDiffs,
    regressions,
  };
}
