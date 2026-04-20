import type { BbgConfig, RepoEntry } from "../config/schema.js";
import type { AnalyzeRunState } from "../runtime/analyze-runs.js";

export interface RunAnalyzeCommandInput {
  cwd: string;
  repos?: string[];
  refresh?: boolean;
  focus?: string;
  interview?: {
    mode?: "auto" | "off" | "guided" | "deep";
    answers?: Partial<Record<AnalyzeInterviewQuestionKey, string>>;
  };
}

export interface RunAnalyzeCommandResult {
  runId: string;
  status: "completed" | "partial" | "failed";
  scope: "repo" | "workspace";
  analyzedRepos: string[];
  technicalArchitecturePath: string;
  businessArchitecturePath: string;
  dependencyGraphPath: string;
  capabilityMapPath: string;
  criticalFlowsPath: string;
  integrationContractsPath: string;
  runtimeConstraintsPath: string;
  riskSurfacePath: string;
  decisionHistoryPath: string;
  changeImpactMapPath: string;
  repoDocs: string[];
  repositoryDocs: string[];
  workspaceTopologyPath: string;
  integrationMapPath: string;
  moduleMapPath: string;
  coreFlowsPath: string;
  docsUpdated: string[];
  knowledgeUpdated: string[];
  phases: AnalyzePhaseSummary[];
  interview: AnalyzeInterviewSummary | null;
  focus: AnalyzeFocusSummary | null;
  focusedAnalysisPath: string | null;
}

export type AnalyzeInterviewQuestionKey =
  | "businessGoal"
  | "criticalFlows"
  | "systemBoundaries"
  | "nonNegotiableConstraints"
  | "failureHotspots"
  | "decisionHistory";

export interface AnalyzeProjectContext {
  businessGoal: string | null;
  criticalFlows: string[];
  systemBoundaries: string[];
  nonNegotiableConstraints: string[];
  failureHotspots: string[];
  decisionHistory: string[];
}

export type AnalyzeConfidenceScores = Record<AnalyzeInterviewQuestionKey, number>;

export interface AnalyzeKnowledgeGap {
  key: AnalyzeInterviewQuestionKey;
  question: string;
  reason: string;
  priority: number;
}

export interface AnalyzeFocusSummary {
  query: string;
  matchedRepos: string[];
  matchedSignals: string[];
  matchedContracts: string[];
  riskHotspots: string[];
  reviewerHints: string[];
  likelyEntrypoints: string[];
  rationale: string[];
}

export interface AnalyzeEvidenceNote {
  summary: string;
  signals: string[];
}

export interface AnalyzeCapability {
  name: string;
  description: string;
  owningRepos: string[];
  responsibilities: string[];
  evidence: AnalyzeEvidenceNote;
  confidence: number;
}

export interface AnalyzeWorkflowStep {
  order: number;
  repo: string;
  action: string;
  boundary: string;
  evidence: AnalyzeEvidenceNote;
}

export interface AnalyzeCriticalFlow {
  name: string;
  summary: string;
  participatingRepos: string[];
  participatingModules: string[];
  contracts: string[];
  failurePoints: string[];
  steps: AnalyzeWorkflowStep[];
  evidence: AnalyzeEvidenceNote;
  confidence: number;
}

export interface AnalyzeContractSurface {
  name: string;
  type: "ui" | "http-api" | "integration" | "async-job" | "shared-schema";
  owners: string[];
  consumers: string[];
  boundary: string;
  evidence: AnalyzeEvidenceNote;
  confidence: number;
}

export interface AnalyzeDomainContext {
  name: string;
  ownerRepo: string;
  summary: string;
  coreConcepts: string[];
  evidence: AnalyzeEvidenceNote;
  confidence: number;
}

export interface AnalyzeRuntimeConstraint {
  statement: string;
  category: "security" | "compatibility" | "release" | "latency" | "consistency" | "operational";
  evidence: AnalyzeEvidenceNote;
  confidence: number;
}

export interface AnalyzeRiskItem {
  title: string;
  severity: "high" | "medium";
  affectedRepos: string[];
  reasons: string[];
  evidence: AnalyzeEvidenceNote;
  confidence: number;
}

export interface AnalyzeDecisionRecord {
  statement: string;
  status: "confirmed" | "assumed";
  rationale: string;
  evidence: AnalyzeEvidenceNote;
  confidence: number;
}

export interface AnalyzeChangeImpactEntry {
  target: string;
  impactedRepos: string[];
  impactedContracts: string[];
  impactedTests: string[];
  reviewerHints: string[];
  evidence: AnalyzeEvidenceNote;
  confidence: number;
}

export interface AnalyzeKnowledgeModel {
  capabilities: AnalyzeCapability[];
  criticalFlows: AnalyzeCriticalFlow[];
  contractSurfaces: AnalyzeContractSurface[];
  domainContexts: AnalyzeDomainContext[];
  runtimeConstraints: AnalyzeRuntimeConstraint[];
  riskSurface: AnalyzeRiskItem[];
  decisionRecords: AnalyzeDecisionRecord[];
  changeImpact: AnalyzeChangeImpactEntry[];
}

export interface AnalyzeInterviewAssumption {
  key: AnalyzeInterviewQuestionKey;
  values: string[];
  rationale: string;
  evidence: string[];
}

export interface AnalyzeInterviewSummary {
  mode: "off" | "passive" | "guided" | "deep";
  interactive: boolean;
  asked: number;
  answered: number;
  gaps: AnalyzeKnowledgeGap[];
  assumptionsApplied: AnalyzeInterviewAssumption[];
  pendingQuestions: AnalyzeKnowledgeGap[];
  pendingQuestionsPath: string | null;
  unresolvedGaps: AnalyzeInterviewQuestionKey[];
  confidenceBefore: AnalyzeConfidenceScores;
  confidenceAfter: AnalyzeConfidenceScores;
  context: AnalyzeProjectContext;
  artifactsUpdated: string[];
}

export interface AnalyzePhaseSummary {
  name:
    | "discovery"
    | "technical-analysis"
    | "business-analysis"
    | "workspace-fusion"
    | "focus-analysis"
    | "capability-analysis"
    | "workflow-analysis"
    | "contract-analysis"
    | "risk-impact-analysis"
    | "deep-interview"
    | "prune-stale"
    | "emit-docs"
    | "emit-knowledge"
    | "emit-wiki"
    | "write-state";
  status: "completed" | "skipped" | "pending";
  details: string[];
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
  capabilityMapPath: string;
  criticalFlowsPath: string;
  integrationContractsPath: string;
  runtimeConstraintsPath: string;
  riskSurfacePath: string;
  decisionHistoryPath: string;
  changeImpactMapPath: string;
  repoDocs: string[];
  repositoryDocs: string[];
  workspaceTopologyPath: string;
  integrationMapPath: string;
  moduleMapPath: string;
  coreFlowsPath: string;
  projectContextPath: string;
  focusedAnalysisPath: string | null;
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
