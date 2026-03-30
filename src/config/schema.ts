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
}
