export type EvalCommandName =
  | "quality-gate"
  | "checkpoint"
  | "verify"
  | "start"
  | "resume"
  | "status"
  | "loop-start"
  | "loop-status"
  | "analyze";

export type EvalDatasetKind = "command" | "taskflow";

export interface EvalCommandDefinition {
  name: EvalCommandName;
  options?: Record<string, string>;
}

export interface EvalWriteFileSetupStep {
  type: "write-file";
  path: string;
  content: string;
}

export interface EvalRunCommandSetupStep {
  type: "run-command";
  command: EvalCommandDefinition;
}

export interface EvalSetEnvStep {
  type: "set-env";
  values: Record<string, string | null>;
}

export interface EvalMutateTaskSessionStep {
  type: "mutate-task-session";
  taskId?: string;
  patch: Record<string, unknown>;
}

export interface EvalTaskflowCommandStep {
  type: "command";
  command: EvalCommandDefinition;
}

export type EvalSetupStep = EvalWriteFileSetupStep | EvalRunCommandSetupStep;
export type EvalTaskflowStep =
  | EvalWriteFileSetupStep
  | EvalSetEnvStep
  | EvalMutateTaskSessionStep
  | EvalTaskflowCommandStep;

export interface EvalDatasetCase {
  id: string;
  description: string;
  workspace: string;
  setup?: EvalSetupStep[];
  command: EvalCommandDefinition;
  expect: Record<string, unknown>;
}

export interface EvalTaskflowCase {
  id: string;
  description: string;
  workspace: string;
  steps: EvalTaskflowStep[];
  expect: Record<string, unknown>;
}

export interface EvalCommandDatasetDocument {
  version: 1;
  kind?: "command";
  name: string;
  description: string;
  cases: EvalDatasetCase[];
}

export interface EvalTaskflowDatasetDocument {
  version: 1;
  kind: "taskflow";
  name: string;
  description: string;
  cases: EvalTaskflowCase[];
}

export type EvalDatasetDocument = EvalCommandDatasetDocument | EvalTaskflowDatasetDocument;

export interface EvalExperimentDocument {
  version: 1;
  name: string;
  dataset: string;
  reportFile?: string;
}

export interface EvalSuiteDocument {
  version: 1;
  name: string;
  experiments: string[];
  reportFile?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCommandName(value: unknown): value is EvalCommandName {
  return value === "quality-gate"
    || value === "checkpoint"
    || value === "verify"
    || value === "start"
    || value === "resume"
    || value === "status"
    || value === "loop-start"
    || value === "loop-status"
    || value === "analyze";
}

function isCommandDefinition(value: unknown): value is EvalCommandDefinition {
  return isRecord(value)
    && isCommandName(value.name)
    && (value.options === undefined
      || (isRecord(value.options) && Object.values(value.options).every((entry) => typeof entry === "string")));
}

function isSetupStep(value: unknown): value is EvalSetupStep {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "write-file") {
    return typeof value.path === "string" && typeof value.content === "string";
  }

  if (value.type === "run-command") {
    return isCommandDefinition(value.command);
  }

  return false;
}

function isTaskflowStep(value: unknown): value is EvalTaskflowStep {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "write-file") {
    return typeof value.path === "string" && typeof value.content === "string";
  }

  if (value.type === "set-env") {
    return isRecord(value.values)
      && Object.values(value.values).every((entry) => entry === null || typeof entry === "string");
  }

  if (value.type === "mutate-task-session") {
    return (value.taskId === undefined || typeof value.taskId === "string")
      && isRecord(value.patch);
  }

  if (value.type === "command") {
    return isCommandDefinition(value.command);
  }

  return false;
}

function isDatasetCase(value: unknown): value is EvalDatasetCase {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.description === "string"
    && typeof value.workspace === "string"
    && isCommandDefinition(value.command)
    && isRecord(value.expect)
    && (value.setup === undefined || (Array.isArray(value.setup) && value.setup.every(isSetupStep)));
}

function isTaskflowCase(value: unknown): value is EvalTaskflowCase {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.description === "string"
    && typeof value.workspace === "string"
    && Array.isArray(value.steps)
    && value.steps.every(isTaskflowStep)
    && isRecord(value.expect);
}

export function isEvalDatasetDocument(value: unknown): value is EvalDatasetDocument {
  if (!isRecord(value)
    || value.version !== 1
    || typeof value.name !== "string"
    || typeof value.description !== "string"
    || !Array.isArray(value.cases)) {
    return false;
  }

  if (value.kind === "taskflow") {
    return value.cases.every(isTaskflowCase);
  }

  return (value.kind === undefined || value.kind === "command")
    && value.cases.every(isDatasetCase);
}

export function isEvalExperimentDocument(value: unknown): value is EvalExperimentDocument {
  return isRecord(value)
    && value.version === 1
    && typeof value.name === "string"
    && typeof value.dataset === "string"
    && (value.reportFile === undefined || typeof value.reportFile === "string");
}

export function isEvalSuiteDocument(value: unknown): value is EvalSuiteDocument {
  return isRecord(value)
    && value.version === 1
    && typeof value.name === "string"
    && Array.isArray(value.experiments)
    && value.experiments.every((entry) => typeof entry === "string")
    && (value.reportFile === undefined || typeof value.reportFile === "string");
}
