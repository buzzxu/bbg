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

export type AnalyzeKnowledgeStatus =
  | "observed"
  | "inferred"
  | "candidate"
  | "confirmed-local"
  | "promoted-local"
  | "eligible-global"
  | "promoted-global"
  | "stale"
  | "superseded";

export type AnalyzeKnowledgeProvenanceSource =
  | "static-analysis"
  | "business-signal"
  | "interview-answer"
  | "llm-inference"
  | "task-runtime"
  | "verification"
  | "incident-review"
  | "human-confirmation";

export interface AnalyzeCodeReference {
  repo: string;
  file: string;
  lineRange: [number, number];
  symbolName?: string;
  snippet?: string;
}

export interface AnalyzeKnowledgeProvenance {
  source: AnalyzeKnowledgeProvenanceSource;
  ref: string;
  description: string;
  confidenceImpact: number;
  codeRefs: AnalyzeCodeReference[];
}

export interface AnalyzeKnowledgeFreshness {
  createdAt: string;
  updatedAt: string;
  lastValidatedAt: string | null;
  lastSourceChangeAt: string | null;
  freshnessStatus: "fresh" | "needs-review" | "stale";
}

export interface AnalyzeKnowledgeHistory {
  firstSeenRunId: string;
  lastSeenRunId: string;
  changeKind: "new" | "unchanged" | "strengthened" | "weakened" | "replaced";
  supersedes: string[];
  supersededBy: string | null;
}

export interface AnalyzeKnowledgeItem {
  id: string;
  runId: string;
  scope: "workspace" | "repo";
  repo: string | null;
  kind:
    | "capability"
    | "critical-flow"
    | "contract-surface"
    | "domain-context"
    | "runtime-constraint"
    | "risk-item"
    | "decision-record"
    | "change-impact"
    | "analysis-dimension";
  title: string;
  summary: string;
  payloadPath: string;
  payloadPointer: string;
  confidence: number;
  status: AnalyzeKnowledgeStatus;
  tags: string[];
  relatedIds: string[];
  provenance: AnalyzeKnowledgeProvenance[];
  freshness: AnalyzeKnowledgeFreshness;
  history: AnalyzeKnowledgeHistory;
}

export interface AnalyzeEvidenceItem {
  id: string;
  runId: string;
  type:
    | "code-structure"
    | "route-entrypoint"
    | "api-entrypoint"
    | "domain-term"
    | "entity-term"
    | "integration-signal"
    | "risk-marker"
    | "interview-answer"
    | "llm-reasoning"
    | "verification-result"
    | "task-confirmation";
  summary: string;
  sourceRefs: string[];
  codeRefs: AnalyzeCodeReference[];
  clarity: number;
  relatedKnowledgeIds: string[];
  contradictions: string[];
}

export interface AnalyzeKnowledgeLifecycleState {
  knowledgeItemId: string;
  status: AnalyzeKnowledgeStatus;
  confidence: number;
  freshnessStatus: AnalyzeKnowledgeFreshness["freshnessStatus"];
  reviewRequired: boolean;
  supersededBy: string | null;
}

export interface AnalyzeRunDiffSummary {
  newItems: number;
  unchangedItems: number;
  strengthenedItems: number;
  weakenedItems: number;
  supersededItems: number;
  removedItems: number;
}

export interface AnalyzeRunDiffEntry {
  knowledgeItemId: string;
  changeKind: AnalyzeKnowledgeHistory["changeKind"] | "removed";
  previousConfidence: number | null;
  currentConfidence: number | null;
  note: string;
}

export interface AnalyzeKnowledgeSnapshot {
  version: 1;
  runId: string;
  createdAt: string;
  scope: "repo" | "workspace";
  repos: string[];
  focusQuery: string | null;
  interviewMode: string;
  paths: {
    knowledgeItems: string;
    evidenceIndex: string;
    lifecycle: string;
    runDiff: string;
    wikiSummaryPaths: string[];
    domainFiles: string[];
  };
  counts: {
    knowledgeItems: number;
    evidenceItems: number;
    candidateEligibleItems: number;
  };
  confidenceProfile: {
    high: number;
    medium: number;
    low: number;
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
  analysisDimensionsPath: string;
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
  id?: string;
  name: string;
  description: string;
  owningRepos: string[];
  responsibilities: string[];
  evidence: AnalyzeEvidenceNote;
  confidence: number;
  status?: AnalyzeKnowledgeStatus;
  provenance?: AnalyzeKnowledgeProvenance[];
  relatedIds?: string[];
}

export interface AnalyzeWorkflowStep {
  order: number;
  repo: string;
  action: string;
  boundary: string;
  evidence: AnalyzeEvidenceNote;
}

export interface AnalyzeCriticalFlow {
  id?: string;
  name: string;
  summary: string;
  participatingRepos: string[];
  participatingModules: string[];
  contracts: string[];
  failurePoints: string[];
  steps: AnalyzeWorkflowStep[];
  evidence: AnalyzeEvidenceNote;
  confidence: number;
  status?: AnalyzeKnowledgeStatus;
  provenance?: AnalyzeKnowledgeProvenance[];
  relatedIds?: string[];
}

export interface AnalyzeContractSurface {
  id?: string;
  name: string;
  type: "ui" | "http-api" | "integration" | "async-job" | "shared-schema";
  owners: string[];
  consumers: string[];
  boundary: string;
  evidence: AnalyzeEvidenceNote;
  confidence: number;
  status?: AnalyzeKnowledgeStatus;
  provenance?: AnalyzeKnowledgeProvenance[];
  relatedIds?: string[];
}

export interface AnalyzeDomainContext {
  id?: string;
  name: string;
  ownerRepo: string;
  summary: string;
  coreConcepts: string[];
  evidence: AnalyzeEvidenceNote;
  confidence: number;
  status?: AnalyzeKnowledgeStatus;
  provenance?: AnalyzeKnowledgeProvenance[];
  relatedIds?: string[];
}

export interface AnalyzeRuntimeConstraint {
  id?: string;
  statement: string;
  category: "security" | "compatibility" | "release" | "latency" | "consistency" | "operational";
  evidence: AnalyzeEvidenceNote;
  confidence: number;
  status?: AnalyzeKnowledgeStatus;
  provenance?: AnalyzeKnowledgeProvenance[];
  relatedIds?: string[];
}

export interface AnalyzeRiskItem {
  id?: string;
  title: string;
  severity: "high" | "medium";
  affectedRepos: string[];
  reasons: string[];
  evidence: AnalyzeEvidenceNote;
  confidence: number;
  status?: AnalyzeKnowledgeStatus;
  provenance?: AnalyzeKnowledgeProvenance[];
  relatedIds?: string[];
}

export interface AnalyzeDecisionRecord {
  id?: string;
  statement: string;
  status: "confirmed" | "assumed";
  rationale: string;
  evidence: AnalyzeEvidenceNote;
  confidence: number;
  lifecycleStatus?: AnalyzeKnowledgeStatus;
  provenance?: AnalyzeKnowledgeProvenance[];
  relatedIds?: string[];
}

export interface AnalyzeChangeImpactEntry {
  id?: string;
  target: string;
  impactedRepos: string[];
  impactedContracts: string[];
  impactedTests: string[];
  reviewerHints: string[];
  evidence: AnalyzeEvidenceNote;
  confidence: number;
  status?: AnalyzeKnowledgeStatus;
  provenance?: AnalyzeKnowledgeProvenance[];
  relatedIds?: string[];
}

export interface AnalyzeBusinessDimension {
  id?: string;
  name: string;
  description: string;
  rationale: string;
  supportingRepos: string[];
  evidence: AnalyzeEvidenceNote;
  confidence: number;
  status?: AnalyzeKnowledgeStatus;
  provenance?: AnalyzeKnowledgeProvenance[];
  relatedIds?: string[];
}

export interface AnalyzeKnowledgeModel {
  analysisDimensions: AnalyzeBusinessDimension[];
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
  socratic?: {
    enabled: boolean;
    dimensions: Array<{
      id: string;
      name: string;
      weight: number;
      score: number;
      tier: 1 | 2;
    }>;
    ambiguitySignals: string[];
  };
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
    | "emit-hermes-intake"
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
  businessSignals: RepoBusinessSignals;
}

export interface RepoBusinessSignals {
  routeEntrypoints: string[];
  apiEntrypoints: string[];
  domainTerms: string[];
  entityTerms: string[];
  capabilityTerms: string[];
  workflowHints: string[];
  externalIntegrations: string[];
  riskMarkers: string[];
}

export interface RepoBusinessAnalysis {
  repoName: string;
  description: string;
  responsibilities: string[];
  flowHints: string[];
  capabilities: string[];
  entrypoints: string[];
  apiSignals: string[];
  domainTerms: string[];
  entityTerms: string[];
  externalIntegrations: string[];
  riskMarkers: string[];
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
    kind?: "http-api" | "ui-to-service" | "shared-domain";
    signals?: string[];
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
  analysisDimensionsPath: string;
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
  snapshotPath?: string;
}

export interface AnalyzeEmitArtifacts extends AnalyzeDocArtifacts, AnalyzeKnowledgeArtifacts {}

export interface AnalyzeOrchestratorResult {
  result: RunAnalyzeCommandResult;
  state: AnalyzeRunState;
}
