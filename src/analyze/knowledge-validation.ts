import type { AnalyzeKnowledgeItem } from "./types.js";
import { join } from "node:path";
import { readIfExists, writeTextFile } from "../utils/fs.js";

export interface AnalyzeKnowledgeValidationEvent {
  id: string;
  knowledgeItemId: string;
  source: "verify" | "task-runtime" | "incident-review" | "human-review";
  runId: string | null;
  recordedAt: string;
  outcome: "confirmed" | "refined" | "contradicted" | "unrelated";
  confidenceDelta: number;
  notes: string;
  evidenceRefs: string[];
}

function clampConfidence(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

export function applyValidationEventsToKnowledgeItems(input: {
  items: AnalyzeKnowledgeItem[];
  events: AnalyzeKnowledgeValidationEvent[];
}): AnalyzeKnowledgeItem[] {
  const eventsById = new Map<string, AnalyzeKnowledgeValidationEvent[]>();
  for (const event of input.events) {
    const bucket = eventsById.get(event.knowledgeItemId) ?? [];
    bucket.push(event);
    eventsById.set(event.knowledgeItemId, bucket);
  }

  return input.items.map((item) => {
    const events = eventsById.get(item.id) ?? [];
    if (events.length === 0) {
      return item;
    }

    let confidence = item.confidence;
    let status = item.status;
    let freshnessStatus = item.freshness.freshnessStatus;
    let lastValidatedAt: string | null = item.freshness.lastValidatedAt;

    for (const event of events) {
      const delta = Number.isFinite(event.confidenceDelta) ? event.confidenceDelta : 0;
      if (event.outcome === "confirmed") {
        confidence = clampConfidence(confidence + Math.max(0.03, delta || 0.08));
        if (status === "candidate" || status === "inferred" || status === "observed") {
          status = "confirmed-local";
        }
        freshnessStatus = "fresh";
      } else if (event.outcome === "refined") {
        confidence = clampConfidence(confidence + Math.max(0.01, delta || 0.04));
        freshnessStatus = "needs-review";
      } else if (event.outcome === "contradicted") {
        confidence = clampConfidence(confidence - Math.max(0.04, Math.abs(delta) || 0.1));
        status = "stale";
        freshnessStatus = "stale";
      }
      if (event.outcome !== "unrelated") {
        lastValidatedAt = event.recordedAt;
      }
    }

    return {
      ...item,
      confidence,
      status,
      freshness: {
        ...item.freshness,
        freshnessStatus,
        lastValidatedAt,
      },
    };
  });
}

function parseEvents(raw: string | null): AnalyzeKnowledgeValidationEvent[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as { events?: AnalyzeKnowledgeValidationEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export async function appendAnalyzeKnowledgeValidationEvents(input: {
  cwd: string;
  events: AnalyzeKnowledgeValidationEvent[];
}): Promise<string | null> {
  if (input.events.length === 0) {
    return null;
  }

  const pathValue = ".bbg/knowledge/workspace/validation-events.json";
  const absolutePath = join(input.cwd, pathValue);
  const existing = parseEvents(await readIfExists(absolutePath));
  const eventById = new Map(existing.map((event) => [event.id, event] as const));
  for (const event of input.events) {
    eventById.set(event.id, event);
  }
  await writeTextFile(
    absolutePath,
    `${JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        source: "verify",
        events: [...eventById.values()].sort((left, right) => left.recordedAt.localeCompare(right.recordedAt)),
      },
      null,
      2,
    )}\n`,
  );

  return pathValue;
}
