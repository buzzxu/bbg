import type {
  AnalyzeAiAnalysisResult,
  AnalyzeEvidenceItem,
  AnalyzeFocusSummary,
  AnalyzeInterviewSummary,
  AnalyzeKnowledgeModel,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  WorkspaceFusionResult,
} from "./types.js";

export function buildAnalyzeAiPromptPreview(input: {
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
  interview: AnalyzeInterviewSummary | null;
  focus: AnalyzeFocusSummary | null;
  model: AnalyzeKnowledgeModel;
  evidence: AnalyzeEvidenceItem[];
}): string[] {
  return [
    `repos=${input.technical.map((repo) => `${repo.repo.name}:${repo.repo.type}`).join(", ") || "none"}`,
    `modules=${input.fusion.businessModules.map((module) => module.name).join(", ") || "none"}`,
    `focus=${input.focus?.query ?? "none"}`,
    `goal=${input.interview?.context.businessGoal ?? "unknown"}`,
    `dimensions=${input.model.analysisDimensions.map((dimension) => dimension.name).join(" | ") || "none"}`,
    `chains=${input.model.businessChains.map((chain) => chain.summary).join(" | ") || "none"}`,
    `evidence=${
      input.evidence
        .slice(0, 6)
        .map((item) => item.summary)
        .join(" | ") || "none"
    }`,
  ];
}

export function buildAnalyzeAiClaimId(
  kind: AnalyzeAiAnalysisResult["claims"][number]["kind"],
  statement: string,
): string {
  return `ai:${kind}:${
    statement
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "claim"
  }`;
}
