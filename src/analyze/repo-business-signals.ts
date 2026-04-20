import { readdir, readFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import type { RepoBusinessSignals } from "./types.js";
import { exists } from "../utils/fs.js";

const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".vue", ".java", ".http"]);
const SKIP_DIRS = new Set([
  ".git",
  ".bbg",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "target",
  "out",
  "vendor",
  "docs",
]);
const MAX_FILES = 400;
const MAX_FILE_BYTES = 128_000;
const DOMAIN_STOP_WORDS = new Set([
  "src",
  "main",
  "java",
  "com",
  "index",
  "list",
  "detail",
  "details",
  "page",
  "pages",
  "view",
  "views",
  "components",
  "component",
  "modules",
  "module",
  "service",
  "services",
  "controller",
  "controllers",
  "router",
  "routes",
  "route",
  "api",
  "request",
  "requests",
  "response",
  "responses",
  "common",
  "utils",
  "shared",
  "types",
  "type",
  "mgr",
  "shop",
  "app",
  "config",
  "configure",
  "handler",
  "handlers",
  "executor",
  "job",
  "jobs",
  "poster",
  "project",
  "admin",
  "web",
  "h5",
  "frontend",
  "backend",
  "babel",
  "axios",
  "eslint",
  "dev",
  "prod",
  "flat",
  "instance",
  "packages",
  "options",
  "constant",
  "constants",
  "copy",
  "test",
  "tests",
]);
const TERM_ALIASES: Record<string, string> = {
  activities: "activity",
  campaigns: "campaign",
  templates: "template",
  posters: "poster",
  permissions: "permission",
  menus: "menu",
  products: "product",
  stores: "store",
  shops: "store",
  orders: "order",
  carts: "cart",
  payments: "payment",
  shares: "share",
  logistics: "logistics",
  aftersales: "aftersale",
  presales: "presale",
  users: "user",
  auths: "auth",
  materials: "material",
  advertising: "advertising",
  promotions: "promotion",
  regions: "region",
  settings: "settings",
};
const TECHNICAL_SIGNAL_BLACKLIST = [
  "babel",
  "axios",
  "eslint",
  "dev",
  "prod",
  "instance",
  "packages",
  "options",
  "constant",
  "constants",
  "flat",
  "copy",
];
const OPERATION_PREFIX_PATTERNS = [
  /^(get|fetch|query|list|save|update|delete|submit|cancel|create|export|import|upload|download)\b[\s:-]*/i,
  /^(获取|查询|列表|保存|更新|删除|提交|取消|创建|导出|导入|上传|下载|查看|编辑|获取|同步|处理|配置)/,
];
const OPERATION_SUFFIX_PATTERNS = [
  /\b(list|detail|details|management|manage|config|configuration|selection|options?)$/i,
  /(列表|详情|管理|配置|选项|下拉|分析|统计|页面|流程|功能)$/,
];
const EXTERNAL_INTEGRATION_KEYWORDS = [
  "weixin",
  "wx",
  "wechat",
  "feishu",
  "oss",
  "obs",
  "s3",
  "webhook",
  "redis",
  "mysql",
  "postgres",
  "pay",
  "payment",
  "sdk",
  "upload",
];
const RISK_KEYWORDS = [
  "auth",
  "permission",
  "menu",
  "payment",
  "order",
  "share",
  "template",
  "poster",
  "activity",
  "campaign",
  "upload",
  "store",
];

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function normalizeTerm(raw: string): string {
  const normalized = raw.toLowerCase().replace(/[^a-z0-9-]+/g, "");
  return TERM_ALIASES[normalized] ?? normalized;
}

function tokenizePathSegment(segment: string): string[] {
  return segment
    .replace(/\.[^.]+$/, "")
    .split(/[^a-zA-Z0-9]+/g)
    .map((part) => normalizeTerm(part))
    .filter((part) => part.length >= 3 && !DOMAIN_STOP_WORDS.has(part));
}

function humanizeTerm(term: string): string {
  if (/[^\x00-\x7F]/.test(term)) {
    return term;
  }
  return term
    .split(/[-_]/g)
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function capabilityLabel(term: string, repoType: string): string {
  void repoType;
  return humanizeTerm(term);
}

function workflowLabel(term: string, repoType: string): string {
  const label = capabilityLabel(term, repoType);
  if (repoType === "frontend-web") {
    return `运营在后台围绕 ${label} 进行配置、审核或查询。`;
  }
  if (repoType === "frontend-h5" || repoType === "frontend") {
    return `用户在前端围绕 ${label} 发起浏览、选择或提交操作。`;
  }
  return `服务围绕 ${label} 提供接口、校验和持久化能力。`;
}

function normalizePhrase(raw: string): string | null {
  let value = raw
    .replace(/^(view|page|route|api):/i, "")
    .replace(/^[/#*\s-]+/, "")
    .replace(/\.[^.]+$/, "")
    .replace(/\$\{[^}]+\}/g, "")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[_/]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  for (const pattern of OPERATION_PREFIX_PATTERNS) {
    value = value.replace(pattern, "").trim();
  }
  for (const pattern of OPERATION_SUFFIX_PATTERNS) {
    value = value.replace(pattern, "").trim();
  }
  value = value.replace(/\s+/g, " ").trim();
  if (value.length < 2) {
    return null;
  }
  const lowered = value.toLowerCase();
  if (DOMAIN_STOP_WORDS.has(lowered)) {
    return null;
  }
  if (TECHNICAL_SIGNAL_BLACKLIST.some((term) => lowered === term || lowered.includes(`${term} `) || lowered.includes(` ${term}`))) {
    return null;
  }
  return /[^\x00-\x7F]/.test(value) ? value : humanizeTerm(normalizeTerm(value.replace(/\s+/g, "-")));
}

function extractCommentPhrases(content: string): string[] {
  const results: string[] = [];
  for (const match of content.matchAll(/\/\*\*?([\s\S]*?)\*\//g)) {
    for (const line of match[1].split("\n")) {
      const normalized = normalizePhrase(line.replace(/^\s*\*+\s?/, ""));
      if (normalized) {
        results.push(normalized);
      }
    }
  }
  for (const match of content.matchAll(/^\s*\/\/+\s*(.+)$/gm)) {
    const normalized = normalizePhrase(match[1]);
    if (normalized) {
      results.push(normalized);
    }
  }
  for (const match of content.matchAll(/^\s*###\s+(.+)$/gm)) {
    const normalized = normalizePhrase(match[1]);
    if (normalized) {
      results.push(normalized);
    }
  }
  return unique(results).slice(0, 12);
}

function extractPathPhrases(relPath: string, routeEntrypoints: string[], apiEntrypoints: string[]): string[] {
  const values = [relPath, ...routeEntrypoints, ...apiEntrypoints];
  const phrases: string[] = [];
  for (const value of values) {
    const normalized = value.replaceAll(sep, "/");
    const segments = normalized.split(/[\\/]/g).slice(-3);
    for (const segment of segments) {
      const phrase = normalizePhrase(segment);
      if (phrase) {
        phrases.push(phrase);
      }
      const chineseMatches = segment.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
      for (const chinese of chineseMatches) {
        const normalizedChinese = normalizePhrase(chinese);
        if (normalizedChinese) {
          phrases.push(normalizedChinese);
        }
      }
    }
  }
  return unique(phrases).slice(0, 12);
}

async function collectCandidateFiles(repoPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dirPath: string, depth: number): Promise<void> {
    if (files.length >= MAX_FILES || depth > 6) {
      return;
    }

    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= MAX_FILES) {
        return;
      }
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        await walk(resolve(dirPath, entry.name), depth + 1);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const extension = entry.name.slice(entry.name.lastIndexOf("."));
      if (!FILE_EXTENSIONS.has(extension)) {
        continue;
      }
      files.push(resolve(dirPath, entry.name));
    }
  }

  await walk(repoPath, 0);
  return files;
}

function extractRouteEntrypoints(relPath: string, content: string): string[] {
  const results: string[] = [];
  const normalizedPath = relPath.replaceAll(sep, "/");

  const routeDirMatch = normalizedPath.match(/(?:pages|views)\/([^/]+(?:\/[^/]+)?)(?:\/(?:index|main|detail|list))?\.(?:jsx?|tsx?|vue)$/);
  if (routeDirMatch?.[1]) {
    results.push(`view:${routeDirMatch[1]}`);
  }

  for (const match of content.matchAll(/pages\s*:\s*\[([\s\S]*?)\]/g)) {
    for (const page of match[1].matchAll(/['"`]([^'"`]+)['"`]/g)) {
      results.push(`page:${page[1]}`);
    }
  }

  for (const match of content.matchAll(/path\s*:\s*['"`]([^'"`]+)['"`]/g)) {
    results.push(`route:${match[1]}`);
  }

  return unique(results).slice(0, 8);
}

function extractApiEntrypoints(relPath: string, content: string): string[] {
  const results: string[] = [];
  const normalizedPath = relPath.replaceAll(sep, "/").toLowerCase();
  const apiLikeFile = /(?:^|\/)(api|service|request|controller|http-clients)\b/.test(normalizedPath)
    || normalizedPath.endsWith(".http")
    || normalizedPath.endsWith("/api.js")
    || normalizedPath.endsWith("/api.ts");

  for (const match of content.matchAll(/@(?:Get|Post|Put|Delete|Patch)?Request?Mapping\s*\(([\s\S]*?)\)/g)) {
    const args = match[1];
    for (const pathMatch of args.matchAll(/["'](\/[^"']+)["']/g)) {
      results.push(pathMatch[1]);
    }
  }

  if (apiLikeFile) {
    for (const match of content.matchAll(/url\s*:\s*['"`]([^'"`]+)['"`]/g)) {
      results.push(match[1]);
    }

    for (const match of content.matchAll(/(?:fetch|request|get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g)) {
      results.push(match[1]);
    }
  }

  for (const match of content.matchAll(/(?:GET|POST|PUT|DELETE|PATCH)\s+\{\{[^}]+\}\}([^\s]+)/g)) {
    results.push(match[1]);
  }

  return unique(results)
    .filter((value) => (value.startsWith("/") || value.includes("/")) && !value.startsWith("/pages/"))
    .slice(0, 12);
}

function extractClassLikeTerms(content: string): { domainTerms: string[]; entityTerms: string[] } {
  const domainTerms: string[] = [];
  const entityTerms: string[] = [];

  for (const match of content.matchAll(/\b(class|interface|enum)\s+([A-Z][A-Za-z0-9]+)/g)) {
    const name = match[2];
    const normalized = name
      .replace(/(Controller|Service|Biz|Handler|Manager|Facade|Client|Api|DTO|VO|Entity|Model|Request|Response)$/i, "")
      .split(/(?=[A-Z])/)
      .map((part) => normalizeTerm(part))
      .filter((part) => part.length >= 3 && !DOMAIN_STOP_WORDS.has(part));
    domainTerms.push(...normalized);
    if (/(DTO|VO|Entity|Model|Request|Response)$/i.test(name)) {
      entityTerms.push(...normalized);
    }
  }

  return {
    domainTerms: unique(domainTerms),
    entityTerms: unique(entityTerms),
  };
}

function extractCapabilityTerms(
  relPath: string,
  content: string,
  routeEntrypoints: string[],
  apiEntrypoints: string[],
  repoType: string,
): string[] {
  const normalizedPath = relPath.replaceAll(sep, "/");
  const terms = [
    ...normalizedPath.split(/[\\/]/g).flatMap(tokenizePathSegment),
    ...routeEntrypoints.flatMap(tokenizePathSegment),
    ...apiEntrypoints.flatMap(tokenizePathSegment),
  ];
  const { domainTerms, entityTerms } = extractClassLikeTerms(content);
  const commentPhrases = extractCommentPhrases(content);
  const pathPhrases = extractPathPhrases(normalizedPath, routeEntrypoints, apiEntrypoints);
  terms.push(...domainTerms, ...entityTerms, ...commentPhrases, ...pathPhrases);

  const rankedTerms = unique(terms)
    .filter((term) => !DOMAIN_STOP_WORDS.has(term) && !TECHNICAL_SIGNAL_BLACKLIST.includes(term))
    .sort((left, right) => left.localeCompare(right));

  return unique([
    ...commentPhrases,
    ...pathPhrases,
    ...rankedTerms.map((term) => capabilityLabel(term, repoType)),
  ]).slice(0, 12);
}

function extractExternalIntegrations(apiEntrypoints: string[], deps: string[], content: string): string[] {
  const haystacks = [...apiEntrypoints, ...deps, content.toLowerCase()];
  const matches = EXTERNAL_INTEGRATION_KEYWORDS.filter((keyword) =>
    haystacks.some((value) => value.toLowerCase().includes(keyword)),
  );
  return unique(matches).slice(0, 8);
}

function extractRiskMarkers(
  capabilityTerms: string[],
  entityTerms: string[],
  routeEntrypoints: string[],
  apiEntrypoints: string[],
): string[] {
  const haystack = [...capabilityTerms, ...entityTerms, ...routeEntrypoints, ...apiEntrypoints]
    .join(" ")
    .toLowerCase();
  return RISK_KEYWORDS.filter((keyword) => haystack.includes(keyword));
}

export async function extractRepoBusinessSignals(repoPath: string, repoType: string, deps: string[]): Promise<RepoBusinessSignals> {
  const candidateFiles = await collectCandidateFiles(repoPath);
  const routeEntrypoints: string[] = [];
  const apiEntrypoints: string[] = [];
  const domainTerms: string[] = [];
  const entityTerms: string[] = [];
  const capabilityTerms: string[] = [];

  for (const filePath of candidateFiles) {
    const content = await readFile(filePath, "utf8");
    if (content.length > MAX_FILE_BYTES) {
      continue;
    }

    const relPath = relative(repoPath, filePath);
    const extractedRoutes = extractRouteEntrypoints(relPath, content);
    const extractedApis = extractApiEntrypoints(relPath, content);
    const extractedTerms = extractClassLikeTerms(content);
    const extractedCapabilities = extractCapabilityTerms(relPath, content, extractedRoutes, extractedApis, repoType);

    routeEntrypoints.push(...extractedRoutes);
    apiEntrypoints.push(...extractedApis);
    domainTerms.push(...extractedTerms.domainTerms);
    entityTerms.push(...extractedTerms.entityTerms);
    capabilityTerms.push(...extractedCapabilities);
  }

  const uniqueCapabilities = unique(capabilityTerms).slice(0, 8);
  const workflowHints = unique(uniqueCapabilities.map((term) => workflowLabel(term, repoType))).slice(0, 6);
  const externalIntegrations = extractExternalIntegrations(apiEntrypoints, deps, uniqueCapabilities.join(" "));
  const riskMarkers = extractRiskMarkers(uniqueCapabilities, entityTerms, routeEntrypoints, apiEntrypoints);

  return {
    routeEntrypoints: unique(routeEntrypoints).slice(0, 12),
    apiEntrypoints: unique(apiEntrypoints).slice(0, 12),
    domainTerms: unique(domainTerms).slice(0, 12),
    entityTerms: unique(entityTerms).slice(0, 12),
    capabilityTerms: uniqueCapabilities.map((term) => capabilityLabel(term, repoType)),
    workflowHints,
    externalIntegrations,
    riskMarkers,
  };
}

export async function extractRepoBusinessSignalsIfPresent(repoPath: string, repoType: string, deps: string[]): Promise<RepoBusinessSignals> {
  if (!(await exists(repoPath))) {
    return {
      routeEntrypoints: [],
      apiEntrypoints: [],
      domainTerms: [],
      entityTerms: [],
      capabilityTerms: [],
      workflowHints: [],
      externalIntegrations: [],
      riskMarkers: [],
    };
  }

  return extractRepoBusinessSignals(repoPath, repoType, deps);
}
