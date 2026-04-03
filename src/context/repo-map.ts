import { join } from "node:path";
import type { BbgConfig, StackInfo } from "../config/schema.js";
import type { TestingInfo } from "../analyzers/detect-testing.js";
import type { analyzeRepo } from "../analyzers/index.js";
import { readTextFile } from "../utils/fs.js";

type RepoAnalysisResult = Awaited<ReturnType<typeof analyzeRepo>>;

export interface StoredRepoAnalysis {
  repoName: string;
  generatedAt: string;
  stack: StackInfo;
  structure: string[];
  deps: string[];
  testing: TestingInfo;
}

export type StoredRepoAnalysisRecord = Record<string, StoredRepoAnalysis>;

export interface RepoMapRepoEntry {
  name: string;
  path: string;
  branch: string;
  type: BbgConfig["repos"][number]["type"];
  description: string;
  gitUrl: string;
  stack: StackInfo;
  testing: TestingInfo | null;
  structure: string[];
  deps: string[];
  analysisGeneratedAt: string | null;
}

export interface RepoMapDocument {
  version: number;
  generatedAt: string;
  repos: RepoMapRepoEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isStackInfo(value: unknown): value is StackInfo {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.language) &&
    isString(value.framework) &&
    isString(value.buildTool) &&
    isString(value.testFramework) &&
    isString(value.packageManager)
  );
}

function isTestingInfo(value: unknown): value is TestingInfo {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.framework) && typeof value.hasTestDir === "boolean" && isString(value.testPattern);
}

function isStoredRepoAnalysis(value: unknown): value is StoredRepoAnalysis {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.repoName) &&
    isString(value.generatedAt) &&
    isStackInfo(value.stack) &&
    isStringArray(value.structure) &&
    isStringArray(value.deps) &&
    isTestingInfo(value.testing)
  );
}

function toSortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function createStoredRepoAnalysis(
  repoName: string,
  analysis: RepoAnalysisResult,
  generatedAt: string,
): StoredRepoAnalysis {
  return {
    repoName,
    generatedAt,
    stack: analysis.stack,
    structure: toSortedUnique(analysis.structure),
    deps: toSortedUnique(analysis.deps),
    testing: analysis.testing,
  };
}

export function getStoredRepoAnalysisPath(cwd: string, repoName: string): string {
  return join(cwd, ".bbg", "analysis", "repos", `${repoName}.json`);
}

export function getCanonicalRepoMapPath(cwd: string): string {
  return join(cwd, ".bbg", "context", "repo-map.json");
}

export async function readStoredRepoAnalyses(cwd: string, repoNames: string[]): Promise<StoredRepoAnalysisRecord> {
  const entries = await Promise.all(
    repoNames.map(async (repoName) => {
      const snapshotPath = getStoredRepoAnalysisPath(cwd, repoName);
      let snapshotContent: string;

      try {
        snapshotContent = await readTextFile(snapshotPath);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
          return undefined;
        }

        throw error;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(snapshotContent) as unknown;
      } catch (error) {
        if (error instanceof SyntaxError) {
          return undefined;
        }

        throw error;
      }

      if (!isStoredRepoAnalysis(parsed)) {
        return undefined;
      }

      return [repoName, parsed] as const;
    }),
  );

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, StoredRepoAnalysis] => entry !== undefined));
}

export function buildRepoMapDocument(
  config: BbgConfig,
  analyses: StoredRepoAnalysisRecord,
  generatedAt: string,
): RepoMapDocument {
  return {
    version: 1,
    generatedAt,
    repos: config.repos.map((repo) => {
      const analysis = analyses[repo.name];
      return {
        name: repo.name,
        path: repo.name,
        branch: repo.branch,
        type: repo.type,
        description: repo.description,
        gitUrl: repo.gitUrl,
        stack: analysis?.stack ?? repo.stack,
        testing: analysis?.testing ?? null,
        structure: analysis?.structure ?? [],
        deps: analysis?.deps ?? [],
        analysisGeneratedAt: analysis?.generatedAt ?? null,
      };
    }),
  };
}
