import { runAnalyzeDeepInterview } from "./deep-interview.js";
import { collectAnalyzeEvidenceItems } from "./evidence-collector.js";
import {
  computeSocraticCompositeScore,
  deriveSocraticInterviewDimensions,
  detectSocraticAmbiguitySignals,
} from "./interview-dimensions.js";
import { generateSocraticInterviewQuestions } from "./question-generator.js";
import { processSocraticAnswers } from "./answer-processor.js";
import type {
  AnalyzeFocusSummary,
  AnalyzeInterviewSummary,
  AnalyzePhaseSummary,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  RunAnalyzeCommandInput,
  WorkspaceFusionResult,
} from "./types.js";

export async function runAnalyzeSocraticInterview(input: {
  cwd: string;
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
  command: RunAnalyzeCommandInput;
  focus: AnalyzeFocusSummary | null;
}): Promise<{ summary: AnalyzeInterviewSummary; phase: AnalyzePhaseSummary }> {
  const baseline = await runAnalyzeDeepInterview({
    cwd: input.cwd,
    technical: input.technical,
    business: input.business,
    fusion: input.fusion,
    command: input.command,
  });

  const answerProcessing = processSocraticAnswers({
    context: baseline.summary.context,
    answers: input.command.interview?.answers ?? {},
  });
  const context = answerProcessing.answeredKeys.length > 0 ? answerProcessing.context : baseline.summary.context;

  const evidence = collectAnalyzeEvidenceItems({
    runId: `socratic-${Date.now()}`,
    technical: input.technical,
    business: input.business,
    fusion: input.fusion,
    interview: {
      ...baseline.summary,
      context,
    },
    knowledgeItems: [],
  });
  const dimensions = deriveSocraticInterviewDimensions({
    evidence,
    focus: input.focus,
  });
  const ambiguities = detectSocraticAmbiguitySignals({ evidence });
  const generatedQuestions = generateSocraticInterviewQuestions({
    baseGaps: baseline.summary.gaps,
    ambiguities,
    focus: input.focus,
  });

  const pendingQuestions =
    baseline.summary.pendingQuestions.length > 0
      ? baseline.summary.pendingQuestions
      : generatedQuestions.filter((gap) => gap.priority <= 3 && /critical|significant/.test(gap.reason));

  const summary: AnalyzeInterviewSummary = {
    ...baseline.summary,
    context,
    pendingQuestions,
    pendingQuestionsPath: pendingQuestions.length > 0 ? baseline.summary.pendingQuestionsPath : null,
    answered: Math.max(baseline.summary.answered, answerProcessing.answeredKeys.length),
    assumptionsApplied: [
      ...baseline.summary.assumptionsApplied,
      ...answerProcessing.provenance.map((entry) => ({
        key: "businessGoal" as const,
        values: [entry.description],
        rationale: entry.ref,
        evidence: [entry.source],
      })),
    ],
    socratic: {
      enabled: true,
      dimensions: dimensions.map((dimension) => ({
        id: dimension.id,
        name: dimension.name,
        weight: dimension.weight,
        score: dimension.score,
        tier: dimension.tier,
      })),
      ambiguitySignals: ambiguities.map((signal) => signal.summary),
    },
  };

  const phase: AnalyzePhaseSummary = {
    ...baseline.phase,
    status: pendingQuestions.length > 0 && baseline.summary.mode !== "off" ? "pending" : baseline.phase.status,
    details: [
      ...baseline.phase.details,
      "socratic=enabled",
      `dimensions=${dimensions.length}`,
      `ambiguities=${ambiguities.length}`,
      `composite=${computeSocraticCompositeScore(dimensions)}`,
    ],
  };

  return {
    summary,
    phase,
  };
}
