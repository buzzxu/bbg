import type { RepoBusinessAnalysis, RepoTechnicalAnalysis, WorkspaceFusionResult } from "./types.js";

export function fuseWorkspaceAnalysis(input: {
  scope: "repo" | "workspace";
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
}): WorkspaceFusionResult {
  const businessByRepo = new Map(input.business.map((entry) => [entry.repoName, entry] as const));

  return {
    scope: input.scope,
    repos: input.technical.map((technical) => ({
      name: technical.repo.name,
      type: technical.repo.type,
      description: technical.repo.description,
      stack: technical.stack,
      deps: technical.deps,
      structure: technical.structure,
      testing: technical.testing,
    })),
    integrationEdges: input.technical.flatMap((technical) =>
      technical.deps.map((dep) => ({
        from: technical.repo.name,
        to: dep,
      })),
    ),
    businessModules: input.technical.map((technical) => {
      const business = businessByRepo.get(technical.repo.name);
      return {
        name: technical.repo.name,
        description: technical.repo.description,
        type: technical.repo.type,
        responsibilities: business?.responsibilities ?? [technical.repo.type],
        flowHints: business?.flowHints ?? [],
      };
    }),
  };
}
