export const POLICY_COMMANDS = ["quality-gate", "checkpoint", "verify", "harness-audit"] as const;

export type PolicyCommandName = (typeof POLICY_COMMANDS)[number];

export interface PolicyDecision {
  allowed: boolean;
  requiredApproval: boolean;
  reason: string;
}

export interface PolicyDocument {
  version: number;
  commands: Partial<Record<PolicyCommandName, PolicyDecision>>;
  provenance?: {
    source: "generated";
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPolicyDecision(value: unknown): value is PolicyDecision {
  return isRecord(value)
    && typeof value.allowed === "boolean"
    && typeof value.requiredApproval === "boolean"
    && typeof value.reason === "string";
}

export function isPolicyDocument(value: unknown): value is PolicyDocument {
  if (!isRecord(value) || typeof value.version !== "number" || !isRecord(value.commands)) {
    return false;
  }

  if (
    "provenance" in value
    && (!isRecord(value.provenance) || value.provenance.source !== "generated")
  ) {
    return false;
  }

  return Object.entries(value.commands).every(([command, decision]) =>
    POLICY_COMMANDS.includes(command as PolicyCommandName) && isPolicyDecision(decision),
  );
}
