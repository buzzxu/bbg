import type { BbgConfig } from "./schema.js";

export class ConfigParseError extends Error {
  public readonly cause: unknown;

  public constructor(message: string, cause: unknown) {
    super(message);
    this.name = "ConfigParseError";
    this.cause = cause;
  }
}

export class ConfigValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

function isRepoType(value: unknown): value is BbgConfig["repos"][number]["type"] {
  return (
    value === "backend" ||
    value === "frontend-pc" ||
    value === "frontend-h5" ||
    value === "frontend-web" ||
    value === "other"
  );
}

function isStackInfo(value: unknown): value is BbgConfig["repos"][number]["stack"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.language) &&
    isString(value.framework) &&
    isString(value.buildTool) &&
    isString(value.testFramework) &&
    isString(value.packageManager)
  );
}

function isRepoEntry(value: unknown): value is BbgConfig["repos"][number] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.name) &&
    isString(value.gitUrl) &&
    isString(value.branch) &&
    isRepoType(value.type) &&
    isStackInfo(value.stack) &&
    isString(value.description)
  );
}

function isRiskThreshold(value: unknown): value is { grade: string; minScore: number } {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.grade) && isNumber(value.minScore);
}

function isBbgConfig(value: unknown): value is BbgConfig {
  if (!isRecord(value)) {
    return false;
  }

  if (!Array.isArray(value.repos) || !value.repos.every(isRepoEntry)) {
    return false;
  }

  if (!isRecord(value.governance) || !isRecord(value.governance.riskThresholds)) {
    return false;
  }

  return (
    isString(value.version) &&
    isString(value.projectName) &&
    isString(value.projectDescription) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isRiskThreshold(value.governance.riskThresholds.high) &&
    isRiskThreshold(value.governance.riskThresholds.medium) &&
    isRiskThreshold(value.governance.riskThresholds.low) &&
    typeof value.governance.enableRedTeam === "boolean" &&
    typeof value.governance.enableCrossAudit === "boolean" &&
    isRecord(value.context)
  );
}

export function parseConfig(raw: string): BbgConfig {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error: unknown) {
    throw new ConfigParseError("Invalid config JSON", error);
  }

  if (!isBbgConfig(parsed)) {
    throw new ConfigValidationError("Config JSON does not match required shape");
  }

  return parsed;
}

export function serializeConfig(config: BbgConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}
