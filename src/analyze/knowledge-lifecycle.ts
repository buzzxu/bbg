import type {
  AnalyzeKnowledgeItem,
  AnalyzeKnowledgeLifecycleState,
  AnalyzeRunDiffEntry,
  AnalyzeRunDiffSummary,
} from "./types.js";

function toReviewRequired(input: { status: AnalyzeKnowledgeItem["status"]; confidence: number }): boolean {
  if (input.status === "stale" || input.status === "superseded") {
    return true;
  }
  return input.confidence < 0.55;
}

export function buildAnalyzeKnowledgeLifecycleStates(items: AnalyzeKnowledgeItem[]): AnalyzeKnowledgeLifecycleState[] {
  return items.map((item) => ({
    knowledgeItemId: item.id,
    status: item.status,
    confidence: item.confidence,
    freshnessStatus: item.freshness.freshnessStatus,
    reviewRequired: toReviewRequired({ status: item.status, confidence: item.confidence }),
    supersededBy: item.history.supersededBy,
  }));
}

function classifyChange(input: {
  previous: AnalyzeKnowledgeItem | null;
  current: AnalyzeKnowledgeItem | null;
}): AnalyzeRunDiffEntry["changeKind"] {
  if (!input.previous && input.current) {
    return "new";
  }
  if (input.previous && !input.current) {
    return "removed";
  }
  if (!input.previous || !input.current) {
    return "unchanged";
  }
  if (input.current.status === "superseded") {
    return "replaced";
  }
  if (input.current.confidence > input.previous.confidence + 0.02) {
    return "strengthened";
  }
  if (input.current.confidence < input.previous.confidence - 0.02) {
    return "weakened";
  }
  return "unchanged";
}

export function buildAnalyzeRunDiff(input: {
  currentItems: AnalyzeKnowledgeItem[];
  previousItems: AnalyzeKnowledgeItem[];
}): { summary: AnalyzeRunDiffSummary; changes: AnalyzeRunDiffEntry[] } {
  const previousById = new Map(input.previousItems.map((item) => [item.id, item] as const));
  const currentById = new Map(input.currentItems.map((item) => [item.id, item] as const));
  const keys = [...new Set([...previousById.keys(), ...currentById.keys()])].sort();

  const changes: AnalyzeRunDiffEntry[] = keys.map((id) => {
    const previous = previousById.get(id) ?? null;
    const current = currentById.get(id) ?? null;
    const changeKind = classifyChange({ previous, current });
    return {
      knowledgeItemId: id,
      changeKind,
      previousConfidence: previous?.confidence ?? null,
      currentConfidence: current?.confidence ?? null,
      note:
        changeKind === "new"
          ? "New knowledge item generated during this run."
          : changeKind === "removed"
            ? "Knowledge item no longer appears in the current run output."
            : changeKind === "strengthened"
              ? "Confidence increased with additional evidence."
              : changeKind === "weakened"
                ? "Confidence decreased or contradiction was introduced."
                : changeKind === "replaced"
                  ? "Knowledge item was superseded by a newer item."
                  : "Knowledge item remains stable.",
    };
  });

  const summary: AnalyzeRunDiffSummary = {
    newItems: changes.filter((entry) => entry.changeKind === "new").length,
    unchangedItems: changes.filter((entry) => entry.changeKind === "unchanged").length,
    strengthenedItems: changes.filter((entry) => entry.changeKind === "strengthened").length,
    weakenedItems: changes.filter((entry) => entry.changeKind === "weakened").length,
    supersededItems: changes.filter((entry) => entry.changeKind === "replaced").length,
    removedItems: changes.filter((entry) => entry.changeKind === "removed").length,
  };

  return { summary, changes };
}
