import { join } from "node:path";
import { analyzeRepo } from "../analyzers/index.js";
import type { RepoEntry } from "../config/schema.js";
import type { RepoTechnicalAnalysis } from "./types.js";

export async function analyzeSelectedRepos(cwd: string, repos: RepoEntry[]): Promise<RepoTechnicalAnalysis[]> {
  return Promise.all(
    repos.map(async (repo) => {
      const result = await analyzeRepo(join(cwd, repo.name));
      return {
        repo,
        stack: result.stack,
        structure: result.structure,
        deps: result.deps,
        testing: result.testing,
      };
    }),
  );
}
