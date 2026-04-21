import type { AnalyzeEvidenceItem, AnalyzeFocusSummary } from "./types.js";

export interface SocraticInterviewDimension {
  id: string;
  name: string;
  tier: 1 | 2;
  weight: number;
  score: number;
  triggeredBy: string[];
}

function clamp(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

function normalizeWeights(dimensions: SocraticInterviewDimension[]): SocraticInterviewDimension[] {
  const total = dimensions.reduce((sum, item) => sum + item.weight, 0) || 1;
  return dimensions.map((item) => ({
    ...item,
    weight: Number((item.weight / total).toFixed(3)),
  }));
}

export function deriveSocraticInterviewDimensions(input: {
  evidence: AnalyzeEvidenceItem[];
  focus: AnalyzeFocusSummary | null;
}): SocraticInterviewDimension[] {
  const dimensions: SocraticInterviewDimension[] = [
    { id: "business-goal", name: "Business Goal", tier: 1, weight: 0.2, score: 0.42, triggeredBy: [] },
    { id: "domain-model", name: "Core Domain Model", tier: 1, weight: 0.18, score: 0.4, triggeredBy: [] },
    { id: "critical-flows", name: "Critical Business Flows", tier: 1, weight: 0.18, score: 0.38, triggeredBy: [] },
    { id: "contracts", name: "Integration Contracts", tier: 1, weight: 0.12, score: 0.43, triggeredBy: [] },
    { id: "risk-topology", name: "Failure And Risk Topology", tier: 1, weight: 0.12, score: 0.41, triggeredBy: [] },
    { id: "runtime-constraints", name: "Operational Constraints", tier: 1, weight: 0.1, score: 0.39, triggeredBy: [] },
    { id: "evolution", name: "Evolution Intent", tier: 1, weight: 0.1, score: 0.35, triggeredBy: [] },
  ];

  const hasTransactionSignals = input.evidence.some((entry) =>
    /(payment|order|checkout|transaction|refund)/i.test(entry.summary),
  );
  const hasTenantSignals = input.evidence.some((entry) => /(tenant|rbac|permission|auth)/i.test(entry.summary));
  const hasWorkflowSignals = input.evidence.some((entry) => /(workflow|approval|state|status)/i.test(entry.summary));
  const hasRealtimeSignals = input.evidence.some((entry) => /(realtime|websocket|event|push)/i.test(entry.summary));

  if (hasTransactionSignals) {
    dimensions.push({
      id: "transaction-consistency",
      name: "Transaction Consistency",
      tier: 2,
      weight: 0.15,
      score: 0.34,
      triggeredBy: input.evidence
        .filter((entry) => /(payment|order|checkout|transaction|refund)/i.test(entry.summary))
        .slice(0, 4)
        .map((entry) => entry.id),
    });
  }
  if (hasTenantSignals) {
    dimensions.push({
      id: "tenant-isolation",
      name: "Tenant Isolation",
      tier: 2,
      weight: 0.14,
      score: 0.35,
      triggeredBy: input.evidence
        .filter((entry) => /(tenant|rbac|permission|auth)/i.test(entry.summary))
        .slice(0, 4)
        .map((entry) => entry.id),
    });
  }
  if (hasWorkflowSignals) {
    dimensions.push({
      id: "workflow-state-machine",
      name: "Workflow State Machine",
      tier: 2,
      weight: 0.13,
      score: 0.33,
      triggeredBy: input.evidence
        .filter((entry) => /(workflow|approval|state|status)/i.test(entry.summary))
        .slice(0, 4)
        .map((entry) => entry.id),
    });
  }
  if (hasRealtimeSignals) {
    dimensions.push({
      id: "realtime-sync",
      name: "Realtime Synchronization",
      tier: 2,
      weight: 0.12,
      score: 0.33,
      triggeredBy: input.evidence
        .filter((entry) => /(realtime|websocket|event|push)/i.test(entry.summary))
        .slice(0, 4)
        .map((entry) => entry.id),
    });
  }

  const focusTokens = input.focus?.matchedSignals.join(" ").toLowerCase() ?? "";
  const boosted = dimensions.map((dimension) => ({
    ...dimension,
    score: clamp(
      focusTokens.length > 0 && focusTokens.includes(dimension.name.toLowerCase().split(" ")[0] ?? "")
        ? dimension.score + 0.08
        : dimension.score,
    ),
  }));
  return normalizeWeights(boosted);
}

export function detectSocraticAmbiguitySignals(input: {
  evidence: AnalyzeEvidenceItem[];
  threshold?: number;
}): Array<{ id: string; summary: string; severity: "critical" | "significant" | "minor"; evidenceId: string }> {
  const threshold = input.threshold ?? 0.55;
  const signals = input.evidence
    .filter((entry) => entry.clarity < threshold)
    .map((entry) => {
      const severity: "critical" | "significant" | "minor" =
        entry.clarity < 0.3 ? "critical" : entry.clarity < 0.45 ? "significant" : "minor";
      return {
        id: `amb:${entry.id}`,
        summary: entry.summary,
        severity,
        evidenceId: entry.id,
      };
    });

  return signals.slice(0, 20);
}

export function computeSocraticCompositeScore(dimensions: SocraticInterviewDimension[]): number {
  const weighted = dimensions.reduce((sum, dimension) => sum + dimension.weight * dimension.score, 0);
  const totalWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0) || 1;
  return clamp(weighted / totalWeight);
}
