import type { RepoBusinessAnalysis, RepoTechnicalAnalysis, WorkspaceFusionResult } from "./types.js";

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function overlap(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return left.filter((value) => rightSet.has(value.toLowerCase()));
}

function inferWorkspaceEdges(input: {
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
}): WorkspaceFusionResult["integrationEdges"] {
  const businessByRepo = new Map(input.business.map((entry) => [entry.repoName, entry] as const));
  const backendRepos = input.technical.filter((repo) => repo.repo.type === "backend").map((repo) => repo.repo.name);

  return unique(
    input.technical.flatMap((technical) => {
      if (technical.repo.type === "backend") {
        return [];
      }
      const business = businessByRepo.get(technical.repo.name);
      const matchedBackends = backendRepos.flatMap((backendRepo) => {
        const backendBusiness = businessByRepo.get(backendRepo);
        const sharedTerms = overlap(
          [...(business?.domainTerms ?? []), ...(business?.capabilities ?? [])],
          [...(backendBusiness?.domainTerms ?? []), ...(backendBusiness?.capabilities ?? [])],
        );
        if (sharedTerms.length === 0 && (business?.apiSignals.length ?? 0) === 0) {
          return [];
        }
        return JSON.stringify({
          from: technical.repo.name,
          to: backendRepo,
          kind: "ui-to-service",
          signals: unique([
            ...sharedTerms.map((term) => `domain:${term}`),
            ...(business?.apiSignals.slice(0, 4).map((entry) => `api:${entry}`) ?? []),
          ]),
        });
      });
      return matchedBackends;
    }),
  ).map((entry) => JSON.parse(entry) as WorkspaceFusionResult["integrationEdges"][number]);
}

function inferBusinessModules(input: {
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
}): WorkspaceFusionResult["businessModules"] {
  const modules = new Map<string, WorkspaceFusionResult["businessModules"][number]>();

  for (const technical of input.technical) {
    const business = input.business.find((entry) => entry.repoName === technical.repo.name);
    for (const capability of business?.capabilities ?? []) {
      const key = capability.toLowerCase();
      const existing = modules.get(key);
      if (existing) {
        existing.responsibilities = unique([...existing.responsibilities, ...(business?.responsibilities ?? [])]).slice(0, 8);
        existing.flowHints = unique([...existing.flowHints, ...(business?.flowHints ?? [])]).slice(0, 8);
        continue;
      }
      modules.set(key, {
        name: capability,
        description: capability,
        type: "capability",
        responsibilities: (business?.responsibilities ?? []).slice(0, 6),
        flowHints: (business?.flowHints ?? []).slice(0, 6),
      });
    }
  }

  if (modules.size > 0) {
    return [...modules.values()];
  }

  const businessByRepo = new Map(input.business.map((entry) => [entry.repoName, entry] as const));
  return input.technical.map((technical) => {
    const business = businessByRepo.get(technical.repo.name);
    return {
      name: technical.repo.name,
      description: technical.repo.description,
      type: technical.repo.type,
      responsibilities: business?.responsibilities ?? [technical.repo.type],
      flowHints: business?.flowHints ?? [],
    };
  });
}

export function fuseWorkspaceAnalysis(input: {
  scope: "repo" | "workspace";
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
}): WorkspaceFusionResult {
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
    integrationEdges: inferWorkspaceEdges(input),
    businessModules: inferBusinessModules(input),
  };
}
