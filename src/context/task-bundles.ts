import type { RepoMapDocument } from "./repo-map.js";

export interface TaskBundle {
  id: string;
  repo: string;
  title: string;
  stack: string[];
  tags: string[];
  deps: string[];
  testPattern: string | null;
}

export interface TaskBundlesDocument {
  version: number;
  generatedAt: string;
  bundles: TaskBundle[];
}

function toSortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function buildTitle(repoName: string, description: string): string {
  return description.length > 0 ? `${repoName}: ${description}` : repoName;
}

export function buildTaskBundlesDocument(repoMap: RepoMapDocument, generatedAt: string): TaskBundlesDocument {
  return {
    version: 1,
    generatedAt,
    bundles: repoMap.repos.map((repo) => ({
      id: repo.name,
      repo: repo.name,
      title: buildTitle(repo.name, repo.description),
      stack: [repo.stack.language, repo.stack.framework, repo.stack.buildTool, repo.stack.testFramework],
      tags: toSortedUnique([repo.type, ...repo.structure]),
      deps: repo.deps,
      testPattern: repo.testing?.testPattern ?? null,
    })),
  };
}
