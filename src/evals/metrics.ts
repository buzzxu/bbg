export interface EvalCaseMetrics {
  workspaceAnalyzed?: boolean;
  workspaceKnowledgeRecorded?: boolean;
  hermesWorkflowInfluenced?: boolean;
  hermesRecoveryInfluenced?: boolean;
  hermesVerificationInfluenced?: boolean;
  collectEvidenceRecovery?: boolean;
  retryImplementRecovery?: boolean;
  manualReviewRequired?: boolean;
  autoRecoveryActionExecuted?: boolean;
  autonomyGuardrailTriggered?: boolean;
  budgetEscalationOccurred?: boolean;
  manualHandoffRequired?: boolean;
  taskCompleted?: boolean;
  verificationPassed?: boolean;
  verificationRecorded?: boolean;
  recoverySucceeded?: boolean;
  blocked?: boolean;
  evidenceRecovered?: boolean;
  hermesContextUsed?: boolean;
  loopBound?: boolean;
  loopCompleted?: boolean;
  runnerLaunched?: boolean;
  runnerFallbackSucceeded?: boolean;
  crossToolResumeSucceeded?: boolean;
}

export interface EvalExperimentMetrics {
  totalCases: number;
  passRate: number;
  workspaceAnalysisRate: number;
  workspaceKnowledgeRate: number;
  hermesWorkflowInfluenceRate: number;
  hermesRecoveryInfluenceRate: number;
  hermesVerificationInfluenceRate: number;
  collectEvidenceRecoveryRate: number;
  retryImplementRecoveryRate: number;
  manualReviewRate: number;
  autoRecoveryActionRate: number;
  autonomyGuardrailRate: number;
  budgetEscalationRate: number;
  manualHandoffRate: number;
  taskCompletionRate: number;
  firstPassVerificationRate: number;
  verificationRecordedRate: number;
  recoveryRate: number;
  blockedRate: number;
  evidenceRecoveryRate: number;
  hermesContextUsageRate: number;
  loopBoundRate: number;
  loopCompletionRate: number;
  runnerLaunchRate: number;
  runnerFallbackSuccessRate: number;
  crossToolResumeRate: number;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(4));
}

export function computeEvalMetrics(input: {
  totalCases: number;
  passed: number;
  caseMetrics: EvalCaseMetrics[];
}): EvalExperimentMetrics {
  const taskCases = input.caseMetrics.filter((metrics) =>
    metrics.workspaceAnalyzed !== undefined
    || metrics.workspaceKnowledgeRecorded !== undefined
    || metrics.hermesWorkflowInfluenced !== undefined
    || metrics.hermesRecoveryInfluenced !== undefined
    || metrics.hermesVerificationInfluenced !== undefined
    || metrics.collectEvidenceRecovery !== undefined
    || metrics.retryImplementRecovery !== undefined
    || metrics.manualReviewRequired !== undefined
    || metrics.autoRecoveryActionExecuted !== undefined
    || metrics.taskCompleted !== undefined
    || metrics.verificationPassed !== undefined
    || metrics.verificationRecorded !== undefined
    || metrics.recoverySucceeded !== undefined
    || metrics.blocked !== undefined
    || metrics.evidenceRecovered !== undefined
    || metrics.hermesContextUsed !== undefined
    || metrics.loopBound !== undefined
    || metrics.loopCompleted !== undefined
    || metrics.runnerLaunched !== undefined
    || metrics.runnerFallbackSucceeded !== undefined
    || metrics.crossToolResumeSucceeded !== undefined);

  return {
    totalCases: input.totalCases,
    passRate: ratio(input.passed, input.totalCases),
    workspaceAnalysisRate: ratio(taskCases.filter((metrics) => metrics.workspaceAnalyzed === true).length, taskCases.length),
    workspaceKnowledgeRate: ratio(taskCases.filter((metrics) => metrics.workspaceKnowledgeRecorded === true).length, taskCases.length),
    hermesWorkflowInfluenceRate: ratio(taskCases.filter((metrics) => metrics.hermesWorkflowInfluenced === true).length, taskCases.length),
    hermesRecoveryInfluenceRate: ratio(taskCases.filter((metrics) => metrics.hermesRecoveryInfluenced === true).length, taskCases.length),
    hermesVerificationInfluenceRate: ratio(taskCases.filter((metrics) => metrics.hermesVerificationInfluenced === true).length, taskCases.length),
    collectEvidenceRecoveryRate: ratio(taskCases.filter((metrics) => metrics.collectEvidenceRecovery === true).length, taskCases.length),
    retryImplementRecoveryRate: ratio(taskCases.filter((metrics) => metrics.retryImplementRecovery === true).length, taskCases.length),
    manualReviewRate: ratio(taskCases.filter((metrics) => metrics.manualReviewRequired === true).length, taskCases.length),
    autoRecoveryActionRate: ratio(taskCases.filter((metrics) => metrics.autoRecoveryActionExecuted === true).length, taskCases.length),
    autonomyGuardrailRate: ratio(taskCases.filter((metrics) => metrics.autonomyGuardrailTriggered === true).length, taskCases.length),
    budgetEscalationRate: ratio(taskCases.filter((metrics) => metrics.budgetEscalationOccurred === true).length, taskCases.length),
    manualHandoffRate: ratio(taskCases.filter((metrics) => metrics.manualHandoffRequired === true).length, taskCases.length),
    taskCompletionRate: ratio(taskCases.filter((metrics) => metrics.taskCompleted === true).length, taskCases.length),
    firstPassVerificationRate: ratio(taskCases.filter((metrics) => metrics.verificationPassed === true).length, taskCases.length),
    verificationRecordedRate: ratio(taskCases.filter((metrics) => metrics.verificationRecorded === true).length, taskCases.length),
    recoveryRate: ratio(taskCases.filter((metrics) => metrics.recoverySucceeded === true).length, taskCases.length),
    blockedRate: ratio(taskCases.filter((metrics) => metrics.blocked === true).length, taskCases.length),
    evidenceRecoveryRate: ratio(taskCases.filter((metrics) => metrics.evidenceRecovered === true).length, taskCases.length),
    hermesContextUsageRate: ratio(taskCases.filter((metrics) => metrics.hermesContextUsed === true).length, taskCases.length),
    loopBoundRate: ratio(taskCases.filter((metrics) => metrics.loopBound === true).length, taskCases.length),
    loopCompletionRate: ratio(taskCases.filter((metrics) => metrics.loopCompleted === true).length, taskCases.length),
    runnerLaunchRate: ratio(taskCases.filter((metrics) => metrics.runnerLaunched === true).length, taskCases.length),
    runnerFallbackSuccessRate: ratio(taskCases.filter((metrics) => metrics.runnerFallbackSucceeded === true).length, taskCases.length),
    crossToolResumeRate: ratio(taskCases.filter((metrics) => metrics.crossToolResumeSucceeded === true).length, taskCases.length),
  };
}
