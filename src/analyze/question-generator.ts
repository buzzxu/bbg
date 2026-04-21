import type { AnalyzeFocusSummary, AnalyzeKnowledgeGap } from "./types.js";

function normalizeQuestion(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function generateSocraticInterviewQuestions(input: {
  baseGaps: AnalyzeKnowledgeGap[];
  ambiguities: Array<{
    id: string;
    summary: string;
    severity: "critical" | "significant" | "minor";
    evidenceId: string;
  }>;
  focus: AnalyzeFocusSummary | null;
}): AnalyzeKnowledgeGap[] {
  const questionMap = new Map(input.baseGaps.map((gap) => [gap.key, gap] as const));
  const generated: AnalyzeKnowledgeGap[] = [];

  for (const [index, ambiguity] of input.ambiguities.entries()) {
    const priorityBoost = ambiguity.severity === "critical" ? 0 : ambiguity.severity === "significant" ? 1 : 2;
    const key = input.baseGaps[index % Math.max(input.baseGaps.length, 1)]?.key ?? "criticalFlows";
    const focusHint = input.focus?.query ? ` Focus area: ${input.focus.query}.` : "";
    const fallback = questionMap.get(key);
    generated.push({
      key,
      question: normalizeQuestion(
        `Code evidence is ambiguous: ${ambiguity.summary}. What is the intended business behavior and boundary here?${focusHint}`,
      ),
      reason: `socratic ambiguity ${ambiguity.id} (${ambiguity.severity})`,
      priority: Math.max(1, index + 1 + priorityBoost),
    });
    if (fallback) {
      generated.push({
        ...fallback,
        priority: Math.max(generated[generated.length - 1]?.priority ?? 1, fallback.priority + 1),
      });
    }
  }

  const dedup = new Map<string, AnalyzeKnowledgeGap>();
  for (const gap of [...generated, ...input.baseGaps]) {
    const dedupKey = `${gap.key}:${gap.question}`;
    if (!dedup.has(dedupKey)) {
      dedup.set(dedupKey, gap);
    }
  }
  return [...dedup.values()].sort((left, right) => left.priority - right.priority).slice(0, 8);
}
