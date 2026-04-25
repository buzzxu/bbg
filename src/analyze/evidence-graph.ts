import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import type {
  AnalyzeEvidenceGraph,
  AnalyzeEvidenceGraphApiEndpointNode,
  AnalyzeEvidenceGraphDtoEntityNode,
  AnalyzeEvidenceGraphFileNode,
  AnalyzeEvidenceGraphRouteNode,
  AnalyzeEvidenceGraphSymbolNode,
  AnalyzeEvidenceGraphTestNode,
  RepoTechnicalAnalysis,
} from "./types.js";
import { exists, writeTextFile } from "../utils/fs.js";

const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".vue", ".java", ".http"]);
const SKIP_DIRS = new Set([".git", ".bbg", "node_modules", "dist", "build", "coverage", "target", "out", "vendor"]);
const MAX_FILES_PER_REPO = 650;
const MAX_FILE_BYTES = 192_000;
const SIGNAL_STOP_WORDS = new Set([
  "api",
  "app",
  "client",
  "common",
  "component",
  "config",
  "controller",
  "core",
  "dto",
  "entity",
  "handler",
  "index",
  "main",
  "model",
  "module",
  "page",
  "request",
  "response",
  "route",
  "schema",
  "service",
  "shared",
  "src",
  "test",
  "type",
  "util",
  "view",
]);

function normalizePath(pathValue: string): string {
  return pathValue.replaceAll("\\", "/");
}

function idFor(parts: string[]): string {
  return parts
    .join(":")
    .toLowerCase()
    .replace(/[^a-z0-9:/._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
}

function languageForPath(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".java") {
    return "java";
  }
  if (ext === ".vue") {
    return "vue";
  }
  if (ext === ".http") {
    return "http";
  }
  if (ext === ".ts" || ext === ".tsx") {
    return "typescript";
  }
  if (ext === ".js" || ext === ".jsx") {
    return "javascript";
  }
  return "unknown";
}

function fileKind(filePath: string): AnalyzeEvidenceGraphFileNode["kind"] {
  const normalized = normalizePath(filePath).toLowerCase();
  if (normalized.endsWith(".http")) {
    return "http";
  }
  if (/(^|\/)(__tests__|tests?|spec)\//.test(normalized) || /\.(test|spec)\.[tj]sx?$/.test(normalized)) {
    return "test";
  }
  if (/(^|\/)(package.json|pom.xml|build.gradle|go.mod|cargo.toml|requirements.txt)$/.test(normalized)) {
    return "config";
  }
  return "source";
}

async function collectFiles(repoPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dirPath: string, depth: number): Promise<void> {
    if (files.length >= MAX_FILES_PER_REPO || depth > 8) {
      return;
    }
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= MAX_FILES_PER_REPO) {
        return;
      }
      const absolutePath = resolve(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(absolutePath, depth + 1);
        }
        continue;
      }
      if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        files.push(absolutePath);
      }
    }
  }

  if (await exists(repoPath)) {
    await walk(repoPath, 0);
  }
  return files;
}

function lineRangeForMatch(content: string, index: number, length: number): [number, number] {
  const before = content.slice(0, index);
  const start = before.split("\n").length;
  const matched = content.slice(index, index + length);
  const end = start + Math.max(0, matched.split("\n").length - 1);
  return [start, end];
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function hasNonAscii(value: string): boolean {
  return [...value].some((char) => char.charCodeAt(0) > 127);
}

function humanizeTerm(term: string): string {
  if (hasNonAscii(term)) {
    return term;
  }
  return term
    .split(/[\s_-]+/g)
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function signalTerms(raw: string): string[] {
  return unique(
    raw
      .replace(
        /(Controller|Service|Manager|Facade|Handler|Client|Api|DTO|Dto|VO|Entity|Model|Request|Response|Schema|Repository|Mapper|Provider|Factory|Config|Configuration|Page|View)$/g,
        "",
      )
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .split(/[^a-zA-Z0-9\u4e00-\u9fff]+/g)
      .map((part) => part.toLowerCase().trim())
      .filter((part) => part.length >= 3 && !SIGNAL_STOP_WORDS.has(part)),
  );
}

function pathSignalTerms(pathValue: string): string[] {
  return unique(normalizePath(pathValue).split(/[?#]/g)[0].split("/").slice(-4).flatMap(signalTerms));
}

function extractSymbols(repo: string, file: string, content: string): AnalyzeEvidenceGraphSymbolNode[] {
  const nodes: AnalyzeEvidenceGraphSymbolNode[] = [];
  const classLike = /\b(class|interface|enum)\s+([A-Z][A-Za-z0-9_]*)/g;
  for (const match of content.matchAll(classLike)) {
    const kind = match[1] as "class" | "interface" | "enum";
    const name = match[2];
    const lineRange = lineRangeForMatch(content, match.index ?? 0, match[0].length);
    nodes.push({
      id: idFor(["symbol", repo, file, name, String(lineRange[0])]),
      repo,
      file,
      name,
      kind,
      lineRange,
      summary: `${kind} ${name}`,
    });
  }

  const functionLike =
    /\b(?:function\s+([A-Za-z_$][A-Za-z0-9_$]*)|(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\()/g;
  for (const match of content.matchAll(functionLike)) {
    const name = match[1] ?? match[2];
    const lineRange = lineRangeForMatch(content, match.index ?? 0, match[0].length);
    nodes.push({
      id: idFor(["symbol", repo, file, name, String(lineRange[0])]),
      repo,
      file,
      name,
      kind: "function",
      lineRange,
      summary: `function ${name}`,
    });
  }

  return nodes;
}

function extractRoutes(repo: string, file: string, content: string): AnalyzeEvidenceGraphRouteNode[] {
  const nodes: AnalyzeEvidenceGraphRouteNode[] = [];
  const normalizedFile = normalizePath(file);
  const pageMatch = normalizedFile.match(/(?:^|\/)(pages|views)\/(.+?)(?:\/(?:index|main))?\.(?:[tj]sx?|vue)$/);
  if (pageMatch?.[2]) {
    nodes.push({
      id: idFor(["route", repo, file, pageMatch[2]]),
      repo,
      file,
      route: pageMatch[2],
      kind: "page",
      lineRange: [1, 1],
      summary: `page route ${pageMatch[2]}`,
    });
  }

  for (const match of content.matchAll(/\bpath\s*:\s*['"`]([^'"`]+)['"`]/g)) {
    const route = match[1];
    const lineRange = lineRangeForMatch(content, match.index ?? 0, match[0].length);
    nodes.push({
      id: idFor(["route", repo, file, route, String(lineRange[0])]),
      repo,
      file,
      route,
      kind: "route-config",
      lineRange,
      summary: `configured route ${route}`,
    });
  }

  for (const match of content.matchAll(/pages\s*:\s*\[([\s\S]*?)\]/g)) {
    for (const page of match[1].matchAll(/['"`]([^'"`]+)['"`]/g)) {
      const route = page[1];
      const lineRange = lineRangeForMatch(content, (match.index ?? 0) + (page.index ?? 0), page[0].length);
      nodes.push({
        id: idFor(["route", repo, file, route, String(lineRange[0])]),
        repo,
        file,
        route,
        kind: "route-config",
        lineRange,
        summary: `configured page ${route}`,
      });
    }
  }

  return nodes;
}

function methodFromAnnotation(annotation: string): string | null {
  const normalized = annotation.toLowerCase();
  if (normalized.includes("get")) return "GET";
  if (normalized.includes("post")) return "POST";
  if (normalized.includes("put")) return "PUT";
  if (normalized.includes("delete")) return "DELETE";
  if (normalized.includes("patch")) return "PATCH";
  return null;
}

function extractApiEndpoints(repo: string, file: string, content: string): AnalyzeEvidenceGraphApiEndpointNode[] {
  const nodes: AnalyzeEvidenceGraphApiEndpointNode[] = [];
  for (const match of content.matchAll(/@((?:Get|Post|Put|Delete|Patch)?RequestMapping)\s*\(([\s\S]*?)\)/g)) {
    for (const pathMatch of match[2].matchAll(/["'](\/[^"']+)["']/g)) {
      const lineRange = lineRangeForMatch(content, match.index ?? 0, match[0].length);
      nodes.push({
        id: idFor(["api", repo, file, pathMatch[1], String(lineRange[0])]),
        repo,
        file,
        method: methodFromAnnotation(match[1]),
        path: pathMatch[1],
        lineRange,
        summary: `${methodFromAnnotation(match[1]) ?? "HTTP"} ${pathMatch[1]}`,
      });
    }
  }

  const clientPatterns = [
    /\burl\s*:\s*['"`]([^'"`]+)['"`]/g,
    /\b(?:fetch|request|get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
  ];
  for (const pattern of clientPatterns) {
    for (const match of content.matchAll(pattern)) {
      const path = match[1];
      if (!path.includes("/") || path.startsWith("/pages/")) {
        continue;
      }
      const lineRange = lineRangeForMatch(content, match.index ?? 0, match[0].length);
      nodes.push({
        id: idFor(["api", repo, file, path, String(lineRange[0])]),
        repo,
        file,
        method: null,
        path,
        lineRange,
        summary: `client API ${path}`,
      });
    }
  }

  for (const match of content.matchAll(/\b(GET|POST|PUT|DELETE|PATCH)\s+(?:\{\{[^}]+\}\})?([^\s]+)/g)) {
    const path = match[2];
    if (!path.includes("/")) {
      continue;
    }
    const lineRange = lineRangeForMatch(content, match.index ?? 0, match[0].length);
    nodes.push({
      id: idFor(["api", repo, file, path, String(lineRange[0])]),
      repo,
      file,
      method: match[1],
      path,
      lineRange,
      summary: `${match[1]} ${path}`,
    });
  }

  return nodes;
}

function dtoKind(name: string): AnalyzeEvidenceGraphDtoEntityNode["kind"] | null {
  if (/dto$/i.test(name)) return "dto";
  if (/entity$/i.test(name)) return "entity";
  if (/model$/i.test(name)) return "model";
  if (/request$/i.test(name)) return "request";
  if (/response$/i.test(name)) return "response";
  if (/schema$/i.test(name)) return "schema";
  return null;
}

function extractDtoEntities(repo: string, file: string, content: string): AnalyzeEvidenceGraphDtoEntityNode[] {
  const nodes: AnalyzeEvidenceGraphDtoEntityNode[] = [];
  for (const match of content.matchAll(/\b(class|interface|type|record)\s+([A-Z][A-Za-z0-9_]*)/g)) {
    const name = match[2];
    const kind = dtoKind(name);
    if (!kind) {
      continue;
    }
    const lineRange = lineRangeForMatch(content, match.index ?? 0, match[0].length);
    nodes.push({
      id: idFor(["dto", repo, file, name, String(lineRange[0])]),
      repo,
      file,
      name,
      kind,
      lineRange,
      summary: `${kind} ${name}`,
    });
  }
  return nodes;
}

function extractTests(repo: string, file: string, content: string, framework: string): AnalyzeEvidenceGraphTestNode[] {
  if (fileKind(file) !== "test") {
    return [];
  }
  return [
    {
      id: idFor(["test", repo, file]),
      repo,
      file,
      framework,
      lineRange: [1, Math.max(1, content.split("\n").length)],
      summary: `${framework || "test"} coverage in ${file}`,
    },
  ];
}

export async function buildAnalyzeEvidenceGraph(input: {
  cwd: string;
  runId: string;
  technical: RepoTechnicalAnalysis[];
}): Promise<AnalyzeEvidenceGraph> {
  const generatedAt = new Date().toISOString();
  const files: AnalyzeEvidenceGraphFileNode[] = [];
  const symbols: AnalyzeEvidenceGraphSymbolNode[] = [];
  const routes: AnalyzeEvidenceGraphRouteNode[] = [];
  const apiEndpoints: AnalyzeEvidenceGraphApiEndpointNode[] = [];
  const dtoEntities: AnalyzeEvidenceGraphDtoEntityNode[] = [];
  const tests: AnalyzeEvidenceGraphTestNode[] = [];

  for (const repo of input.technical) {
    const repoPath = join(input.cwd, repo.repo.name);
    const candidateFiles = await collectFiles(repoPath);
    for (const absolutePath of candidateFiles) {
      const content = await readFile(absolutePath, "utf8");
      if (content.length > MAX_FILE_BYTES) {
        continue;
      }
      const file = normalizePath(relative(repoPath, absolutePath));
      const lineCount = Math.max(1, content.split("\n").length);
      files.push({
        id: idFor(["file", repo.repo.name, file]),
        repo: repo.repo.name,
        path: file,
        language: languageForPath(file),
        kind: fileKind(file),
        lineCount,
      });
      symbols.push(...extractSymbols(repo.repo.name, file, content));
      routes.push(...extractRoutes(repo.repo.name, file, content));
      apiEndpoints.push(...extractApiEndpoints(repo.repo.name, file, content));
      dtoEntities.push(...extractDtoEntities(repo.repo.name, file, content));
      tests.push(...extractTests(repo.repo.name, file, content, repo.testing.framework));
    }
  }

  return {
    version: 1,
    runId: input.runId,
    generatedAt,
    repos: input.technical.map((repo) => repo.repo.name),
    files,
    symbols,
    routes,
    apiEndpoints,
    dtoEntities,
    tests,
  };
}

export function enrichTechnicalAnalysisWithEvidenceGraph(input: {
  technical: RepoTechnicalAnalysis[];
  graph: AnalyzeEvidenceGraph;
}): RepoTechnicalAnalysis[] {
  return input.technical.map((repoAnalysis) => {
    const repoName = repoAnalysis.repo.name;
    const repoRoutes = input.graph.routes.filter((entry) => entry.repo === repoName);
    const repoApis = input.graph.apiEndpoints.filter((entry) => entry.repo === repoName);
    const repoEntities = input.graph.dtoEntities.filter((entry) => entry.repo === repoName);
    const repoSymbols = input.graph.symbols.filter((entry) => entry.repo === repoName);
    const graphDomainTerms = unique([
      ...repoRoutes.flatMap((entry) => pathSignalTerms(entry.route)),
      ...repoApis.flatMap((entry) => pathSignalTerms(entry.path)),
      ...repoEntities.flatMap((entry) => signalTerms(entry.name)),
      ...repoSymbols.flatMap((entry) => signalTerms(entry.name)),
    ]).slice(0, 24);
    const graphEntityTerms = unique(repoEntities.flatMap((entry) => signalTerms(entry.name))).slice(0, 16);
    const graphCapabilities = graphDomainTerms.map(humanizeTerm);
    const graphWorkflowHints = unique([
      ...repoRoutes.slice(0, 8).map((entry) => `Entrypoint ${entry.route} indicates a user or operator workflow.`),
      ...repoApis
        .slice(0, 8)
        .map((entry) => `API ${entry.method ?? "HTTP"} ${entry.path} indicates a service boundary.`),
    ]);

    return {
      ...repoAnalysis,
      businessSignals: {
        routeEntrypoints: unique([
          ...repoAnalysis.businessSignals.routeEntrypoints,
          ...repoRoutes.map((entry) => `${entry.kind}:${entry.route}`),
        ]).slice(0, 16),
        apiEntrypoints: unique([
          ...repoAnalysis.businessSignals.apiEntrypoints,
          ...repoApis.map((entry) => entry.path),
        ]).slice(0, 20),
        domainTerms: unique([...repoAnalysis.businessSignals.domainTerms, ...graphDomainTerms]).slice(0, 24),
        entityTerms: unique([...repoAnalysis.businessSignals.entityTerms, ...graphEntityTerms]).slice(0, 20),
        capabilityTerms: unique([...repoAnalysis.businessSignals.capabilityTerms, ...graphCapabilities]).slice(0, 16),
        workflowHints: unique([...repoAnalysis.businessSignals.workflowHints, ...graphWorkflowHints]).slice(0, 14),
        externalIntegrations: repoAnalysis.businessSignals.externalIntegrations,
        riskMarkers: repoAnalysis.businessSignals.riskMarkers,
      },
    };
  });
}

export async function writeAnalyzeEvidenceGraphArtifacts(input: {
  cwd: string;
  graph: AnalyzeEvidenceGraph;
}): Promise<string[]> {
  const basePath = ".bbg/analyze/evidence";
  const artifacts: Array<[string, unknown]> = [
    [`${basePath}/files.json`, { version: 1, runId: input.graph.runId, files: input.graph.files }],
    [`${basePath}/symbols.json`, { version: 1, runId: input.graph.runId, symbols: input.graph.symbols }],
    [`${basePath}/routes.json`, { version: 1, runId: input.graph.runId, routes: input.graph.routes }],
    [
      `${basePath}/api-endpoints.json`,
      { version: 1, runId: input.graph.runId, apiEndpoints: input.graph.apiEndpoints },
    ],
    [`${basePath}/dto-entities.json`, { version: 1, runId: input.graph.runId, dtoEntities: input.graph.dtoEntities }],
    [`${basePath}/tests.json`, { version: 1, runId: input.graph.runId, tests: input.graph.tests }],
    [`${basePath}/evidence-graph.json`, input.graph],
  ];
  for (const [pathValue, payload] of artifacts) {
    await writeTextFile(join(input.cwd, pathValue), `${JSON.stringify(payload, null, 2)}\n`);
  }
  return artifacts.map(([pathValue]) => pathValue);
}
