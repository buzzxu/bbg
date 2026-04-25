import { join } from "node:path";
import type { AnalyzePhaseSummary, AnalyzeProgressEvent } from "../analyze/types.js";
import { readJsonStore, writeJsonStore } from "./store.js";
import { exists } from "../utils/fs.js";

export const ANALYZE_PROGRESS_PHASES: AnalyzePhaseSummary["name"][] = [
  "discovery",
  "technical-analysis",
  "evidence-graph",
  "business-analysis",
  "workspace-fusion",
  "focus-analysis",
  "deep-interview",
  "capability-analysis",
  "workflow-analysis",
  "contract-analysis",
  "risk-impact-analysis",
  "prepare-ai-context",
  "ai-analysis",
  "reconcile-ai-analysis",
  "prune-stale",
  "emit-docs",
  "emit-knowledge",
  "emit-hermes-intake",
  "emit-wiki",
  "write-state",
];

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function phaseIndexFor(phase: AnalyzePhaseSummary["name"]): number {
  const index = ANALYZE_PROGRESS_PHASES.indexOf(phase);
  return index >= 0 ? index + 1 : ANALYZE_PROGRESS_PHASES.length;
}

function progressPercentFor(
  phase: AnalyzePhaseSummary["name"],
  status: AnalyzeProgressEvent["status"],
  finalPercent?: number,
): number {
  if (typeof finalPercent === "number") {
    return clampPercent(finalPercent);
  }

  const index = phaseIndexFor(phase);
  const completedWeight = status === "running" ? index - 1 : index;
  return clampPercent((completedWeight / ANALYZE_PROGRESS_PHASES.length) * 100);
}

export function buildAnalyzeProgressEvent(input: {
  runId: string;
  phase: AnalyzePhaseSummary["name"];
  status: AnalyzeProgressEvent["status"];
  message: string;
  details?: string[];
  nextAction?: string | null;
  progressPercent?: number;
}): AnalyzeProgressEvent {
  return {
    version: 1,
    runId: input.runId,
    updatedAt: new Date().toISOString(),
    phase: input.phase,
    status: input.status,
    phaseIndex: phaseIndexFor(input.phase),
    totalPhases: ANALYZE_PROGRESS_PHASES.length,
    progressPercent: progressPercentFor(input.phase, input.status, input.progressPercent),
    message: input.message,
    details: input.details ?? [],
    nextAction: input.nextAction ?? null,
  };
}

function currentProgressPath(cwd: string): string {
  return join(cwd, ".bbg", "analyze", "current.json");
}

function isAnalyzeProgressEvent(value: unknown): value is AnalyzeProgressEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as AnalyzeProgressEvent).version === 1 &&
    typeof (value as AnalyzeProgressEvent).runId === "string" &&
    typeof (value as AnalyzeProgressEvent).phase === "string" &&
    typeof (value as AnalyzeProgressEvent).status === "string" &&
    typeof (value as AnalyzeProgressEvent).progressPercent === "number"
  );
}

export async function writeAnalyzeCurrentProgress(cwd: string, event: AnalyzeProgressEvent): Promise<void> {
  await writeJsonStore(currentProgressPath(cwd), event);
}

export async function readAnalyzeCurrentProgress(cwd: string): Promise<AnalyzeProgressEvent | null> {
  const pathValue = currentProgressPath(cwd);
  if (!(await exists(pathValue))) {
    return null;
  }

  return readJsonStore(pathValue, null, (value): value is AnalyzeProgressEvent | null => {
    return value === null || isAnalyzeProgressEvent(value);
  });
}
