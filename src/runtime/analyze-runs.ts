import { join } from "node:path";
import type { AnalyzeFocusSummary, AnalyzeInterviewQuestionKey, AnalyzePhaseSummary } from "../analyze/types.js";
import { readJsonStore, writeJsonStore } from "./store.js";
import { exists } from "../utils/fs.js";

export interface AnalyzeRunState {
  version: number;
  runId: string;
  status: "completed" | "partial" | "failed";
  scope: "repo" | "workspace";
  repos: string[];
  startedAt: string;
  updatedAt: string;
  docsUpdated: string[];
  knowledgeUpdated: string[];
  warnings: string[];
  failures: string[];
  phases?: AnalyzePhaseSummary[];
  focus?: AnalyzeFocusSummary | null;
  interview?: {
    mode: "off" | "passive" | "guided" | "deep";
    asked: number;
    answered: number;
    unresolvedGaps: AnalyzeInterviewQuestionKey[];
  } | null;
}

function createDefaultAnalyzeRunState(): AnalyzeRunState {
  return {
    version: 1,
    runId: "",
    status: "completed",
    scope: "workspace",
    repos: [],
    startedAt: "",
    updatedAt: "",
    docsUpdated: [],
    knowledgeUpdated: [],
    warnings: [],
    failures: [],
    phases: [],
    focus: null,
    interview: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAnalyzeRunState(value: unknown): value is AnalyzeRunState {
  return isRecord(value)
    && typeof value.version === "number"
    && typeof value.runId === "string"
    && typeof value.status === "string"
    && typeof value.scope === "string"
    && Array.isArray(value.repos)
    && typeof value.startedAt === "string"
    && typeof value.updatedAt === "string"
    && Array.isArray(value.docsUpdated)
    && Array.isArray(value.knowledgeUpdated)
    && Array.isArray(value.warnings)
    && Array.isArray(value.failures)
    && (value.phases === undefined || Array.isArray(value.phases))
    && (value.focus === undefined || value.focus === null || isRecord(value.focus))
    && (value.interview === undefined || value.interview === null || isRecord(value.interview));
}

export function createAnalyzeRunId(now = new Date()): string {
  const compact = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const suffix = Math.random().toString(16).slice(2, 8);
  return `${compact}-${suffix}`;
}

function getAnalyzeRunPath(cwd: string, runId: string): string {
  return join(cwd, ".bbg", "analyze", "runs", `${runId}.json`);
}

function getLatestAnalyzePath(cwd: string): string {
  return join(cwd, ".bbg", "analyze", "latest.json");
}

export async function writeAnalyzeRunState(cwd: string, state: AnalyzeRunState): Promise<void> {
  await Promise.all([
    writeJsonStore(getAnalyzeRunPath(cwd, state.runId), state),
    writeJsonStore(getLatestAnalyzePath(cwd), state),
  ]);
}

export async function readLatestAnalyzeRunState(cwd: string): Promise<AnalyzeRunState | null> {
  const latestPath = getLatestAnalyzePath(cwd);
  if (!(await exists(latestPath))) {
    return null;
  }
  return readJsonStore(latestPath, createDefaultAnalyzeRunState(), isAnalyzeRunState);
}
