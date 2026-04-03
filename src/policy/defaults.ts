import { POLICY_COMMANDS, type PolicyCommandName, type PolicyDecision, type PolicyDocument } from "./schema.js";

const DEFAULT_REASON = "Allowed by local default policy.";

export function createDefaultPolicyDecision(): PolicyDecision {
  return {
    allowed: true,
    requiredApproval: false,
    reason: DEFAULT_REASON,
  };
}

export function createDefaultPolicyDocument(): PolicyDocument {
  return {
    version: 1,
    provenance: {
      source: "generated",
    },
    commands: Object.fromEntries(POLICY_COMMANDS.map((command) => [command, createDefaultPolicyDecision()])) as Record<
      PolicyCommandName,
      PolicyDecision
    >,
  };
}
