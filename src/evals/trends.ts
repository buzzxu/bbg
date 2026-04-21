import type { EvalExperimentMetrics } from "./metrics.js";

const NEGATIVE_WHEN_DECREASES = [
  "passRate",
  "workspaceAnalysisRate",
  "workspaceKnowledgeRate",
  "hermesWorkflowInfluenceRate",
  "hermesRecoveryInfluenceRate",
  "hermesVerificationInfluenceRate",
  "collectEvidenceRecoveryRate",
  "retryImplementRecoveryRate",
  "manualReviewRate",
  "autoRecoveryActionRate",
  "autonomyGuardrailRate",
  "budgetEscalationRate",
  "manualHandoffRate",
  "taskCompletionRate",
  "firstPassVerificationRate",
  "verificationRecordedRate",
  "recoveryRate",
  "evidenceRecoveryRate",
  "hermesContextUsageRate",
  "loopBoundRate",
  "loopCompletionRate",
  "runnerLaunchRate",
  "runnerFallbackSuccessRate",
  "crossToolResumeRate",
] as const;

const NEGATIVE_WHEN_INCREASES = ["blockedRate"] as const;

export function buildMetricDiffs(
  baseMetrics: EvalExperimentMetrics,
  headMetrics: EvalExperimentMetrics,
): Record<string, number> {
  const metricKeys = Object.keys(headMetrics) as Array<keyof EvalExperimentMetrics>;
  return Object.fromEntries(metricKeys.map((key) => [key, Number((headMetrics[key] - baseMetrics[key]).toFixed(4))]));
}

export function summarizeMetricDiffs(metricDiffs: Record<string, number>): {
  regressions: string[];
  improvements: string[];
} {
  const regressions: string[] = [];
  const improvements: string[] = [];

  for (const key of NEGATIVE_WHEN_DECREASES) {
    const diff = metricDiffs[key];
    if (diff < 0) {
      regressions.push(`${key} regressed by ${diff}`);
    } else if (diff > 0) {
      improvements.push(`${key} improved by +${diff}`);
    }
  }

  for (const key of NEGATIVE_WHEN_INCREASES) {
    const diff = metricDiffs[key];
    if (diff > 0) {
      regressions.push(`${key} regressed by +${diff}`);
    } else if (diff < 0) {
      improvements.push(`${key} improved by ${diff}`);
    }
  }

  return {
    regressions,
    improvements,
  };
}
