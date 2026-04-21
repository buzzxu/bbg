import type { AnalyzeAiAnalysisResult } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function isAnalyzeAiAnalysisResult(value: unknown): value is AnalyzeAiAnalysisResult {
  return (
    isRecord(value) &&
    typeof value.enabled === "boolean" &&
    (value.mode === "provider" ||
      value.mode === "handoff" ||
      value.mode === "heuristic-fallback" ||
      value.mode === "disabled") &&
    (value.provider === null || typeof value.provider === "string") &&
    (value.modelClass === null ||
      value.modelClass === "fast" ||
      value.modelClass === "balanced" ||
      value.modelClass === "premium") &&
    typeof value.generatedAt === "string" &&
    Array.isArray(value.recommendedDimensions) &&
    Array.isArray(value.coreBusinessChains) &&
    isStringArray(value.businessArchitectureNarrative) &&
    isStringArray(value.technicalArchitectureNarrative) &&
    isStringArray(value.keyBusinessObjects) &&
    isStringArray(value.decisionHypotheses) &&
    isStringArray(value.unknowns) &&
    isStringArray(value.contradictions) &&
    Array.isArray(value.claims) &&
    isStringArray(value.promptPreview)
  );
}
