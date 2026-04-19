import type { BbgConfig, RepoEntry } from "../config/schema.js";
import type { AnalyzeRunState } from "../runtime/analyze-runs.js";

export interface RunAnalyzeCommandInput {
  cwd: string;
  repos?: string[];
  refresh?: boolean;
}

export interface RunAnalyzeCommandResult {
  runId: string;
  status: "completed" | "partial" | "failed";
  scope: "repo" | "workspace";
  analyzedRepos: string[];
  technicalArchitecturePath: string;
  businessArchitecturePath: string;
  dependencyGraphPath: string;
  repoDocs: string[];
  repositoryDocs: string[];
  workspaceTopologyPath: string;
  integrationMapPath: string;
  moduleMapPath: string;
  coreFlowsPath: string;
  docsUpdated: string[];
  knowledgeUpdated: string[];
}

export interface AnalyzeSelection {
  config: BbgConfig;
  selectedRepos: RepoEntry[];
  scope: "repo" | "workspace";
}

export interface RepoTechnicalAnalysis {
  repo: RepoEntry;
  stack: {
    language: string;
    framework: string;
    buildTool: string;
    testFramework: string;
    packageManager: string;
    languageVersion?: string;
    frameworkVersion?: string;
  };
  structure: string[];
  deps: string[];
  testing: {
    framework: string;
    hasTestDir: boolean;
    testPattern: string;
  };
}

export interface RepoBusinessAnalysis {
  repoName: string;
  description: string;
  responsibilities: string[];
  flowHints: string[];
}

export interface WorkspaceFusionResult {
  scope: "repo" | "workspace";
  repos: Array<{
    name: string;
    type: string;
    description: string;
    stack: RepoTechnicalAnalysis["stack"];
    deps: string[];
    structure: string[];
    testing: RepoTechnicalAnalysis["testing"];
  }>;
  integrationEdges: Array<{
    from: string;
    to: string;
  }>;
  businessModules: Array<{
    name: string;
    description: string;
    type: string;
    responsibilities: string[];
    flowHints: string[];
  }>;
}

export interface AnalyzeDocArtifacts {
  technicalArchitecturePath: string;
  businessArchitecturePath: string;
  dependencyGraphPath: string;
  repoDocs: string[];
  repositoryDocs: string[];
  workspaceTopologyPath: string;
  integrationMapPath: string;
  moduleMapPath: string;
  coreFlowsPath: string;
  docsUpdated: string[];
}

export interface AnalyzeKnowledgeArtifacts {
  knowledgeUpdated: string[];
}

export interface AnalyzeEmitArtifacts extends AnalyzeDocArtifacts, AnalyzeKnowledgeArtifacts {}

export interface AnalyzeOrchestratorResult {
  result: RunAnalyzeCommandResult;
  state: AnalyzeRunState;
}
