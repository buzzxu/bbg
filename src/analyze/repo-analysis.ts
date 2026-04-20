import { join } from "node:path";
import { analyzeRepo } from "../analyzers/index.js";
import type { RepoEntry } from "../config/schema.js";
import type { RepoTechnicalAnalysis } from "./types.js";
import { extractRepoBusinessSignalsIfPresent } from "./repo-business-signals.js";

export async function analyzeSelectedRepos(cwd: string, repos: RepoEntry[]): Promise<RepoTechnicalAnalysis[]> {
  return Promise.all(
    repos.map(async (repo) => {
      const repoPath = join(cwd, repo.name);
      const result = await analyzeRepo(repoPath);
      const businessSignals = await extractRepoBusinessSignalsIfPresent(repoPath, repo.type, result.deps);
      return {
        repo,
        stack: result.stack,
        structure: result.structure,
        deps: result.deps,
        testing: result.testing,
        businessSignals,
      };
    }),
  );
}
