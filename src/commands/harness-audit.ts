import { join } from "node:path";
import type { BbgConfig } from "../config/schema.js";
import { parseConfig } from "../config/read-write.js";
import { runHarnessRuntimeChecks, type DoctorCheckResult } from "../doctor/checks.js";
import { createDefaultPolicyDecision } from "../policy/defaults.js";
import { evaluatePolicy, getPolicyCoverageReport, type PolicyCoverageReport } from "../policy/engine.js";
import { POLICY_COMMANDS } from "../policy/schema.js";
import { resolveRuntimePaths } from "../runtime/paths.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import { exists, readTextFile } from "../utils/fs.js";

export interface HarnessAuditCommandResult {
  runtime: {
    configured: boolean;
    policyEnabled: boolean;
    policyFile: string;
    telemetryEnabled: boolean;
    telemetryFile: string;
    evaluationEnabled: boolean;
    evaluationFile: string;
    contextEnabled: boolean;
    repoMapFile: string;
    sessionHistoryFile: string;
  };
  policy: {
    source: "authored" | "generated" | "disabled";
    explicitCommands: string[];
    defaultedCommands: string[];
    blockedCommands: string[];
    approvalRequiredCommands: string[];
    auditState: "allowed" | "blocked" | "approval-required" | "invalid";
    auditMessage: string;
  };
  checks: DoctorCheckResult[];
  summary: {
    warnings: number;
    gaps: string[];
  };
}

async function loadConfig(cwd: string): Promise<BbgConfig> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  return parseConfig(await readTextFile(configPath));
}

export async function runHarnessAuditCommand(input: { cwd: string }): Promise<HarnessAuditCommandResult> {
  const config = await loadConfig(input.cwd);
  const runtime = config.runtime ?? buildDefaultRuntimeConfig();
  const runtimePaths = resolveRuntimePaths(input.cwd, runtime);
  let auditState: HarnessAuditCommandResult["policy"]["auditState"] = "allowed";
  let auditMessage = "Harness audit allowed by policy.";

  try {
    const auditDecision = await evaluatePolicy({ cwd: input.cwd, runtime, command: "harness-audit" });
    if (!auditDecision.allowed) {
      throw new Error(`Policy blocked 'harness-audit': ${auditDecision.reason}`);
    }
    if (auditDecision.requiredApproval) {
      auditState = "approval-required";
      auditMessage = `Approval required for 'harness-audit': ${auditDecision.reason}`;
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("Policy blocked 'harness-audit'")) {
      throw error;
    }

    auditState = "invalid";
    auditMessage = `invalid policy store: ${runtime.policy.file}`;
  }

  let coverage: PolicyCoverageReport = {
    decisions: Object.fromEntries(POLICY_COMMANDS.map((command) => [command, createDefaultPolicyDecision()])) as PolicyCoverageReport["decisions"],
    source: runtime.policy.enabled ? "generated" : "disabled",
    explicitCommands: [],
    defaultedCommands: [...POLICY_COMMANDS],
  };
  const checks = await runHarnessRuntimeChecks({ cwd: input.cwd, config, runtime });

  try {
    coverage = await getPolicyCoverageReport({ cwd: input.cwd, runtime });
  } catch {
    auditState = "invalid";
    auditMessage = `invalid policy store: ${runtime.policy.file}`;
  }

  const gaps = checks
    .filter((check) => !check.passed)
    .map((check) => `${check.id}: ${check.message}`);
  if (auditState !== "allowed") {
    gaps.push(`policy: ${auditMessage}`);
  }

  return {
    runtime: {
      configured: config.runtime !== undefined,
      policyEnabled: runtime.policy.enabled,
      policyFile: runtime.policy.file,
      telemetryEnabled: runtime.telemetry.enabled,
      telemetryFile: runtime.telemetry.file,
      evaluationEnabled: runtime.evaluation.enabled,
      evaluationFile: runtime.evaluation.file,
      contextEnabled: runtime.context.enabled,
      repoMapFile: runtimePaths.repoMap,
      sessionHistoryFile: runtimePaths.sessionHistory,
    },
    policy: {
      source: coverage.source,
      explicitCommands: coverage.explicitCommands,
      defaultedCommands: coverage.defaultedCommands,
      blockedCommands: Object.entries(coverage.decisions)
        .filter(([, decision]) => !decision.allowed)
        .map(([command]) => command),
      approvalRequiredCommands: Object.entries(coverage.decisions)
        .filter(([, decision]) => decision.requiredApproval)
        .map(([command]) => command),
      auditState,
      auditMessage,
    },
    checks,
    summary: {
      warnings: gaps.length,
      gaps,
    },
  };
}
