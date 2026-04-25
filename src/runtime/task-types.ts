import type { WorkflowDecisionSet, WorkflowKind } from "../workflow/types.js";
import type { AnalyzeProgressEvent } from "../analyze/types.js";
import type { TaskEnvManifest } from "./task-envs.js";

export type TaskSessionStatus =
  | "prepared"
  | "planning"
  | "ready"
  | "implementing"
  | "verifying"
  | "retrying"
  | "blocked"
  | "completed"
  | "failed";

export type TaskStep =
  | "workflow-plan"
  | "task-env"
  | "observe"
  | "hermes-query"
  | "handoff"
  | "implement"
  | "verify"
  | "review"
  | "complete";

export interface TaskRunnerState {
  mode: "current" | "agent" | "prepare";
  tool: string | null;
  launched: boolean;
  command: string | null;
  args: string[];
  launchedAt: string | null;
  lastAttemptAt: string | null;
  lastLaunchError: string | null;
}

export interface TaskVerificationSummary {
  ok: boolean;
  verifiedAt: string;
  reasons: string[];
  missingEvidence: string[];
  observeRequired: boolean;
  observationReadiness: "not-required" | "empty" | "partial" | "ready";
}

export interface TaskLoopContextSummary {
  id: string;
  taskEnvId: string | null;
  status: "running" | "waiting-for-change" | "completed" | "max-iterations";
  iterations: number;
  updatedAt: string;
}

export interface TaskRecoveryAction {
  kind: "auto-observe-start" | "autonomy-budget-escalation";
  at: string;
  detail: string;
}

export interface TaskReviewResult {
  reviewer: string;
  status: "passed" | "failed";
  recordedAt: string;
  summary: string;
  findings: string[];
}

export interface TaskAutonomyState {
  maxAttempts: number;
  maxVerifyFailures: number;
  maxDurationMs: number;
  verifyFailureCount: number;
  escalated: boolean;
  escalationReason: string | null;
  escalatedAt: string | null;
}

export interface TaskExecutionRoute {
  classification: {
    domain: string;
    complexity: string;
    context: string;
    targetCommand: string | null;
    languages: string[];
  };
  recommendation: {
    profileClass: string;
    reason: string;
    telemetryNote: string;
    reviewerAgents: string[];
    guideReferences: string[];
  };
}

export interface TaskImpactGuidance {
  matchedKnowledgeItemIds: string[];
  matchedCapabilities: string[];
  matchedFlows: string[];
  impactedRepos: string[];
  impactedContracts: string[];
  impactedTests: string[];
  riskHotspots: string[];
  reviewerHints: string[];
  decisionNotes: string[];
  evidenceSignals: string[];
  references: string[];
  confidence: number | null;
  rationale: string[];
  reviewHint: string | null;
}

export interface TaskSession {
  version: number;
  taskId: string;
  task: string;
  status: TaskSessionStatus;
  entrypoint: "start" | "resume";
  tool: string | null;
  startedAt: string;
  updatedAt: string;
  workflowKind: WorkflowKind;
  currentStep: TaskStep | null;
  attemptCount: number;
  taskEnvId: string | null;
  observeSessionIds: string[];
  loopId: string | null;
  nextActions: string[];
  lastError: string | null;
  lastErrorAt: string | null;
  blockedReason: string | null;
  runner: TaskRunnerState;
  lastVerification: TaskVerificationSummary | null;
  lastRecoveryAction: TaskRecoveryAction | null;
  lastReviewResult: TaskReviewResult | null;
  autonomy: TaskAutonomyState;
}

export interface TaskContext {
  version: number;
  taskId: string;
  analyzeRunId: string | null;
  references: string[];
  executionRoute: TaskExecutionRoute | null;
  impactGuidance: TaskImpactGuidance;
  languageGuidance: {
    languages: string[];
    guideReferences: string[];
    reviewerAgents: string[];
    reviewHint: string | null;
  };
  reviewGate: {
    level: "none" | "recommended" | "required";
    reviewers: string[];
    guideReferences: string[];
    reviewPack: string[];
    stopConditions: string[];
    reason: string;
  };
  commandSpecPath: string;
  summary: string;
  hermesRecommendations: string[];
  hermesQuery: {
    executed: boolean;
    strategy: "default" | "disabled" | "forced";
    topic: string | null;
    summary: string | null;
    commandSpecPath: string | null;
    references: string[];
    influencedWorkflow: boolean;
    influencedRecovery: boolean;
    influencedVerification: boolean;
  };
  taskState: {
    status: TaskSessionStatus;
    currentStep: TaskStep | null;
    taskEnvId: string | null;
    observeSessionIds: string[];
    loopId: string | null;
    loop: TaskLoopContextSummary | null;
    nextActions: string[];
    runner: TaskRunnerState;
    lastVerification: TaskVerificationSummary | null;
    lastRecoveryAction: TaskRecoveryAction | null;
    lastReviewResult: TaskReviewResult | null;
    autonomy: TaskAutonomyState;
  };
  recovery: {
    resumeStrategy: TaskResumeStrategy | null;
    recoveryPlan: TaskRecoveryPlan | null;
  };
}

export interface TaskObservationSummary {
  id: string;
  topic: string;
  envId: string | null;
  rootPath: string;
  uiArtifacts: number;
  logArtifacts: number;
  metricArtifacts: number;
  traceArtifacts: number;
  evidenceKinds: string[];
  totalArtifacts: number;
  readiness: "empty" | "partial" | "ready";
}

export interface TaskResumeStrategy {
  kind: "last-runner" | "default-runner" | "manual";
  preferredTool: string | null;
  fallbackTool: string | null;
  reason: string;
}

export interface TaskRecoveryPlan {
  kind: "none" | "resume-runner" | "collect-evidence" | "retry-implement" | "manual-review";
  actions: string[];
  reason: string;
}

export interface TaskStatusEntry extends TaskSession {
  resumeStrategy: TaskResumeStrategy;
  recoveryPlan: TaskRecoveryPlan;
  executionRoute: TaskContext["executionRoute"];
  impactGuidance: TaskContext["impactGuidance"];
  languageGuidance: TaskContext["languageGuidance"];
  reviewGate: TaskContext["reviewGate"];
}

export interface TaskLoopSummary {
  id: string;
  taskId: string | null;
  taskEnvId: string | null;
  status: "running" | "waiting-for-change" | "completed" | "max-iterations";
  iterations: number;
  updatedAt: string;
}

export interface TaskStatusSummary {
  analyze: {
    runId: string | null;
    status: string | null;
    scope: string | null;
    progress: AnalyzeProgressEvent | null;
    quarantine: {
      count: number;
      latestQuarantinedAt: string | null;
    };
  };
  tasks: TaskStatusEntry[];
  taskEnvs: TaskEnvManifest[];
  observations: TaskObservationSummary[];
  loops: TaskLoopSummary[];
}

export interface StartTaskResult {
  session: TaskSession;
  decisions: WorkflowDecisionSet;
  context: TaskContext;
  handoffPath: string;
  contextPath: string;
  decisionsPath: string;
}
