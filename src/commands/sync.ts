import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { execa } from "execa";
import { analyzeRepo } from "../analyzers/index.js";
import { parseConfig, serializeConfig } from "../config/read-write.js";
import type { RepoEntry, StackInfo } from "../config/schema.js";
import {
  buildRepoMapDocument,
  createStoredRepoAnalysis,
  getCanonicalRepoMapPath,
  getStoredRepoAnalysisPath,
  readStoredRepoAnalyses,
} from "../context/repo-map.js";
import { buildTaskBundlesDocument } from "../context/task-bundles.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import { writeJsonStore } from "../runtime/store.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";

export interface RunSyncInput {
  cwd: string;
  json?: boolean;
  update?: boolean;
}

export interface RepoStatus {
  repoName: string;
  dirExists: boolean;
  configuredBranch: string;
  currentBranch: string | null;
  currentBranchError?: string;
  branchMatchesConfig: boolean;
  ahead: number;
  behind: number;
  fetchError?: string;
}

export interface StackDriftEntry {
  repoName: string;
  kind: "stack";
  expected: StackInfo;
  actual: StackInfo;
}

export interface RunSyncResult {
  repoStatuses: RepoStatus[];
  orphanRepos: string[];
  drift: StackDriftEntry[];
}

function sameStack(a: StackInfo, b: StackInfo): boolean {
  return (
    a.language === b.language &&
    a.framework === b.framework &&
    a.buildTool === b.buildTool &&
    a.testFramework === b.testFramework &&
    a.packageManager === b.packageManager &&
    (a.languageVersion ?? "") === (b.languageVersion ?? "") &&
    (a.frameworkVersion ?? "") === (b.frameworkVersion ?? "")
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return String(error);
}

async function getCurrentBranch(repoDir: string): Promise<{ branch: string | null; error?: string }> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoDir });
    return { branch: stdout.trim() };
  } catch (error: unknown) {
    return { branch: null, error: toErrorMessage(error) };
  }
}

async function fetchAndAheadBehind(
  repoDir: string,
  configuredBranch: string,
): Promise<{ ahead: number; behind: number; fetchError?: string }> {
  try {
    await execa("git", ["fetch", "--all", "--prune"], { cwd: repoDir });
    const { stdout } = await execa("git", ["rev-list", "--left-right", "--count", `origin/${configuredBranch}...HEAD`], {
      cwd: repoDir,
    });
    const [behindRaw, aheadRaw] = stdout.trim().split(/\s+/);
    const behind = Number.parseInt(behindRaw ?? "0", 10);
    const ahead = Number.parseInt(aheadRaw ?? "0", 10);
    return {
      ahead: Number.isFinite(ahead) ? ahead : 0,
      behind: Number.isFinite(behind) ? behind : 0,
    };
  } catch (error: unknown) {
    return { ahead: 0, behind: 0, fetchError: toErrorMessage(error) };
  }
}

async function detectOrphanRepos(cwd: string, repos: RepoEntry[]): Promise<string[]> {
  const registered = new Set(repos.map((repo) => repo.name));
  const entries = await readdir(cwd, { withFileTypes: true });
  const orphanRepos: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }

    if (registered.has(entry.name)) {
      continue;
    }

    if (await exists(join(cwd, entry.name, ".git"))) {
      orphanRepos.push(entry.name);
    }
  }

  return orphanRepos.sort();
}

export async function runSync(input: RunSyncInput): Promise<RunSyncResult> {
  const configPath = join(input.cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  const config = parseConfig(await readTextFile(configPath));
  const runtime = config.runtime ?? buildDefaultRuntimeConfig();
  const repoStatuses: RepoStatus[] = [];
  const drift: StackDriftEntry[] = [];

  for (const repo of config.repos) {
    const repoDir = join(input.cwd, repo.name);
    const dirExists = await exists(repoDir);

    if (!dirExists) {
      repoStatuses.push({
        repoName: repo.name,
        dirExists: false,
        configuredBranch: repo.branch,
        currentBranch: null,
        branchMatchesConfig: false,
        ahead: 0,
        behind: 0,
      });
      continue;
    }

    const currentBranchResult = await getCurrentBranch(repoDir);
    const fetchResult = await fetchAndAheadBehind(repoDir, repo.branch);

    repoStatuses.push({
      repoName: repo.name,
      dirExists: true,
      configuredBranch: repo.branch,
      currentBranch: currentBranchResult.branch,
      currentBranchError: currentBranchResult.error,
      branchMatchesConfig: currentBranchResult.branch === repo.branch,
      ahead: fetchResult.ahead,
      behind: fetchResult.behind,
      fetchError: fetchResult.fetchError,
    });

    const analysis = await analyzeRepo(repoDir);
    const analysisSnapshot = createStoredRepoAnalysis(repo.name, analysis, new Date().toISOString());
    await writeJsonStore(getStoredRepoAnalysisPath(input.cwd, repo.name), analysisSnapshot);

    if (!sameStack(repo.stack, analysis.stack)) {
      drift.push({
        repoName: repo.name,
        kind: "stack",
        expected: repo.stack,
        actual: analysis.stack,
      });
    }
  }

  const orphanRepos = await detectOrphanRepos(input.cwd, config.repos);

  if (input.update === true) {
    const updatedRepos = config.repos.map((r) => {
      const driftEntry = drift.find((d) => d.repoName === r.name);
      return driftEntry ? { ...r, stack: driftEntry.actual } : r;
    });
    const updatedConfig = {
      ...config,
      repos: updatedRepos,
      updatedAt: new Date().toISOString(),
    };
    await writeTextFile(configPath, serializeConfig(updatedConfig));
  }

  const configForContext =
    input.update === true
      ? {
          ...config,
          repos: config.repos.map((repo) => {
            const driftEntry = drift.find((entry) => entry.repoName === repo.name);
            return driftEntry ? { ...repo, stack: driftEntry.actual } : repo;
          }),
        }
      : config;

  const storedAnalyses = await readStoredRepoAnalyses(
    input.cwd,
    config.repos.map((repo) => repo.name),
  );
  if (runtime.context.enabled) {
    const repoMapGeneratedAt = new Date().toISOString();
    const repoMap = buildRepoMapDocument(configForContext, storedAnalyses, repoMapGeneratedAt);
    const taskBundles = buildTaskBundlesDocument(repoMap, repoMapGeneratedAt);
    const configuredRepoMapPath = join(input.cwd, runtime.context.repoMapFile);
    const canonicalRepoMapPath = getCanonicalRepoMapPath(input.cwd);

    await writeJsonStore(canonicalRepoMapPath, repoMap);
    if (configuredRepoMapPath !== canonicalRepoMapPath) {
      await writeJsonStore(configuredRepoMapPath, repoMap);
    }
    await writeJsonStore(join(input.cwd, ".bbg", "context", "task-bundles.json"), taskBundles);
  }

  return {
    repoStatuses,
    orphanRepos,
    drift,
  };
}
