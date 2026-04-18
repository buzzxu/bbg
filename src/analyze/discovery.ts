import { join } from "node:path";
import { parseConfig } from "../config/read-write.js";
import type { AnalyzeSelection } from "./types.js";
import { exists, readTextFile } from "../utils/fs.js";

function normalizeRepoSelection(all: string[], requested?: string[]): string[] {
  if (!requested || requested.length === 0 || requested.includes("all")) {
    return all;
  }
  const requestedSet = new Set(requested.map((value) => value.trim()).filter((value) => value.length > 0));
  return all.filter((repo) => requestedSet.has(repo));
}

export async function discoverAnalyzeSelection(cwd: string, requestedRepos?: string[]): Promise<AnalyzeSelection> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  const config = parseConfig(await readTextFile(configPath));
  const selectedRepoNames = normalizeRepoSelection(
    config.repos.map((repo) => repo.name),
    requestedRepos,
  );
  const selectedRepos = selectedRepoNames.map((repoName) => {
    const repo = config.repos.find((entry) => entry.name === repoName);
    if (!repo) {
      throw new Error(`Repository not found in config: ${repoName}`);
    }
    return repo;
  });

  return {
    config,
    selectedRepos,
    scope: selectedRepos.length > 1 ? "workspace" : "repo",
  };
}
