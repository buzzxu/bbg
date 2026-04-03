import { resolveRuntimePaths } from "../runtime/paths.js";
import type { RuntimeConfig } from "../runtime/schema.js";
import { exists } from "../utils/fs.js";
import { readJsonStore, writeJsonStore } from "../runtime/store.js";
import { createDefaultPolicyDecision, createDefaultPolicyDocument } from "./defaults.js";
import { isPolicyDocument, POLICY_COMMANDS, type PolicyCommandName, type PolicyDecision, type PolicyDocument } from "./schema.js";

export interface EvaluatePolicyInput {
  cwd: string;
  runtime: RuntimeConfig;
  command: PolicyCommandName;
}

export interface PolicyCoverageReport {
  decisions: Record<PolicyCommandName, PolicyDecision>;
  source: "authored" | "generated" | "disabled";
  explicitCommands: PolicyCommandName[];
  defaultedCommands: PolicyCommandName[];
}

async function readPolicyDocument(cwd: string, runtime: RuntimeConfig): Promise<PolicyDocument> {
  const policyPath = resolveRuntimePaths(cwd, runtime).policy;
  const fallback = createDefaultPolicyDocument();

  if (!(await exists(policyPath))) {
    await writeJsonStore(policyPath, fallback);
    return fallback;
  }

  return readJsonStore(policyPath, fallback, isPolicyDocument);
}

function toDecision(document: PolicyDocument, command: PolicyCommandName): PolicyDecision {
  return document.commands[command] ?? createDefaultPolicyDecision();
}

function hasGeneratedDefaultPolicy(document: PolicyDocument): boolean {
  return document.provenance?.source === "generated";
}

function isDefaultDecision(decision: PolicyDecision): boolean {
  const defaultDecision = createDefaultPolicyDecision();
  return decision.allowed === defaultDecision.allowed
    && decision.requiredApproval === defaultDecision.requiredApproval
    && decision.reason === defaultDecision.reason;
}

function getCoverageSource(document: PolicyDocument): PolicyCoverageReport["source"] {
  if (!hasGeneratedDefaultPolicy(document)) {
    return "authored";
  }

  return Object.values(document.commands).some((decision) => !isDefaultDecision(decision)) ? "authored" : "generated";
}

function createCoverageReport(
  document: PolicyDocument,
  source: PolicyCoverageReport["source"],
): PolicyCoverageReport {
  const decisions = Object.fromEntries(POLICY_COMMANDS.map((command) => [command, toDecision(document, command)])) as Record<
    PolicyCommandName,
    PolicyDecision
  >;
  const explicitCommands = source === "authored"
    ? hasGeneratedDefaultPolicy(document)
      ? Object.entries(document.commands)
        .filter(([, decision]) => !isDefaultDecision(decision))
        .map(([command]) => command as PolicyCommandName)
      : Object.keys(document.commands) as PolicyCommandName[]
    : [];

  return {
    decisions,
    source,
    explicitCommands,
    defaultedCommands: POLICY_COMMANDS.filter((command) => !explicitCommands.includes(command)),
  };
}

export async function evaluatePolicy(input: EvaluatePolicyInput): Promise<PolicyDecision> {
  if (!input.runtime.policy.enabled) {
    return createDefaultPolicyDecision();
  }

  const document = await readPolicyDocument(input.cwd, input.runtime);
  return toDecision(document, input.command);
}

export async function assertPolicyAllowsCommand(input: EvaluatePolicyInput): Promise<PolicyDecision> {
  const decision = await evaluatePolicy(input);

  if (!decision.allowed) {
    throw new Error(`Policy blocked '${input.command}': ${decision.reason}`);
  }

  if (decision.requiredApproval) {
    throw new Error(`Policy requires approval for '${input.command}': ${decision.reason}`);
  }

  return decision;
}

export async function getPolicyCoverageReport(input: { cwd: string; runtime: RuntimeConfig }): Promise<PolicyCoverageReport> {
  if (!input.runtime.policy.enabled) {
    return createCoverageReport(createDefaultPolicyDocument(), "disabled");
  }

  const policyPath = resolveRuntimePaths(input.cwd, input.runtime).policy;
  if (!(await exists(policyPath))) {
    return createCoverageReport(createDefaultPolicyDocument(), "generated");
  }

  const document = await readJsonStore(policyPath, createDefaultPolicyDocument(), isPolicyDocument);
  return createCoverageReport(document, getCoverageSource(document));
}
