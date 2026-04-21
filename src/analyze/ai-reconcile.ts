import type {
  AnalyzeAiAnalysisResult,
  AnalyzeAiReconciliationResult,
  AnalyzeBusinessDimension,
  AnalyzeCriticalFlow,
  AnalyzeKnowledgeModel,
  AnalyzeKnowledgeProvenance,
} from "./types.js";

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function aiProvenance(ref: string, description: string): AnalyzeKnowledgeProvenance {
  return {
    source: "llm-inference",
    ref,
    description,
    confidenceImpact: 0.08,
    codeRefs: [],
  };
}

function mergeDimensions(
  baseline: AnalyzeBusinessDimension[],
  ai: AnalyzeAiAnalysisResult["recommendedDimensions"],
): {
  dimensions: AnalyzeBusinessDimension[];
  adopted: string[];
} {
  const byName = new Map(baseline.map((dimension) => [dimension.name.toLowerCase(), dimension] as const));
  const adopted: string[] = [];
  for (const candidate of ai) {
    const key = candidate.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing || candidate.confidence >= existing.confidence - 0.05) {
      adopted.push(candidate.name);
      byName.set(key, {
        ...candidate,
        status: candidate.confidence >= 0.75 ? "inferred" : (candidate.status ?? "candidate"),
        provenance: [
          ...(candidate.provenance ?? []),
          aiProvenance(`reconcile:dimension:${candidate.name}`, "Adopted from AI analysis after reconcile."),
        ],
      });
    }
  }
  return {
    dimensions: [...byName.values()].sort(
      (left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name),
    ),
    adopted,
  };
}

function mergeChains(
  baseline: AnalyzeCriticalFlow[],
  ai: AnalyzeAiAnalysisResult["coreBusinessChains"],
): {
  chains: AnalyzeCriticalFlow[];
  adopted: string[];
} {
  const byName = new Map(baseline.map((chain) => [chain.name.toLowerCase(), chain] as const));
  const adopted: string[] = [];
  for (const candidate of ai) {
    const key = candidate.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing || candidate.confidence >= existing.confidence - 0.05) {
      adopted.push(candidate.name);
      byName.set(key, {
        ...candidate,
        status: candidate.confidence >= 0.75 ? "inferred" : (candidate.status ?? "candidate"),
        provenance: [
          ...(candidate.provenance ?? []),
          aiProvenance(`reconcile:chain:${candidate.name}`, "Adopted from AI analysis after reconcile."),
        ],
      });
    }
  }
  return {
    chains: [...byName.values()].sort(
      (left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name),
    ),
    adopted,
  };
}

export function reconcileAnalyzeAiResult(input: { model: AnalyzeKnowledgeModel; ai: AnalyzeAiAnalysisResult | null }): {
  model: AnalyzeKnowledgeModel;
  reconciliation: AnalyzeAiReconciliationResult | null;
} {
  if (!input.ai || !input.ai.enabled) {
    return { model: input.model, reconciliation: null };
  }

  const mergedDimensions = mergeDimensions(input.model.analysisDimensions, input.ai.recommendedDimensions);
  const mergedChains = mergeChains(input.model.businessChains, input.ai.coreBusinessChains);
  const reviewRequired = input.ai.claims
    .filter((claim) => claim.status !== "supported")
    .map((claim) => claim.statement);
  const conflicts = unique(input.ai.contradictions);

  return {
    model: {
      ...input.model,
      analysisDimensions: mergedDimensions.dimensions,
      criticalFlows: mergedChains.chains,
      businessChains: mergedChains.chains,
      keyBusinessObjects: unique([...input.model.keyBusinessObjects, ...input.ai.keyBusinessObjects]).slice(0, 12),
      businessArchitectureNarrative:
        input.ai.businessArchitectureNarrative.length > 0
          ? input.ai.businessArchitectureNarrative
          : input.model.businessArchitectureNarrative,
      technicalArchitectureNarrative:
        input.ai.technicalArchitectureNarrative.length > 0
          ? input.ai.technicalArchitectureNarrative
          : input.model.technicalArchitectureNarrative,
      unknowns: unique([...input.model.unknowns, ...input.ai.unknowns]).slice(0, 12),
      contradictions: unique([...input.model.contradictions, ...conflicts]).slice(0, 12),
    },
    reconciliation: {
      generatedAt: new Date().toISOString(),
      mode: input.ai.mode,
      adoptedDimensions: mergedDimensions.adopted,
      adoptedChains: mergedChains.adopted,
      reviewRequired,
      conflicts,
      finalBusinessArchitectureNarrative:
        input.ai.businessArchitectureNarrative.length > 0
          ? input.ai.businessArchitectureNarrative
          : input.model.businessArchitectureNarrative,
      finalTechnicalArchitectureNarrative:
        input.ai.technicalArchitectureNarrative.length > 0
          ? input.ai.technicalArchitectureNarrative
          : input.model.technicalArchitectureNarrative,
    },
  };
}
