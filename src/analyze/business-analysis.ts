import type { RepoBusinessAnalysis, RepoTechnicalAnalysis } from "./types.js";

function deriveResponsibilities(technical: RepoTechnicalAnalysis): string[] {
  const responsibilities = [
    technical.repo.description || technical.repo.type,
    technical.stack.framework !== "unknown" ? `${technical.stack.framework} application surface` : null,
    technical.testing.hasTestDir ? `tested with ${technical.testing.framework}` : null,
  ].filter((value): value is string => value !== null && value.trim().length > 0);

  return responsibilities.length > 0 ? responsibilities : [technical.repo.type];
}

function deriveFlowHints(technical: RepoTechnicalAnalysis): string[] {
  const hints = [
    technical.structure.length > 0 ? `structure: ${technical.structure.join(", ")}` : null,
    technical.deps.length > 0 ? `dependencies: ${technical.deps.join(", ")}` : null,
    technical.stack.buildTool !== "unknown" ? `build: ${technical.stack.buildTool}` : null,
  ].filter((value): value is string => value !== null && value.trim().length > 0);

  return hints;
}

export function deriveRepoBusinessAnalysis(technicalAnalyses: RepoTechnicalAnalysis[]): RepoBusinessAnalysis[] {
  return technicalAnalyses.map((technical) => ({
    repoName: technical.repo.name,
    description: technical.repo.description,
    responsibilities: deriveResponsibilities(technical),
    flowHints: deriveFlowHints(technical),
  }));
}
