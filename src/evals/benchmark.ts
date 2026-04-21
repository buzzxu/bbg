import type { EvalExperimentMetrics } from "./metrics.js";
import { readEvalHistory, summarizeEvalHistory, type EvalHistoryEntry, type EvalHistorySummary } from "./history.js";
import { buildMetricDiffs, summarizeMetricDiffs } from "./trends.js";

export interface EvalBenchmarkMetricSummary {
  latest: number;
  average: number;
  best: number;
  worst: number;
  deltaFromPrevious: number | null;
  bestEntry: string | null;
  worstEntry: string | null;
}

export interface EvalBenchmarkReport {
  generatedAt: string;
  totalEntries: number;
  limit: number;
  latest: string | null;
  previous: string | null;
  metrics: Record<string, EvalBenchmarkMetricSummary>;
  trend: EvalHistorySummary["trend"];
  hermesStrategyComparison: {
    control: string | null;
    treatment: string | null;
    metricDiffs: Record<string, number>;
    regressions: string[];
    improvements: string[];
  };
  recoveryPlanCoverage: {
    collectEvidenceRate: number | null;
    retryImplementRate: number | null;
    manualReviewRate: number | null;
    autoRecoveryActionRate: number | null;
    autonomyGuardrailRate: number | null;
    budgetEscalationRate: number | null;
    manualHandoffRate: number | null;
  };
  entries: Array<{
    kind: EvalHistoryEntry["kind"];
    name: string;
    generatedAt: string;
    passed: number;
    failed: number;
  }>;
}

function findLatestNamedEntry(entries: EvalHistoryEntry[], name: string): EvalHistoryEntry | null {
  return (
    entries
      .slice()
      .reverse()
      .find((entry) => entry.name === name) ?? null
  );
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
}

function summarizeMetric(
  key: keyof EvalExperimentMetrics,
  latestMetrics: EvalExperimentMetrics,
  previousMetrics: EvalExperimentMetrics | null,
  entries: EvalHistoryEntry[],
): EvalBenchmarkMetricSummary {
  const series = entries.map((entry) => ({
    name: entry.name,
    value: entry.metrics[key],
  }));
  const sorted = [...series].sort((left, right) => right.value - left.value);
  const best = sorted[0] ?? null;
  const worst = sorted.at(-1) ?? null;

  return {
    latest: latestMetrics[key],
    average: average(series.map((item) => item.value)),
    best: best?.value ?? 0,
    worst: worst?.value ?? 0,
    deltaFromPrevious: previousMetrics ? Number((latestMetrics[key] - previousMetrics[key]).toFixed(4)) : null,
    bestEntry: best?.name ?? null,
    worstEntry: worst?.name ?? null,
  };
}

export async function buildEvalBenchmarkReport(cwd: string, limit = 10): Promise<EvalBenchmarkReport> {
  const history = await readEvalHistory(cwd);
  const summary = await summarizeEvalHistory(cwd, limit);
  const latest = summary.latest;
  const previous = summary.previous;
  const latestMetrics = latest?.metrics;
  const metricKeys = latestMetrics ? (Object.keys(latestMetrics) as Array<keyof EvalExperimentMetrics>) : [];

  const metrics = Object.fromEntries(
    metricKeys.map((key) => [
      key,
      summarizeMetric(key, latestMetrics as EvalExperimentMetrics, previous?.metrics ?? null, history.entries),
    ]),
  );
  const hermesControl = findLatestNamedEntry(history.entries, "hermes-control-taskflow");
  const hermesTreatment = findLatestNamedEntry(history.entries, "hermes-treatment-taskflow");
  const hermesMetricDiffs =
    hermesControl && hermesTreatment ? buildMetricDiffs(hermesControl.metrics, hermesTreatment.metrics) : {};
  const hermesChanges = summarizeMetricDiffs(hermesMetricDiffs);

  return {
    generatedAt: new Date().toISOString(),
    totalEntries: history.entries.length,
    limit,
    latest: latest?.name ?? null,
    previous: previous?.name ?? null,
    metrics,
    trend: summary.trend,
    hermesStrategyComparison: {
      control: hermesControl?.name ?? null,
      treatment: hermesTreatment?.name ?? null,
      metricDiffs: hermesMetricDiffs,
      regressions: hermesChanges.regressions,
      improvements: hermesChanges.improvements,
    },
    recoveryPlanCoverage: latest
      ? {
          collectEvidenceRate: latest.metrics.collectEvidenceRecoveryRate,
          retryImplementRate: latest.metrics.retryImplementRecoveryRate,
          manualReviewRate: latest.metrics.manualReviewRate,
          autoRecoveryActionRate: latest.metrics.autoRecoveryActionRate,
          autonomyGuardrailRate: latest.metrics.autonomyGuardrailRate,
          budgetEscalationRate: latest.metrics.budgetEscalationRate,
          manualHandoffRate: latest.metrics.manualHandoffRate,
        }
      : {
          collectEvidenceRate: null,
          retryImplementRate: null,
          manualReviewRate: null,
          autoRecoveryActionRate: null,
          autonomyGuardrailRate: null,
          budgetEscalationRate: null,
          manualHandoffRate: null,
        },
    entries: summary.entries.map((entry) => ({
      kind: entry.kind,
      name: entry.name,
      generatedAt: entry.generatedAt,
      passed: entry.passed,
      failed: entry.failed,
    })),
  };
}
