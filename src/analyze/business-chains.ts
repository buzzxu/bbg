import type { AnalyzeCriticalFlow, AnalyzeEvidenceNote, AnalyzeKnowledgeModel, AnalyzeWorkflowStep } from "./types.js";

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function inferTrigger(flow: AnalyzeCriticalFlow): string {
  return flow.trigger ?? flow.steps[0]?.action ?? flow.summary;
}

function inferActor(flow: AnalyzeCriticalFlow): string {
  if (flow.primaryActor) {
    return flow.primaryActor;
  }
  const summary = flow.summary.toLowerCase();
  if (/(admin|operator|ops)/.test(summary)) {
    return "operator";
  }
  if (/(system|job|schedule|sync)/.test(summary)) {
    return "system";
  }
  return "user";
}

function inferBusinessObject(flow: AnalyzeCriticalFlow): string {
  return flow.businessObject ?? flow.participatingModules[0] ?? flow.participatingRepos[0] ?? flow.name;
}

function makeEvidence(summary: string, signals: string[]): AnalyzeEvidenceNote {
  return { summary, signals: unique(signals) };
}

function withKind(step: AnalyzeWorkflowStep, kind: "sync" | "async" | "manual"): AnalyzeWorkflowStep {
  return { ...step, kind };
}

export function deriveAnalyzeBusinessChains(model: AnalyzeKnowledgeModel): AnalyzeCriticalFlow[] {
  return model.criticalFlows.map((flow) => {
    const syncSteps = flow.syncSteps?.length ? flow.syncSteps : flow.steps.map((step) => withKind(step, "sync"));
    const asyncSteps = flow.asyncSteps ?? [];
    const manualSteps = flow.manualSteps ?? [];
    const businessObject = inferBusinessObject(flow);
    const trigger = inferTrigger(flow);
    const primaryActor = inferActor(flow);
    const stateTransitions = flow.stateTransitions?.length
      ? flow.stateTransitions
      : [
          {
            businessObject,
            fromState: "initiated",
            toState: flow.failurePoints.length > 0 ? "completed-or-blocked" : "completed",
            trigger,
            evidence: makeEvidence("Inferred from critical flow sequencing and participating contracts.", [
              ...flow.contracts,
              ...flow.participatingRepos.map((repo) => `repo:${repo}`),
            ]),
          },
        ];
    const failureBranches = flow.failureBranches?.length
      ? flow.failureBranches
      : flow.failurePoints.map((point) => ({
          title: point,
          condition: `Failure hotspot encountered in ${point}`,
          impact: `${businessObject} flow may stall or require manual recovery.`,
          mitigation: `Review contracts ${flow.contracts.join(", ") || "and runtime safeguards"} before changing this path.`,
          evidence: makeEvidence("Derived from risk hotspots attached to this flow.", [point, ...flow.contracts]),
        }));

    return {
      ...flow,
      trigger,
      primaryActor,
      businessObject,
      goal: flow.goal ?? flow.summary,
      preconditions:
        flow.preconditions ??
        unique([
          `Actor ${primaryActor} reaches ${trigger}.`,
          ...flow.contracts.map((contract) => `Contract ready: ${contract}`),
        ]),
      syncSteps,
      asyncSteps,
      manualSteps,
      stateTransitions,
      failureBranches,
      compensations:
        flow.compensations ??
        (failureBranches.length > 0
          ? [
              `Add rollback or retry handling around ${businessObject}.`,
              `Confirm observability for ${flow.participatingRepos.join(", ") || businessObject}.`,
            ]
          : []),
      invariants:
        flow.invariants ??
        unique([
          `${businessObject} must cross ${flow.participatingRepos.length} repository boundary(ies) consistently.`,
          ...(flow.contracts.length > 0 ? flow.contracts.map((contract) => `Contract respected: ${contract}`) : []),
        ]),
      observabilityHints:
        flow.observabilityHints ??
        unique([
          `Trace ${businessObject} across ${flow.participatingRepos.join(" -> ") || "the active repo path"}.`,
          ...(flow.failurePoints.length > 0 ? flow.failurePoints.map((point) => `Alert on ${point}.`) : []),
        ]),
    };
  });
}
