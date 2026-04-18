export type WorkflowKind = "plan" | "review" | "security" | "tdd";

export type WorkflowDecisionValue = "required" | "optional" | "not-required" | "recommended";

export interface WorkflowDecision {
  decision: WorkflowDecisionValue;
  reasons: string[];
}

export interface WorkflowDecisionSet {
  taskEnv: WorkflowDecision;
  observe: WorkflowDecision;
  tdd: WorkflowDecision;
  security: WorkflowDecision;
  loop: WorkflowDecision;
  hermesQuery: WorkflowDecision;
}
