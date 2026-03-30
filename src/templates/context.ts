import type { BbgConfig, RepoEntry } from "../config/schema.js";

export interface TemplateContext {
  projectName: string;
  projectDescription: string;
  repos: RepoEntry[];
  hasBackend: boolean;
  hasFrontendPc: boolean;
  hasFrontendH5: boolean;
  hasFrontendWeb: boolean;
  backendRepos: RepoEntry[];
  frontendRepos: RepoEntry[];
  allRepoNames: string[];
  riskThresholds: BbgConfig["governance"]["riskThresholds"];
  enableRedTeam: boolean;
  enableCrossAudit: boolean;
  languages: string[];
  frameworks: string[];
  hasJava: boolean;
  hasTypeScript: boolean;
  hasPython: boolean;
  hasGo: boolean;
  bbgVersion: string;
  generatedAt: string;
  repo?: RepoEntry;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function buildTemplateContext(config: BbgConfig): TemplateContext {
  const backendRepos = config.repos.filter((repo) => repo.type === "backend");
  const frontendRepos = config.repos.filter((repo) => repo.type.startsWith("frontend"));
  const languages = unique(config.repos.map((repo) => repo.stack.language));
  const frameworks = unique(config.repos.map((repo) => repo.stack.framework));

  return {
    projectName: config.projectName,
    projectDescription: config.projectDescription,
    repos: config.repos,
    hasBackend: backendRepos.length > 0,
    hasFrontendPc: config.repos.some((repo) => repo.type === "frontend-pc"),
    hasFrontendH5: config.repos.some((repo) => repo.type === "frontend-h5"),
    hasFrontendWeb: config.repos.some((repo) => repo.type === "frontend-web"),
    backendRepos,
    frontendRepos,
    allRepoNames: config.repos.map((repo) => repo.name),
    riskThresholds: config.governance.riskThresholds,
    enableRedTeam: config.governance.enableRedTeam,
    enableCrossAudit: config.governance.enableCrossAudit,
    languages,
    frameworks,
    hasJava: languages.includes("java"),
    hasTypeScript: languages.includes("typescript"),
    hasPython: languages.includes("python"),
    hasGo: languages.includes("go"),
    bbgVersion: config.version,
    generatedAt: new Date().toISOString(),
  };
}
