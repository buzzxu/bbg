import { createHash } from "node:crypto";
import type {
  AnalyzeCodeReference,
  AnalyzeEvidenceGraph,
  AnalyzeEvidenceItem,
  AnalyzeInterviewSummary,
  AnalyzeKnowledgeItem,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  WorkspaceFusionResult,
} from "./types.js";

function clamp(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

function hashId(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 10);
}

function createEvidenceId(runId: string, type: AnalyzeEvidenceItem["type"], summary: string): string {
  return `ev:${type}:${hashId(`${runId}|${type}|${summary.toLowerCase()}`)}`;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3);
}

function matchKnowledgeIds(summary: string, items: AnalyzeKnowledgeItem[]): string[] {
  const tokens = new Set(tokenize(summary));
  const matched: string[] = [];
  for (const item of items) {
    const itemTokens = tokenize(`${item.title} ${item.summary} ${item.tags.join(" ")}`);
    if (itemTokens.some((token) => tokens.has(token))) {
      matched.push(item.id);
    }
  }
  return [...new Set(matched)].slice(0, 6);
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

function codeRef(input: {
  repo: string;
  file: string;
  lineRange: [number, number];
  symbolName?: string;
  snippet?: string;
}): AnalyzeCodeReference {
  return {
    repo: input.repo,
    file: input.file,
    lineRange: input.lineRange,
    ...(input.symbolName ? { symbolName: input.symbolName } : {}),
    ...(input.snippet ? { snippet: input.snippet } : {}),
  };
}

function dedupeCodeRefs(values: AnalyzeCodeReference[]): AnalyzeCodeReference[] {
  const dedup = new Map<string, AnalyzeCodeReference>();
  for (const value of values) {
    dedup.set(`${value.repo}:${value.file}:${value.lineRange.join("-")}:${value.symbolName ?? ""}`, value);
  }
  return [...dedup.values()].slice(0, 8);
}

function routeCodeRefs(graph: AnalyzeEvidenceGraph | undefined, repo: string, route: string): AnalyzeCodeReference[] {
  if (!graph) {
    return [];
  }
  const normalizedRoute = normalizeComparable(route);
  return dedupeCodeRefs(
    graph.routes
      .filter((entry) => entry.repo === repo)
      .filter((entry) => {
        const normalizedEntry = normalizeComparable(entry.route);
        return normalizedEntry.includes(normalizedRoute) || normalizedRoute.includes(normalizedEntry);
      })
      .map((entry) =>
        codeRef({
          repo: entry.repo,
          file: entry.file,
          lineRange: entry.lineRange,
          snippet: entry.summary,
        }),
      ),
  );
}

function apiCodeRefs(graph: AnalyzeEvidenceGraph | undefined, repo: string, api: string): AnalyzeCodeReference[] {
  if (!graph) {
    return [];
  }
  const normalizedApi = normalizeComparable(api);
  return dedupeCodeRefs(
    graph.apiEndpoints
      .filter((entry) => entry.repo === repo)
      .filter((entry) => {
        const normalizedEntry = normalizeComparable(entry.path);
        return normalizedEntry.includes(normalizedApi) || normalizedApi.includes(normalizedEntry);
      })
      .map((entry) =>
        codeRef({
          repo: entry.repo,
          file: entry.file,
          lineRange: entry.lineRange,
          symbolName: entry.symbolName,
          snippet: entry.summary,
        }),
      ),
  );
}

function termCodeRefs(graph: AnalyzeEvidenceGraph | undefined, repo: string, term: string): AnalyzeCodeReference[] {
  if (!graph) {
    return [];
  }
  const normalizedTerm = normalizeComparable(term);
  const symbolRefs = graph.symbols
    .filter((entry) => entry.repo === repo && normalizeComparable(entry.name).includes(normalizedTerm))
    .map((entry) =>
      codeRef({
        repo: entry.repo,
        file: entry.file,
        lineRange: entry.lineRange,
        symbolName: entry.name,
        snippet: entry.summary,
      }),
    );
  const entityRefs = graph.dtoEntities
    .filter((entry) => entry.repo === repo && normalizeComparable(entry.name).includes(normalizedTerm))
    .map((entry) =>
      codeRef({
        repo: entry.repo,
        file: entry.file,
        lineRange: entry.lineRange,
        symbolName: entry.name,
        snippet: entry.summary,
      }),
    );
  return dedupeCodeRefs([...entityRefs, ...symbolRefs]);
}

function riskCodeRefs(graph: AnalyzeEvidenceGraph | undefined, repo: string, marker: string): AnalyzeCodeReference[] {
  if (!graph) {
    return [];
  }
  const normalizedMarker = normalizeComparable(marker);
  const endpointRefs = graph.apiEndpoints
    .filter(
      (entry) => entry.repo === repo && normalizeComparable(`${entry.path} ${entry.file}`).includes(normalizedMarker),
    )
    .map((entry) =>
      codeRef({
        repo: entry.repo,
        file: entry.file,
        lineRange: entry.lineRange,
        snippet: entry.summary,
      }),
    );
  const symbolRefs = graph.symbols
    .filter(
      (entry) => entry.repo === repo && normalizeComparable(`${entry.name} ${entry.file}`).includes(normalizedMarker),
    )
    .map((entry) =>
      codeRef({
        repo: entry.repo,
        file: entry.file,
        lineRange: entry.lineRange,
        symbolName: entry.name,
        snippet: entry.summary,
      }),
    );
  return dedupeCodeRefs([...endpointRefs, ...symbolRefs]);
}

function repoCodeRefs(graph: AnalyzeEvidenceGraph | undefined, repo: string): AnalyzeCodeReference[] {
  if (!graph) {
    return [];
  }
  return dedupeCodeRefs(
    graph.files
      .filter((entry) => entry.repo === repo && entry.kind !== "unknown")
      .slice(0, 4)
      .map((entry) =>
        codeRef({
          repo: entry.repo,
          file: entry.path,
          lineRange: [1, Math.min(entry.lineCount, 1)],
          snippet: `${entry.kind} ${entry.language}`,
        }),
      ),
  );
}

function integrationCodeRefs(
  graph: AnalyzeEvidenceGraph | undefined,
  edge: WorkspaceFusionResult["integrationEdges"][number],
): AnalyzeCodeReference[] {
  if (!graph) {
    return [];
  }
  return dedupeCodeRefs(
    graph.apiEndpoints
      .filter((entry) => entry.repo === edge.from || entry.repo === edge.to)
      .slice(0, 8)
      .map((entry) =>
        codeRef({
          repo: entry.repo,
          file: entry.file,
          lineRange: entry.lineRange,
          snippet: entry.summary,
        }),
      ),
  );
}

function createEvidence(input: {
  runId: string;
  type: AnalyzeEvidenceItem["type"];
  summary: string;
  sourceRefs: string[];
  codeRefs?: AnalyzeCodeReference[];
  clarity: number;
  relatedKnowledgeIds: string[];
}): AnalyzeEvidenceItem {
  return {
    id: createEvidenceId(input.runId, input.type, input.summary),
    runId: input.runId,
    type: input.type,
    summary: input.summary,
    sourceRefs: input.sourceRefs,
    codeRefs: dedupeCodeRefs(input.codeRefs ?? []),
    clarity: clamp(input.clarity),
    relatedKnowledgeIds: input.relatedKnowledgeIds,
    contradictions: [],
  };
}

export function collectAnalyzeEvidenceItems(input: {
  runId: string;
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
  interview: AnalyzeInterviewSummary | null;
  knowledgeItems: AnalyzeKnowledgeItem[];
  evidenceGraph?: AnalyzeEvidenceGraph;
}): AnalyzeEvidenceItem[] {
  const evidence: AnalyzeEvidenceItem[] = [];

  for (const technical of input.technical) {
    if (technical.structure.length > 0) {
      const summary = `${technical.repo.name} structure markers: ${technical.structure.slice(0, 4).join(", ")}`;
      evidence.push(
        createEvidence({
          runId: input.runId,
          type: "code-structure",
          summary,
          sourceRefs: [`repo:${technical.repo.name}`],
          codeRefs: repoCodeRefs(input.evidenceGraph, technical.repo.name),
          clarity: 0.72,
          relatedKnowledgeIds: matchKnowledgeIds(summary, input.knowledgeItems),
        }),
      );
    }

    for (const route of technical.businessSignals.routeEntrypoints.slice(0, 8)) {
      const summary = `${technical.repo.name} route entrypoint ${route}`;
      evidence.push(
        createEvidence({
          runId: input.runId,
          type: "route-entrypoint",
          summary,
          sourceRefs: [`repo:${technical.repo.name}`],
          codeRefs: routeCodeRefs(input.evidenceGraph, technical.repo.name, route),
          clarity: 0.68,
          relatedKnowledgeIds: matchKnowledgeIds(summary, input.knowledgeItems),
        }),
      );
    }

    for (const api of technical.businessSignals.apiEntrypoints.slice(0, 8)) {
      const summary = `${technical.repo.name} api entrypoint ${api}`;
      evidence.push(
        createEvidence({
          runId: input.runId,
          type: "api-entrypoint",
          summary,
          sourceRefs: [`repo:${technical.repo.name}`],
          codeRefs: apiCodeRefs(input.evidenceGraph, technical.repo.name, api),
          clarity: 0.7,
          relatedKnowledgeIds: matchKnowledgeIds(summary, input.knowledgeItems),
        }),
      );
    }

    for (const marker of technical.businessSignals.riskMarkers.slice(0, 6)) {
      const summary = `${technical.repo.name} risk marker ${marker}`;
      evidence.push(
        createEvidence({
          runId: input.runId,
          type: "risk-marker",
          summary,
          sourceRefs: [`repo:${technical.repo.name}`],
          codeRefs: riskCodeRefs(input.evidenceGraph, technical.repo.name, marker),
          clarity: 0.64,
          relatedKnowledgeIds: matchKnowledgeIds(summary, input.knowledgeItems),
        }),
      );
    }
  }

  for (const repo of input.business) {
    for (const term of repo.domainTerms.slice(0, 10)) {
      const summary = `${repo.repoName} domain term ${term}`;
      evidence.push(
        createEvidence({
          runId: input.runId,
          type: "domain-term",
          summary,
          sourceRefs: [`repo:${repo.repoName}`],
          codeRefs: termCodeRefs(input.evidenceGraph, repo.repoName, term),
          clarity: 0.55,
          relatedKnowledgeIds: matchKnowledgeIds(summary, input.knowledgeItems),
        }),
      );
    }

    for (const term of repo.entityTerms.slice(0, 8)) {
      const summary = `${repo.repoName} entity term ${term}`;
      evidence.push(
        createEvidence({
          runId: input.runId,
          type: "entity-term",
          summary,
          sourceRefs: [`repo:${repo.repoName}`],
          codeRefs: termCodeRefs(input.evidenceGraph, repo.repoName, term),
          clarity: 0.58,
          relatedKnowledgeIds: matchKnowledgeIds(summary, input.knowledgeItems),
        }),
      );
    }
  }

  for (const edge of input.fusion.integrationEdges) {
    const summary = `${edge.from} integrates with ${edge.to}${edge.kind ? ` via ${edge.kind}` : ""}`;
    evidence.push(
      createEvidence({
        runId: input.runId,
        type: "integration-signal",
        summary,
        sourceRefs: [`edge:${edge.from}->${edge.to}`],
        codeRefs: integrationCodeRefs(input.evidenceGraph, edge),
        clarity: 0.75,
        relatedKnowledgeIds: matchKnowledgeIds(summary, input.knowledgeItems),
      }),
    );
  }

  if (input.interview) {
    const answerSummary = [
      input.interview.context.businessGoal,
      ...input.interview.context.criticalFlows,
      ...input.interview.context.nonNegotiableConstraints,
      ...input.interview.context.failureHotspots,
      ...input.interview.context.decisionHistory,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    for (const answer of answerSummary.slice(0, 16)) {
      evidence.push(
        createEvidence({
          runId: input.runId,
          type: "interview-answer",
          summary: `Interview evidence: ${answer}`,
          sourceRefs: ["interview:analyze"],
          clarity: 0.82,
          relatedKnowledgeIds: matchKnowledgeIds(answer, input.knowledgeItems),
        }),
      );
    }
  }

  const dedup = new Map<string, AnalyzeEvidenceItem>();
  for (const item of evidence) {
    dedup.set(item.id, item);
  }
  return [...dedup.values()];
}
