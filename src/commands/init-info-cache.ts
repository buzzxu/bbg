import { join } from "node:path";
import type { BbgConfig, RepoEntry } from "../config/schema.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";

export const INIT_INFO_CACHE_PATH = ".bbg-init-info.json";

export interface PreservedInitInfo {
  projectName: string;
  projectDescription: string;
  documentationLanguage?: "zh-CN" | "en";
  repos: RepoEntry[];
  governance: BbgConfig["governance"];
  context: Record<string, unknown>;
}

interface InitInfoCacheFile {
  version: 1;
  savedAt: string;
  source: "bbg uninstall --keep-init-info";
  initInfo: PreservedInitInfo;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRepoEntry(value: unknown): value is RepoEntry {
  if (!isRecord(value) || !isRecord(value.stack)) {
    return false;
  }

  return (
    isString(value.name) &&
    isString(value.gitUrl) &&
    isString(value.branch) &&
    (value.type === "backend" ||
      value.type === "frontend-pc" ||
      value.type === "frontend-h5" ||
      value.type === "frontend-web" ||
      value.type === "other") &&
    isString(value.stack.language) &&
    isString(value.stack.framework) &&
    isString(value.stack.buildTool) &&
    isString(value.stack.testFramework) &&
    isString(value.stack.packageManager) &&
    isString(value.description)
  );
}

function isRiskThreshold(value: unknown): value is { grade: string; minScore: number } {
  return isRecord(value) && isString(value.grade) && typeof value.minScore === "number";
}

function isGovernance(value: unknown): value is BbgConfig["governance"] {
  return (
    isRecord(value) &&
    isRecord(value.riskThresholds) &&
    isRiskThreshold(value.riskThresholds.high) &&
    isRiskThreshold(value.riskThresholds.medium) &&
    isRiskThreshold(value.riskThresholds.low) &&
    typeof value.enableRedTeam === "boolean" &&
    typeof value.enableCrossAudit === "boolean"
  );
}

function isPreservedInitInfo(value: unknown): value is PreservedInitInfo {
  return (
    isRecord(value) &&
    isString(value.projectName) &&
    isString(value.projectDescription) &&
    (value.documentationLanguage === undefined ||
      value.documentationLanguage === "zh-CN" ||
      value.documentationLanguage === "en") &&
    Array.isArray(value.repos) &&
    value.repos.every(isRepoEntry) &&
    isGovernance(value.governance) &&
    isRecord(value.context)
  );
}

function toPreservedInitInfo(config: BbgConfig): PreservedInitInfo {
  return {
    projectName: config.projectName,
    projectDescription: config.projectDescription,
    documentationLanguage: config.documentationLanguage,
    repos: config.repos,
    governance: config.governance,
    context: config.context,
  };
}

export function applyPreservedInitInfo(defaults: BbgConfig, initInfo: PreservedInitInfo | null): BbgConfig {
  if (!initInfo) {
    return defaults;
  }

  return {
    ...defaults,
    projectName: initInfo.projectName,
    projectDescription: initInfo.projectDescription,
    documentationLanguage: initInfo.documentationLanguage ?? defaults.documentationLanguage,
    repos: initInfo.repos,
    governance: initInfo.governance,
    context: initInfo.context,
  };
}

export async function writeInitInfoCache(cwd: string, config: BbgConfig, savedAt = new Date().toISOString()): Promise<string> {
  const payload: InitInfoCacheFile = {
    version: 1,
    savedAt,
    source: "bbg uninstall --keep-init-info",
    initInfo: toPreservedInitInfo(config),
  };
  const outputPath = join(cwd, INIT_INFO_CACHE_PATH);
  await writeTextFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return INIT_INFO_CACHE_PATH;
}

export async function readInitInfoCache(cwd: string): Promise<PreservedInitInfo | null> {
  const cachePath = join(cwd, INIT_INFO_CACHE_PATH);
  if (!(await exists(cachePath))) {
    return null;
  }

  const parsed = JSON.parse(await readTextFile(cachePath)) as unknown;
  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    !isString(parsed.savedAt) ||
    parsed.source !== "bbg uninstall --keep-init-info" ||
    !isPreservedInitInfo(parsed.initInfo)
  ) {
    return null;
  }

  return parsed.initInfo;
}
