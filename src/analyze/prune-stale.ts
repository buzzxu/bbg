import { readdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import type { BbgConfig } from "../config/schema.js";
import { getAllManagedLanguageGuidePaths, getLanguageGuidePathsForLanguages } from "./language-docs.js";
import { exists } from "../utils/fs.js";

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

async function removePathIfExists(pathValue: string): Promise<boolean> {
  if (!(await exists(pathValue))) {
    return false;
  }

  await rm(pathValue, { recursive: true, force: true });
  return true;
}

async function listMarkdownFiles(dirPath: string): Promise<string[]> {
  if (!(await exists(dirPath))) {
    return [];
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
}

async function listDirectories(dirPath: string): Promise<string[]> {
  if (!(await exists(dirPath))) {
    return [];
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function pruneEmptyLanguageDirectories(cwd: string): Promise<string[]> {
  const root = join(cwd, "docs", "architecture", "languages");
  const removed: string[] = [];
  if (!(await exists(root))) {
    return removed;
  }

  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const dirPath = join(root, entry.name);
    const childEntries = await readdir(dirPath, { withFileTypes: true });
    if (childEntries.length === 0) {
      await rm(dirPath, { recursive: true, force: true });
      removed.push(`docs/architecture/languages/${entry.name}`);
    }
  }

  return removed;
}

export interface PruneStaleAnalyzeArtifactsResult {
  removed: string[];
}

export async function pruneStaleAnalyzeArtifacts(input: {
  cwd: string;
  config: BbgConfig;
}): Promise<PruneStaleAnalyzeArtifactsResult> {
  const currentRepoNames = new Set(input.config.repos.map((repo) => repo.name));
  const currentLanguageGuidePaths = new Set(
    getLanguageGuidePathsForLanguages(input.config.repos.map((repo) => repo.stack.language)),
  );
  const removed: string[] = [];

  const repoArchitectureFiles = await listMarkdownFiles(join(input.cwd, "docs", "architecture", "repos"));
  for (const fileName of repoArchitectureFiles) {
    const repoName = basename(fileName, ".md");
    if (!currentRepoNames.has(repoName)) {
      const relativePath = `docs/architecture/repos/${fileName}`;
      if (await removePathIfExists(join(input.cwd, relativePath))) {
        removed.push(relativePath);
      }
    }
  }

  const repositorySummaryFiles = await listMarkdownFiles(join(input.cwd, "docs", "repositories"));
  for (const fileName of repositorySummaryFiles) {
    const repoName = basename(fileName, ".md");
    if (!currentRepoNames.has(repoName)) {
      const relativePath = `docs/repositories/${fileName}`;
      if (await removePathIfExists(join(input.cwd, relativePath))) {
        removed.push(relativePath);
      }
    }
  }

  const knowledgeRepoDirs = await listDirectories(join(input.cwd, ".bbg", "knowledge", "repos"));
  for (const repoName of knowledgeRepoDirs) {
    if (!currentRepoNames.has(repoName)) {
      const relativePath = `.bbg/knowledge/repos/${repoName}`;
      if (await removePathIfExists(join(input.cwd, relativePath))) {
        removed.push(relativePath);
      }
    }
  }

  const wikiConceptFiles = await listMarkdownFiles(join(input.cwd, "docs", "wiki", "concepts"));
  for (const fileName of wikiConceptFiles) {
    if (!fileName.startsWith("repo-") || !fileName.endsWith("-overview.md")) {
      continue;
    }

    const repoName = fileName.slice("repo-".length, "-overview.md".length * -1);
    if (!currentRepoNames.has(repoName)) {
      const relativePath = `docs/wiki/concepts/${fileName}`;
      if (await removePathIfExists(join(input.cwd, relativePath))) {
        removed.push(relativePath);
      }
    }
  }

  for (const pathValue of getAllManagedLanguageGuidePaths()) {
    if (!currentLanguageGuidePaths.has(pathValue) && await removePathIfExists(join(input.cwd, pathValue))) {
      removed.push(pathValue);
    }
  }

  removed.push(...(await pruneEmptyLanguageDirectories(input.cwd)));

  return {
    removed: unique(removed).sort(),
  };
}
