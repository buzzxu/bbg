import type { BbgConfig, RepoEntry } from "../config/schema.js";
import { CLI_VERSION } from "../constants.js";

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
  hasRust: boolean;
  hasKotlin: boolean;
  hasPhp: boolean;
  hasCpp: boolean;
  bbgVersion: string;
  generatedAt: string;
  buildCommand: string;
  testCommand: string;
  lintCommand: string;
  srcDir: string;
  repo?: RepoEntry;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function deriveBuildCommand(languages: string[], repos: RepoEntry[]): string {
  const primaryLang = languages[0] ?? "unknown";
  const buildTool = repos[0]?.stack.buildTool ?? "unknown";

  if (primaryLang === "go") return "go build ./...";
  if (primaryLang === "rust") return "cargo build";
  if (primaryLang === "java") {
    if (buildTool === "gradle") return "./gradlew build";
    return "mvn compile";
  }
  if (primaryLang === "python") return "python -m build";
  return "npm run build";
}

function deriveTestCommand(languages: string[], repos: RepoEntry[]): string {
  const primaryLang = languages[0] ?? "unknown";
  const buildTool = repos[0]?.stack.buildTool ?? "unknown";

  if (primaryLang === "go") return "go test ./...";
  if (primaryLang === "rust") return "cargo test";
  if (primaryLang === "java") {
    if (buildTool === "gradle") return "./gradlew test";
    return "mvn test";
  }
  if (primaryLang === "python") return "pytest";
  return "npm test";
}

function deriveLintCommand(languages: string[]): string {
  const primaryLang = languages[0] ?? "unknown";

  if (primaryLang === "go") return "golangci-lint run";
  if (primaryLang === "rust") return "cargo clippy";
  if (primaryLang === "python") return "ruff check .";
  if (primaryLang === "java") return "mvn checkstyle:check";
  return "npm run lint";
}

function deriveSrcDir(languages: string[]): string {
  const primaryLang = languages[0] ?? "unknown";

  if (primaryLang === "go") return "pkg/";
  if (primaryLang === "rust") return "src/";
  if (primaryLang === "java") return "src/main/java/";
  if (primaryLang === "python") return "app/";
  return "src/";
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
    hasTypeScript: languages.includes("typescript") || languages.includes("javascript"),
    hasPython: languages.includes("python"),
    hasGo: languages.includes("go"),
    hasRust: languages.includes("rust"),
    hasKotlin: languages.includes("kotlin"),
    hasPhp: languages.includes("php"),
    hasCpp: languages.includes("cpp") || languages.includes("c++"),
    bbgVersion: CLI_VERSION,
    generatedAt: new Date().toISOString(),
    buildCommand: deriveBuildCommand(languages, config.repos),
    testCommand: deriveTestCommand(languages, config.repos),
    lintCommand: deriveLintCommand(languages),
    srcDir: deriveSrcDir(languages),
  };
}
