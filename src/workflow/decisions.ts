import type { WorkflowDecision, WorkflowDecisionSet } from "./types.js";

function buildDecision(decision: WorkflowDecision["decision"], reasons: string[]): WorkflowDecision {
  return {
    decision,
    reasons,
  };
}

function includesAny(haystack: string, patterns: string[]): boolean {
  return patterns.some((pattern) => haystack.includes(pattern));
}

export function buildWorkflowDecisions(kind: "plan" | "review" | "security" | "tdd", task?: string): WorkflowDecisionSet {
  const normalizedTask = task?.trim().toLowerCase() ?? "";

  const mentionsDebugWork = includesAny(normalizedTask, [
    "fix",
    "debug",
    "stabilize",
    "investigate",
    "reproduce",
    "incident",
    "timeout",
    "latency",
    "flaky",
  ]);
  const mentionsCrossCuttingScope = includesAny(normalizedTask, [
    "across",
    "multiple",
    "frontend and backend",
    "cross repo",
    "cross-repo",
    "integration",
    "workspace",
  ]);
  const mentionsFrontendSurface = includesAny(normalizedTask, [
    "frontend",
    "ui",
    "screen",
    "page",
    "component",
    "browser",
    "dom",
    "layout",
    "css",
    "visual",
    "screenshot",
  ]);
  const mentionsRuntimeEvidence = includesAny(normalizedTask, [
    "ui",
    "screenshot",
    "dom",
    "log",
    "metric",
    "trace",
    "latency",
    "performance",
    "flaky",
    "regression",
  ]);
  const mentionsInfrastructureOrDataWork = includesAny(normalizedTask, [
    "database",
    "schema",
    "migration",
    "sql",
    "deploy",
    "deployment",
    "ci",
    "pipeline",
    "docker",
    "kubernetes",
    "infra",
    "infrastructure",
  ]);
  const mentionsSecuritySurface = includesAny(normalizedTask, [
    "auth",
    "permission",
    "secret",
    "token",
    "payment",
    "webhook",
    "input validation",
    "sanitize",
    "security",
  ]);
  const mentionsFeatureDelivery = includesAny(normalizedTask, [
    "new feature",
    "feature",
    "implement",
    "support",
    "introduce",
    "build",
    "create",
  ]);
  const mentionsRefactorRisk = includesAny(normalizedTask, [
    "refactor",
    "cleanup",
    "simplify",
    "extract",
    "rename",
    "migrate",
  ]);
  const mentionsTesting = includesAny(normalizedTask, [
    "test",
    "regression",
    "coverage",
    "bug",
    "fix",
    "feature",
  ]);
  const mentionsRepeatedVerification = includesAny(normalizedTask, [
    "flaky",
    "intermittent",
    "watch",
    "stabilize",
    "re-run",
    "rerun",
    "verify repeatedly",
  ]);
  const mentionsPriorKnowledgeNeed = includesAny(normalizedTask, [
    "again",
    "similar",
    "recurring",
    "repeat",
    "repeated",
    "incident",
    "pattern",
  ]);

  const taskEnvReasons = [
    ...(mentionsDebugWork ? ["debug-or-stabilization-task"] : []),
    ...(mentionsCrossCuttingScope ? ["cross-cutting-scope"] : []),
    ...(mentionsRuntimeEvidence ? ["runtime-evidence-expected"] : []),
    ...(mentionsInfrastructureOrDataWork ? ["infrastructure-or-data-work"] : []),
  ];
  const observeReasons = [
    ...(mentionsRuntimeEvidence ? ["runtime-evidence-useful"] : []),
    ...(mentionsDebugWork ? ["debug-investigation"] : []),
    ...(mentionsFrontendSurface && !mentionsRuntimeEvidence ? ["frontend-surface-verification"] : []),
  ];
  const tddReasons = [
    ...(kind === "tdd" ? ["workflow-requested-tdd"] : []),
    ...(mentionsTesting ? ["testing-or-regression-signal"] : []),
    ...((mentionsFeatureDelivery || mentionsRefactorRisk || mentionsCrossCuttingScope) ? ["change-risk-needs-regression-coverage"] : []),
  ];
  const securityReasons = [
    ...(kind === "security" ? ["workflow-requested-security-review"] : []),
    ...(mentionsSecuritySurface ? ["security-sensitive-surface"] : []),
  ];
  const loopReasons = [
    ...(mentionsRepeatedVerification ? ["repeated-verification-likely"] : []),
    ...(mentionsRuntimeEvidence && mentionsDebugWork ? ["runtime-checks-may-repeat"] : []),
    ...(mentionsInfrastructureOrDataWork && mentionsDebugWork ? ["environment-validation-may-repeat"] : []),
  ];
  const hermesReasons = [
    ...(kind === "plan" ? ["plan-benefits-from-local-history"] : []),
    ...(mentionsPriorKnowledgeNeed ? ["similar-or-recurring-work"] : []),
    ...((mentionsCrossCuttingScope || mentionsRefactorRisk || mentionsInfrastructureOrDataWork) ? ["architecture-or-integration-context-useful"] : []),
  ];

  return {
    taskEnv: buildDecision(taskEnvReasons.length > 0 ? "required" : "not-required", taskEnvReasons),
    observe: buildDecision(
      observeReasons.length > 0 ? (mentionsRuntimeEvidence || mentionsFrontendSurface ? "required" : "optional") : "not-required",
      observeReasons,
    ),
    tdd: buildDecision(tddReasons.length > 0 ? "required" : "optional", tddReasons),
    security: buildDecision(securityReasons.length > 0 ? "required" : "not-required", securityReasons),
    loop: buildDecision(loopReasons.length > 0 ? "optional" : "not-required", loopReasons),
    hermesQuery: buildDecision(hermesReasons.length > 0 ? "recommended" : "not-required", hermesReasons),
  };
}
