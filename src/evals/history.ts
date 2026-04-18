import { join } from "node:path";
import { readJsonStore, writeJsonStore } from "../runtime/store.js";
import type { EvalExperimentMetrics } from "./metrics.js";
import type { EvalExperimentReport, EvalSuiteReport } from "./runner.js";
import { buildMetricDiffs, summarizeMetricDiffs } from "./trends.js";

export interface EvalHistoryEntry {
  kind: "experiment" | "suite";
  name: string;
  datasetName?: string;
  reportFile?: string;
  generatedAt: string;
  passed: number;
  failed: number;
  metrics: EvalExperimentMetrics;
}

export interface EvalHistoryStore {
  version: 1;
  entries: EvalHistoryEntry[];
}

export interface EvalHistorySummary {
  totalEntries: number;
  latest: EvalHistoryEntry | null;
  previous: EvalHistoryEntry | null;
  entries: EvalHistoryEntry[];
  trend: {
    baseName: string | null;
    headName: string | null;
    metricDiffs: Record<string, number>;
    regressions: string[];
    improvements: string[];
  };
}

function createDefaultHistoryStore(): EvalHistoryStore {
  return {
    version: 1,
    entries: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEvalHistoryEntry(value: unknown): value is EvalHistoryEntry {
  return isRecord(value)
    && (value.kind === "experiment" || value.kind === "suite")
    && typeof value.name === "string"
    && (value.datasetName === undefined || typeof value.datasetName === "string")
    && (value.reportFile === undefined || typeof value.reportFile === "string")
    && typeof value.generatedAt === "string"
    && typeof value.passed === "number"
    && typeof value.failed === "number"
    && isRecord(value.metrics);
}

function isEvalHistoryStore(value: unknown): value is EvalHistoryStore {
  return isRecord(value)
    && value.version === 1
    && Array.isArray(value.entries)
    && value.entries.every(isEvalHistoryEntry);
}

function getEvalHistoryPath(cwd: string): string {
  return join(cwd, "evals", "reports", "history.json");
}

function toHistoryEntry(report: EvalExperimentReport | EvalSuiteReport): EvalHistoryEntry {
  if ("suiteName" in report) {
    return {
      kind: "suite",
      name: report.suiteName,
      reportFile: report.reportFile,
      generatedAt: report.generatedAt,
      passed: report.passed,
      failed: report.failed,
      metrics: report.metrics,
    };
  }

  return {
    kind: "experiment",
    name: report.experimentName,
    datasetName: report.datasetName,
    reportFile: report.reportFile,
    generatedAt: report.generatedAt,
    passed: report.passed,
    failed: report.failed,
    metrics: report.metrics,
  };
}

export async function appendEvalHistory(
  cwd: string,
  report: EvalExperimentReport | EvalSuiteReport,
): Promise<EvalHistoryStore> {
  const historyPath = getEvalHistoryPath(cwd);
  const history = await readJsonStore(historyPath, createDefaultHistoryStore(), isEvalHistoryStore);
  const entries = [...history.entries, toHistoryEntry(report)].slice(-100);

  const updatedHistory: EvalHistoryStore = {
    version: 1,
    entries,
  };
  await writeJsonStore(historyPath, updatedHistory);
  return updatedHistory;
}

export async function readEvalHistory(cwd: string): Promise<EvalHistoryStore> {
  return readJsonStore(getEvalHistoryPath(cwd), createDefaultHistoryStore(), isEvalHistoryStore);
}

export async function summarizeEvalHistory(
  cwd: string,
  limit = 5,
): Promise<EvalHistorySummary> {
  const history = await readEvalHistory(cwd);
  const entries = history.entries.slice().reverse();
  const latest = entries[0] ?? null;
  const previous = entries[1] ?? null;
  const metricDiffs = previous && latest ? buildMetricDiffs(previous.metrics, latest.metrics) : {};
  const changes = summarizeMetricDiffs(metricDiffs);

  return {
    totalEntries: entries.length,
    latest,
    previous,
    entries: entries.slice(0, Math.max(1, limit)),
    trend: {
      baseName: previous?.name ?? null,
      headName: latest?.name ?? null,
      metricDiffs,
      regressions: changes.regressions,
      improvements: changes.improvements,
    },
  };
}
