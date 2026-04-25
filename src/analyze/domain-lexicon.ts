import type { AnalyzeEvidenceGraph, RepoBusinessAnalysis } from "./types.js";

interface TermAccumulator {
  term: string;
  normalized: string;
  repos: Set<string>;
  sourceKinds: Set<string>;
  examples: Set<string>;
  supportCount: number;
}

export interface AnalyzeDomainLexiconTerm {
  term: string;
  normalized: string;
  supportCount: number;
  repos: string[];
  sourceKinds: string[];
  examples: string[];
  confidence: number;
}

export interface AnalyzeDomainLexicon {
  version: 1;
  runId: string;
  generatedAt: string;
  terms: AnalyzeDomainLexiconTerm[];
}

const STRUCTURAL_STOP_WORDS = new Set([
  "api",
  "app",
  "apps",
  "client",
  "clients",
  "common",
  "component",
  "components",
  "config",
  "constant",
  "constants",
  "controller",
  "controllers",
  "core",
  "data",
  "dto",
  "entity",
  "error",
  "errors",
  "handler",
  "handlers",
  "helper",
  "helpers",
  "index",
  "main",
  "model",
  "models",
  "module",
  "modules",
  "page",
  "pages",
  "request",
  "requests",
  "response",
  "responses",
  "route",
  "routes",
  "schema",
  "schemas",
  "service",
  "services",
  "shared",
  "src",
  "test",
  "tests",
  "type",
  "types",
  "util",
  "utils",
  "view",
  "views",
]);

const IDENTIFIER_SUFFIXES =
  /(Controller|Service|Services|Manager|Facade|Handler|Client|Api|DTO|Dto|VO|Entity|Model|Request|Response|Schema|Repository|Mapper|Provider|Factory|Config|Configuration|Page|View)$/;

function normalizePath(pathValue: string): string {
  return pathValue.replaceAll("\\", "/");
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function hasNonAscii(value: string): boolean {
  return [...value].some((char) => char.charCodeAt(0) > 127);
}

function titleCase(value: string): string {
  if (hasNonAscii(value)) {
    return value;
  }
  return value
    .split(/\s+/g)
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeTerm(raw: string): string {
  return raw
    .replace(IDENTIFIER_SUFFIXES, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, " ")
    .trim()
    .toLowerCase();
}

function splitCandidate(raw: string): string[] {
  const normalized = normalizeTerm(raw);
  if (!normalized) {
    return [];
  }
  const parts = normalized.split(/\s+/g).filter((part) => part.length >= 2 && !STRUCTURAL_STOP_WORDS.has(part));
  if (parts.length === 0) {
    return [];
  }

  const phrase = titleCase(parts.join(" "));
  const singleTerms = parts.filter((part) => part.length >= 3).map(titleCase);
  return unique([phrase, ...singleTerms]).slice(0, 4);
}

function candidatesFromPath(pathValue: string): string[] {
  const normalized = normalizePath(pathValue);
  const segments = normalized
    .split(/[?#]/g)[0]
    .split("/")
    .filter((segment) => segment.length > 0 && !segment.startsWith(":") && !segment.startsWith("{"));
  const tail = segments.slice(-3);
  return unique(tail.flatMap((segment) => splitCandidate(segment.replace(/\.[^.]+$/, ""))));
}

function confidenceFor(accumulator: TermAccumulator): number {
  const value =
    0.36 +
    Math.min(accumulator.supportCount, 8) * 0.055 +
    Math.min(accumulator.repos.size, 4) * 0.07 +
    Math.min(accumulator.sourceKinds.size, 5) * 0.045;
  return Number(Math.max(0.35, Math.min(0.95, value)).toFixed(2));
}

function createAccumulator(term: string, normalized: string): TermAccumulator {
  return {
    term,
    normalized,
    repos: new Set(),
    sourceKinds: new Set(),
    examples: new Set(),
    supportCount: 0,
  };
}

function addTerm(
  terms: Map<string, TermAccumulator>,
  input: { term: string; repo: string; sourceKind: string; example: string },
): void {
  const normalized = normalizeTerm(input.term);
  if (!normalized || STRUCTURAL_STOP_WORDS.has(normalized)) {
    return;
  }
  const display = titleCase(normalized);
  const existing = terms.get(normalized) ?? createAccumulator(display, normalized);
  existing.repos.add(input.repo);
  existing.sourceKinds.add(input.sourceKind);
  existing.examples.add(input.example);
  existing.supportCount += 1;
  terms.set(normalized, existing);
}

export function buildAnalyzeDomainLexicon(input: {
  runId: string;
  graph: AnalyzeEvidenceGraph;
  business: RepoBusinessAnalysis[];
}): AnalyzeDomainLexicon {
  const terms = new Map<string, TermAccumulator>();

  for (const route of input.graph.routes) {
    for (const term of candidatesFromPath(route.route)) {
      addTerm(terms, { term, repo: route.repo, sourceKind: "route", example: `${route.file}:${route.route}` });
    }
  }

  for (const endpoint of input.graph.apiEndpoints) {
    for (const term of candidatesFromPath(endpoint.path)) {
      addTerm(terms, {
        term,
        repo: endpoint.repo,
        sourceKind: "api-endpoint",
        example: `${endpoint.file}:${endpoint.method ?? "HTTP"} ${endpoint.path}`,
      });
    }
  }

  for (const entity of input.graph.dtoEntities) {
    for (const term of splitCandidate(entity.name)) {
      addTerm(terms, { term, repo: entity.repo, sourceKind: entity.kind, example: `${entity.file}:${entity.name}` });
    }
  }

  for (const symbol of input.graph.symbols) {
    for (const term of splitCandidate(symbol.name)) {
      addTerm(terms, { term, repo: symbol.repo, sourceKind: symbol.kind, example: `${symbol.file}:${symbol.name}` });
    }
  }

  for (const repo of input.business) {
    for (const term of [...repo.capabilities, ...repo.domainTerms, ...repo.entityTerms]) {
      addTerm(terms, { term, repo: repo.repoName, sourceKind: "business-signal", example: term });
    }
  }

  const sortedTerms = [...terms.values()]
    .map((entry) => ({
      term: entry.term,
      normalized: entry.normalized,
      supportCount: entry.supportCount,
      repos: [...entry.repos].sort((left, right) => left.localeCompare(right)),
      sourceKinds: [...entry.sourceKinds].sort((left, right) => left.localeCompare(right)),
      examples: [...entry.examples].slice(0, 8),
      confidence: confidenceFor(entry),
    }))
    .filter((entry) => entry.supportCount >= 1)
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        right.supportCount - left.supportCount ||
        left.term.localeCompare(right.term),
    )
    .slice(0, 120);

  return {
    version: 1,
    runId: input.runId,
    generatedAt: input.graph.generatedAt,
    terms: sortedTerms,
  };
}
