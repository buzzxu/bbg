import type { BbgConfig } from "./schema.js";
import { posix, win32 } from "node:path";
import { isValidRuntimeRelativePath } from "../runtime/paths.js";

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
    isValidRepoName(value.name) &&
    isString(value.gitUrl) &&
    isString(value.branch) &&
    isRepoType(value.type) &&
    isStackInfo(value.stack) &&
    isString(value.description)
  );
}

function isValidRepoName(value: string): boolean {
  if (value.trim().length === 0 || posix.isAbsolute(value) || win32.isAbsolute(value)) {
    return false;
  }

  const segments = value.replaceAll("\\", "/").split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function isValidRuntimeCommandCwd(value: string): boolean {
  if (value.trim().length === 0 || posix.isAbsolute(value) || win32.isAbsolute(value)) {
    return false;
  }

  const segments = value.replaceAll("\\", "/").split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function isValidWorkspaceRelativePath(value: string): boolean {
  if (value.trim().length === 0 || posix.isAbsolute(value) || win32.isAbsolute(value)) {
    return false;
  }

  const segments = value.replaceAll("\\", "/").split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function isRiskThreshold(value: unknown): value is { grade: string; minScore: number } {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.grade) && isNumber(value.minScore);
}

function isRuntimeFileSetting(value: unknown): value is NonNullable<BbgConfig["runtime"]>["telemetry"] {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.enabled === "boolean" && isString(value.file) && isValidRuntimeRelativePath(value.file);
}

function isRuntimeContextSetting(value: unknown): value is NonNullable<BbgConfig["runtime"]>["context"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.enabled === "boolean" &&
    isString(value.repoMapFile) &&
    isValidRuntimeRelativePath(value.repoMapFile) &&
    isString(value.sessionHistoryFile) &&
    isValidRuntimeRelativePath(value.sessionHistoryFile)
  );
}

function isRuntimeCommandConfigEntry(
  value: unknown,
): value is NonNullable<NonNullable<BbgConfig["runtime"]>["commands"]>["build"] {
  if (!isRecord(value) || !isString(value.command)) {
    return false;
  }

  return (
    (value.args === undefined || (Array.isArray(value.args) && value.args.every(isString))) &&
    (value.cwd === undefined || (isString(value.cwd) && isValidRuntimeCommandCwd(value.cwd)))
  );
}

function isRuntimeCommandsSetting(value: unknown): value is NonNullable<BbgConfig["runtime"]>["commands"] {
  if (!isRecord(value)) {
    return false;
  }

  return [value.build, value.typecheck, value.tests, value.lint].every(
    (entry) => entry === undefined || isRuntimeCommandConfigEntry(entry),
  );
}

function isRuntimeConfig(value: unknown): value is NonNullable<BbgConfig["runtime"]> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRuntimeFileSetting(value.telemetry) &&
    isRuntimeFileSetting(value.evaluation) &&
    isRuntimeFileSetting(value.policy) &&
    isRuntimeContextSetting(value.context) &&
    (value.commands === undefined || isRuntimeCommandsSetting(value.commands))
  );
}

function isHermesRuntimeConfig(value: unknown): value is NonNullable<NonNullable<BbgConfig["knowledge"]>["hermes"]> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.enabled === undefined || typeof value.enabled === "boolean") &&
    (value.runsRoot === undefined || (isString(value.runsRoot) && isValidWorkspaceRelativePath(value.runsRoot))) &&
    (value.evaluationsRoot === undefined ||
      (isString(value.evaluationsRoot) && isValidWorkspaceRelativePath(value.evaluationsRoot))) &&
    (value.candidatesRoot === undefined ||
      (isString(value.candidatesRoot) && isValidWorkspaceRelativePath(value.candidatesRoot)))
  );
}

function isKnowledgeConfig(value: unknown): value is NonNullable<BbgConfig["knowledge"]> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.enabled === undefined || typeof value.enabled === "boolean") &&
    (value.databaseFile === undefined ||
      (isString(value.databaseFile) && isValidRuntimeRelativePath(value.databaseFile))) &&
    (value.sourceRoot === undefined ||
      (isString(value.sourceRoot) && isValidWorkspaceRelativePath(value.sourceRoot))) &&
    (value.wikiRoot === undefined || (isString(value.wikiRoot) && isValidWorkspaceRelativePath(value.wikiRoot))) &&
    (value.hermes === undefined || isHermesRuntimeConfig(value.hermes))
  );
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
    isRecord(value.context) &&
    (typeof value.runtime === "undefined" || isRuntimeConfig(value.runtime)) &&
    (typeof value.knowledge === "undefined" || isKnowledgeConfig(value.knowledge))
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
