import type { RuntimeConfig } from "../runtime/schema.js";

export type RepoType = "backend" | "frontend-pc" | "frontend-h5" | "frontend-web" | "other";

export interface StackInfo {
  language: string;
  framework: string;
  buildTool: string;
  testFramework: string;
  packageManager: string;
}

export interface RepoEntry {
  name: string;
  gitUrl: string;
  branch: string;
  type: RepoType;
  stack: StackInfo;
  description: string;
}

export interface PluginConfig {
  enabled: boolean;
  directories?: string[];
}

export interface OrganizationConfig {
  orgId?: string;
  teamId?: string;
  policySource?: string;
}

export interface HermesRuntimeConfig {
  enabled?: boolean;
  runsRoot?: string;
  evaluationsRoot?: string;
  candidatesRoot?: string;
}

export interface KnowledgeConfig {
  enabled?: boolean;
  databaseFile?: string;
  sourceRoot?: string;
  wikiRoot?: string;
  hermes?: HermesRuntimeConfig;
}

export interface AgentRunnerToolConfig {
  type?: "cli" | "gui";
  command: string;
  args?: string[];
  detached?: boolean;
  env?: Record<string, string>;
}

export interface AgentRunnerConfig {
  defaultTool?: string;
  tools?: Record<string, AgentRunnerToolConfig>;
}

export interface BbgConfig {
  version: string;
  projectName: string;
  projectDescription: string;
  createdAt: string;
  updatedAt: string;
  repos: RepoEntry[];
  governance: {
    riskThresholds: {
      high: { grade: string; minScore: number };
      medium: { grade: string; minScore: number };
      low: { grade: string; minScore: number };
    };
    enableRedTeam: boolean;
    enableCrossAudit: boolean;
  };
  context: Record<string, unknown>;
  runtime?: RuntimeConfig;
  plugins?: PluginConfig;
  organization?: OrganizationConfig;
  knowledge?: KnowledgeConfig;
  agentRunner?: AgentRunnerConfig;
}
