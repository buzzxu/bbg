import { join } from "node:path";
import { readIfExists, writeTextFile } from "../utils/fs.js";
import type { AnalyzeKnowledgeItem, AnalyzeKnowledgeSnapshot } from "./types.js";

interface AnalyzeHermesArtifactRecord {
  runId: string;
  snapshotPath: string;
  createdAt: string;
  scope: "repo" | "workspace";
  repos: string[];
  focusQuery: string | null;
}

interface AnalyzeHermesCandidateRecord {
  id: string;
  runId: string;
  knowledgeItemId: string;
  kind: AnalyzeKnowledgeItem["kind"];
  title: string;
  confidence: number;
  recommendedTarget: "wiki" | "process" | "rule" | "skill" | "report";
  changeKind: string;
  evidenceRefs: string[];
  createdAt: string;
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function recommendedTarget(kind: AnalyzeKnowledgeItem["kind"]): AnalyzeHermesCandidateRecord["recommendedTarget"] {
  if (kind === "critical-flow") {
    return "process";
  }
  if (kind === "runtime-constraint") {
    return "rule";
  }
  if (kind === "analysis-dimension") {
    return "skill";
  }
  if (kind === "risk-item") {
    return "report";
  }
  return "wiki";
}

function shouldCreateCandidate(input: { item: AnalyzeKnowledgeItem; changeKind: string }): boolean {
  if (input.item.confidence < 0.45) {
    return false;
  }
  if (input.changeKind === "unchanged") {
    return false;
  }
  return [
    "critical-flow",
    "contract-surface",
    "domain-context",
    "runtime-constraint",
    "risk-item",
    "analysis-dimension",
  ].includes(input.item.kind);
}

export async function writeAnalyzeHermesIntake(input: {
  cwd: string;
  runId: string;
  snapshotPath: string;
}): Promise<{ artifactsPath: string; candidatesPath: string; artifactsAdded: number; candidatesAdded: number }> {
  const snapshotRaw = await readIfExists(join(input.cwd, input.snapshotPath));
  if (!snapshotRaw) {
    return {
      artifactsPath: ".bbg/knowledge/hermes/analyze-artifacts.json",
      candidatesPath: ".bbg/knowledge/hermes/analyze-candidates.json",
      artifactsAdded: 0,
      candidatesAdded: 0,
    };
  }

  const snapshot = parseJson<AnalyzeKnowledgeSnapshot | null>(snapshotRaw, null);
  if (!snapshot) {
    return {
      artifactsPath: ".bbg/knowledge/hermes/analyze-artifacts.json",
      candidatesPath: ".bbg/knowledge/hermes/analyze-candidates.json",
      artifactsAdded: 0,
      candidatesAdded: 0,
    };
  }

  const artifactsPath = ".bbg/knowledge/hermes/analyze-artifacts.json";
  const candidatesPath = ".bbg/knowledge/hermes/analyze-candidates.json";
  const existingArtifactsRaw = await readIfExists(join(input.cwd, artifactsPath));
  const existingCandidatesRaw = await readIfExists(join(input.cwd, candidatesPath));
  const existingArtifacts = parseJson<{ artifacts: AnalyzeHermesArtifactRecord[] }>(existingArtifactsRaw, {
    artifacts: [],
  });
  const existingCandidates = parseJson<{ candidates: AnalyzeHermesCandidateRecord[] }>(existingCandidatesRaw, {
    candidates: [],
  });

  const artifactRecord: AnalyzeHermesArtifactRecord = {
    runId: snapshot.runId,
    snapshotPath: input.snapshotPath,
    createdAt: snapshot.createdAt,
    scope: snapshot.scope,
    repos: snapshot.repos,
    focusQuery: snapshot.focusQuery,
  };

  const artifactByRun = new Map(existingArtifacts.artifacts.map((entry) => [entry.runId, entry] as const));
  const hadArtifact = artifactByRun.has(artifactRecord.runId);
  artifactByRun.set(artifactRecord.runId, artifactRecord);

  const knowledgeItemsPath = join(input.cwd, snapshot.paths.knowledgeItems);
  const runDiffPath = join(input.cwd, snapshot.paths.runDiff);
  const knowledgeItems = parseJson<{ items: AnalyzeKnowledgeItem[] }>(await readIfExists(knowledgeItemsPath), {
    items: [],
  }).items;
  const runDiffChanges = parseJson<{ changes: Array<{ knowledgeItemId: string; changeKind: string }> }>(
    await readIfExists(runDiffPath),
    { changes: [] },
  ).changes;
  const changeById = new Map(runDiffChanges.map((entry) => [entry.knowledgeItemId, entry.changeKind] as const));

  const candidateById = new Map(existingCandidates.candidates.map((entry) => [entry.id, entry] as const));
  const now = new Date().toISOString();
  let candidatesAdded = 0;

  for (const item of knowledgeItems) {
    const changeKind = changeById.get(item.id) ?? "new";
    if (!shouldCreateCandidate({ item, changeKind })) {
      continue;
    }
    const candidateId = `analyze:${snapshot.runId}:${item.id}`;
    if (!candidateById.has(candidateId)) {
      candidatesAdded += 1;
    }
    candidateById.set(candidateId, {
      id: candidateId,
      runId: snapshot.runId,
      knowledgeItemId: item.id,
      kind: item.kind,
      title: item.title,
      confidence: item.confidence,
      recommendedTarget: recommendedTarget(item.kind),
      changeKind,
      evidenceRefs: item.provenance.map((entry) => entry.ref),
      createdAt: now,
    });
  }

  await writeTextFile(
    join(input.cwd, artifactsPath),
    `${JSON.stringify(
      {
        version: 1,
        updatedAt: now,
        source: "analyze",
        artifacts: [...artifactByRun.values()].sort((left, right) => right.runId.localeCompare(left.runId)),
      },
      null,
      2,
    )}\n`,
  );
  await writeTextFile(
    join(input.cwd, candidatesPath),
    `${JSON.stringify(
      {
        version: 1,
        updatedAt: now,
        source: "analyze",
        candidates: [...candidateById.values()].sort((left, right) => right.runId.localeCompare(left.runId)),
      },
      null,
      2,
    )}\n`,
  );

  return {
    artifactsPath,
    candidatesPath,
    artifactsAdded: hadArtifact ? 0 : 1,
    candidatesAdded,
  };
}
