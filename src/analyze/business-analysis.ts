import type { RepoBusinessAnalysis, RepoTechnicalAnalysis } from "./types.js";

function unique(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ];
}

function frameworkResponsibility(technical: RepoTechnicalAnalysis): string | null {
  const framework = technical.stack.framework;
  if (framework === "unknown") {
    return null;
  }

  if (technical.repo.type === "frontend-web") {
    return `${framework} admin experience`;
  }

  if (technical.repo.type === "frontend-h5") {
    return `${framework} user journey`;
  }

  return `${framework} service layer`;
}

function routeSummary(signals: RepoTechnicalAnalysis["businessSignals"]): string[] {
  return [
    ...signals.routeEntrypoints.slice(0, 4).map((entry) => `entrypoint: ${entry}`),
    ...signals.apiEntrypoints.slice(0, 4).map((entry) => `api: ${entry}`),
  ];
}

export function deriveRepoBusinessAnalysis(technicalAnalyses: RepoTechnicalAnalysis[]): RepoBusinessAnalysis[] {
  return technicalAnalyses.map((technical) => {
    const signals = technical.businessSignals;
    const responsibilities = unique([
      technical.repo.description,
      ...signals.capabilityTerms.slice(0, 5),
      frameworkResponsibility(technical),
      signals.externalIntegrations.length > 0 ? `integrates with ${signals.externalIntegrations.join(", ")}` : "",
    ]);

    const flowHints = unique([...signals.workflowHints, ...routeSummary(signals)]);

    return {
      repoName: technical.repo.name,
      description: technical.repo.description,
      responsibilities: responsibilities.length > 0 ? responsibilities : [technical.repo.type],
      flowHints,
      capabilities: signals.capabilityTerms,
      entrypoints: signals.routeEntrypoints,
      apiSignals: signals.apiEntrypoints,
      domainTerms: signals.domainTerms,
      entityTerms: signals.entityTerms,
      externalIntegrations: signals.externalIntegrations,
      riskMarkers: signals.riskMarkers,
    };
  });
}
