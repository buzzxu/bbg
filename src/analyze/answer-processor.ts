import type { AnalyzeInterviewQuestionKey, AnalyzeKnowledgeProvenance, AnalyzeProjectContext } from "./types.js";

function splitStructuredAnswer(answer: string): string[] {
  return answer
    .split(/\n|;/g)
    .map((entry) => entry.replace(/^[\s*-]+/, "").trim())
    .filter((entry) => entry.length > 0);
}

function applyStructuredAnswer(
  context: AnalyzeProjectContext,
  key: AnalyzeInterviewQuestionKey,
  answer: string,
): AnalyzeProjectContext {
  const value = answer.trim();
  if (value.length === 0) {
    return context;
  }
  switch (key) {
    case "businessGoal":
      return { ...context, businessGoal: value };
    case "criticalFlows":
      return { ...context, criticalFlows: splitStructuredAnswer(value) };
    case "systemBoundaries":
      return { ...context, systemBoundaries: splitStructuredAnswer(value) };
    case "nonNegotiableConstraints":
      return { ...context, nonNegotiableConstraints: splitStructuredAnswer(value) };
    case "failureHotspots":
      return { ...context, failureHotspots: splitStructuredAnswer(value) };
    case "decisionHistory":
      return { ...context, decisionHistory: splitStructuredAnswer(value) };
  }
}

export function processSocraticAnswers(input: {
  context: AnalyzeProjectContext;
  answers: Partial<Record<AnalyzeInterviewQuestionKey, string>>;
}): {
  context: AnalyzeProjectContext;
  answeredKeys: AnalyzeInterviewQuestionKey[];
  provenance: AnalyzeKnowledgeProvenance[];
} {
  let context = { ...input.context };
  const answeredKeys: AnalyzeInterviewQuestionKey[] = [];

  for (const [key, raw] of Object.entries(input.answers) as Array<[AnalyzeInterviewQuestionKey, string | undefined]>) {
    const value = raw?.trim() ?? "";
    if (!value) {
      continue;
    }
    context = applyStructuredAnswer(context, key, value);
    answeredKeys.push(key);
  }

  return {
    context,
    answeredKeys,
    provenance: answeredKeys.map((key) => ({
      source: "interview-answer",
      ref: `socratic:${key}`,
      description: "Captured from Socratic interview answer.",
      confidenceImpact: 0.18,
      codeRefs: [],
    })),
  };
}
