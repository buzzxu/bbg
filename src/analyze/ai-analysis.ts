import { buildAnalyzeAiClaimId, buildAnalyzeAiPromptPreview } from "./ai-prompt.js";
import type {
  AnalyzeAiAnalysisResult,
  AnalyzeAiClaim,
  AnalyzeAiDimensionCandidate,
  AnalyzeCriticalFlow,
  AnalyzeEvidenceItem,
  AnalyzeFocusSummary,
  AnalyzeInterviewSummary,
  AnalyzeKnowledgeModel,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  WorkspaceFusionResult,
} from "./types.js";
import type { AnalyzeAiExecutionPlan } from "../runtime/ai-analysis-runner.js";

function clamp(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function evidenceRefsForFlow(flow: AnalyzeCriticalFlow): string[] {
  return unique([
    ...flow.participatingRepos.map((repo) => `repo:${repo}`),
    ...flow.contracts,
    ...flow.failurePoints,
    ...flow.evidence.signals,
  ]).slice(0, 8);
}

function buildNarrativeSections(input: {
  focus: AnalyzeFocusSummary | null;
  fusion: WorkspaceFusionResult;
  model: AnalyzeKnowledgeModel;
  interview: AnalyzeInterviewSummary | null;
}): { business: string[]; technical: string[] } {
  const business = [
    input.interview?.context.businessGoal
      ? `Primary business goal appears to be ${input.interview.context.businessGoal}.`
      : `Business intent is inferred from ${input.model.capabilities.length} capability signal(s) across ${input.fusion.businessModules.length} module(s).`,
    input.model.businessChains.length > 0
      ? `Core value is delivered through ${input.model.businessChains.length} principal business chain(s): ${input.model.businessChains
          .slice(0, 3)
          .map((chain) => chain.summary)
          .join("; ")}.`
      : "No business chains were confidently identified yet.",
    input.focus?.query
      ? `The focus query "${input.focus.query}" shifts attention toward ${input.focus.matchedRepos.join(", ") || "the wider workspace"}.`
      : `Analysis spans ${input.fusion.repos.length} repository role(s) with cross-module business coordination.`,
  ];
  const technical = [
    `The workspace currently coordinates ${input.fusion.integrationEdges.length} inferred integration edge(s) across ${input.fusion.repos.length} repo(s).`,
    input.model.contractSurfaces.length > 0
      ? `Technical boundaries are primarily expressed through ${input.model.contractSurfaces.length} contract surface(s).`
      : "Technical boundaries are still mostly implicit in code structure and repo roles.",
    input.model.riskSurface.length > 0
      ? `Most fragile areas cluster around ${input.model.riskSurface
          .slice(0, 3)
          .map((risk) => risk.title)
          .join("; ")}.`
      : "No dominant runtime risk cluster was inferred from current evidence.",
  ];
  return { business, technical };
}

function buildDimensionCandidates(model: AnalyzeKnowledgeModel): AnalyzeAiDimensionCandidate[] {
  return model.analysisDimensions.map((dimension, index) => ({
    ...dimension,
    recommendedPriority: dimension.recommendedPriority ?? (index < 2 ? "high" : index < 4 ? "medium" : "low"),
    businessObjects: dimension.businessObjects ?? model.keyBusinessObjects.slice(0, 3),
    keyQuestions: dimension.keyQuestions ?? [
      `Which workflows depend most on ${dimension.name}?`,
      `What breaks first if ${dimension.name} changes across repos ${dimension.supportingRepos.join(", ") || "unknown"}?`,
    ],
    triggerSignals: dimension.triggerSignals ?? dimension.evidence.signals.slice(0, 6),
    evidenceRefs: unique([
      ...dimension.supportingRepos.map((repo) => `repo:${repo}`),
      ...dimension.evidence.signals,
    ]).slice(0, 8),
    confidence: clamp(dimension.confidence + 0.04),
    provenance: [
      ...(dimension.provenance ?? []),
      {
        source: "llm-inference" as const,
        ref: `ai-dimension:${dimension.name}`,
        description: "Synthesized from workspace evidence to prioritize business analysis dimensions.",
        confidenceImpact: 0.08,
        codeRefs: [],
      },
    ],
  }));
}

function buildClaims(input: {
  dimensions: AnalyzeAiDimensionCandidate[];
  chains: AnalyzeCriticalFlow[];
  narratives: { business: string[]; technical: string[] };
  unknowns: string[];
}): AnalyzeAiClaim[] {
  const claims: AnalyzeAiClaim[] = [];
  for (const dimension of input.dimensions.slice(0, 5)) {
    claims.push({
      id: buildAnalyzeAiClaimId("dimension", dimension.name),
      kind: "dimension",
      statement: `Recommended analysis dimension: ${dimension.name}`,
      rationale: dimension.rationale,
      evidenceRefs: dimension.evidenceRefs,
      confidence: dimension.confidence,
      status: "supported",
    });
  }
  for (const chain of input.chains.slice(0, 3)) {
    claims.push({
      id: buildAnalyzeAiClaimId("chain", chain.summary),
      kind: "chain",
      statement: chain.summary,
      rationale: chain.goal ?? chain.evidence.summary,
      evidenceRefs: evidenceRefsForFlow(chain),
      confidence: chain.confidence,
      status: "supported",
    });
  }
  for (const narrative of [...input.narratives.business, ...input.narratives.technical].slice(0, 4)) {
    claims.push({
      id: buildAnalyzeAiClaimId("narrative", narrative),
      kind: "narrative",
      statement: narrative,
      rationale: "Narrative synthesized from cross-repo evidence, contracts, and business chains.",
      evidenceRefs: [],
      confidence: 0.64,
      status: "supported",
    });
  }
  for (const unknown of input.unknowns.slice(0, 4)) {
    claims.push({
      id: buildAnalyzeAiClaimId("decision", unknown),
      kind: "decision",
      statement: unknown,
      rationale: "Open question retained because evidence or explicit confirmation is incomplete.",
      evidenceRefs: [],
      confidence: 0.34,
      status: "unknown",
    });
  }
  return claims;
}

export function synthesizeAnalyzeAiResult(input: {
  execution: AnalyzeAiExecutionPlan;
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
  interview: AnalyzeInterviewSummary | null;
  focus: AnalyzeFocusSummary | null;
  model: AnalyzeKnowledgeModel;
  evidence: AnalyzeEvidenceItem[];
}): AnalyzeAiAnalysisResult {
  const generatedAt = new Date().toISOString();
  const narratives = buildNarrativeSections({
    focus: input.focus,
    fusion: input.fusion,
    model: input.model,
    interview: input.interview,
  });
  const recommendedDimensions = buildDimensionCandidates(input.model);
  const coreBusinessChains = input.model.businessChains.slice(0, 5).map((chain) => ({
    ...chain,
    evidenceRefs: evidenceRefsForFlow(chain),
    confidence: clamp(chain.confidence + 0.03),
    provenance: [
      ...(chain.provenance ?? []),
      {
        source: "llm-inference" as const,
        ref: `ai-chain:${chain.name}`,
        description: "Synthesized from evidence to narrate the core business chain.",
        confidenceImpact: 0.08,
        codeRefs: [],
      },
    ],
  }));
  const unknowns = unique([
    ...(input.interview?.pendingQuestions.map((gap) => gap.question) ?? []),
    ...(input.focus?.followupQuestions ?? []),
  ]).slice(0, 8);
  const contradictions = input.evidence
    .filter((item) => item.contradictions.length > 0)
    .flatMap((item) => item.contradictions.map((entry) => `${item.summary}: ${entry}`))
    .slice(0, 6);

  return {
    enabled: input.execution.enabled,
    mode: input.execution.mode,
    provider: input.execution.provider,
    modelClass: input.execution.modelClass,
    generatedAt,
    recommendedDimensions,
    businessArchitectureNarrative: narratives.business,
    technicalArchitectureNarrative: narratives.technical,
    coreBusinessChains,
    keyBusinessObjects: input.model.keyBusinessObjects.slice(0, 8),
    decisionHypotheses: input.model.decisionRecords.slice(0, 6).map((decision) => decision.statement),
    unknowns,
    contradictions,
    claims: buildClaims({
      dimensions: recommendedDimensions,
      chains: coreBusinessChains,
      narratives,
      unknowns,
    }),
    promptPreview: buildAnalyzeAiPromptPreview({
      technical: input.technical,
      business: input.business,
      fusion: input.fusion,
      interview: input.interview,
      focus: input.focus,
      model: input.model,
      evidence: input.evidence,
    }),
  };
}
