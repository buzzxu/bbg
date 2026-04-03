export type EvalCommandName = "quality-gate" | "checkpoint" | "verify";

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

export type EvalSetupStep = EvalWriteFileSetupStep | EvalRunCommandSetupStep;

export interface EvalDatasetCase {
  id: string;
  description: string;
  workspace: string;
  setup?: EvalSetupStep[];
  command: EvalCommandDefinition;
  expect: Record<string, unknown>;
}

export interface EvalDatasetDocument {
  version: 1;
  name: string;
  description: string;
  cases: EvalDatasetCase[];
}

export interface EvalExperimentDocument {
  version: 1;
  name: string;
  dataset: string;
  reportFile?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCommandName(value: unknown): value is EvalCommandName {
  return value === "quality-gate" || value === "checkpoint" || value === "verify";
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

function isDatasetCase(value: unknown): value is EvalDatasetCase {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.description === "string"
    && typeof value.workspace === "string"
    && isCommandDefinition(value.command)
    && isRecord(value.expect)
    && (value.setup === undefined || (Array.isArray(value.setup) && value.setup.every(isSetupStep)));
}

export function isEvalDatasetDocument(value: unknown): value is EvalDatasetDocument {
  return isRecord(value)
    && value.version === 1
    && typeof value.name === "string"
    && typeof value.description === "string"
    && Array.isArray(value.cases)
    && value.cases.every(isDatasetCase);
}

export function isEvalExperimentDocument(value: unknown): value is EvalExperimentDocument {
  return isRecord(value)
    && value.version === 1
    && typeof value.name === "string"
    && typeof value.dataset === "string"
    && (value.reportFile === undefined || typeof value.reportFile === "string");
}
