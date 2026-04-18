import { applyDoctorFixes } from "../doctor/fix.js";
import { runDoctorChecks, type DoctorCheckResult } from "../doctor/checks.js";
import { runSelfChecks } from "../doctor/self-checks.js";
import type { ToolMatrixEntry } from "../adapters/layout.js";
import { analyzeToolMatrix } from "../adapters/matrix.js";
import { resolvePackageRoot } from "../utils/paths.js";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface RunDoctorInput {
  cwd: string;
  json?: boolean;
  fix?: boolean;
  governanceOnly?: boolean;
  workspace?: boolean;
  self?: boolean;
  toolMatrix?: boolean;
}

export interface RunDoctorResult {
  ok: boolean;
  mode: "full" | "self";
  checks: DoctorCheckResult[];
  errors: DoctorCheckResult[];
  warnings: DoctorCheckResult[];
  info: DoctorCheckResult[];
  exitCode: 0 | 1;
  fixesApplied: string[];
  toolMatrix?: ToolMatrixEntry[];
}

export async function runDoctor(input: RunDoctorInput): Promise<RunDoctorResult> {
  if (input.self) {
    const commandDir = dirname(fileURLToPath(import.meta.url));
    const packageRoot = await resolvePackageRoot(commandDir);
    const selfResult = await runSelfChecks(packageRoot);

    const errors = selfResult.checks.filter((c) => c.severity === "error" && !c.passed);
    const warnings = selfResult.checks.filter((c) => c.severity === "warning" && !c.passed);
    const info = selfResult.checks.filter((c) => c.severity === "info");

    return {
      ok: selfResult.ok,
      mode: "self",
      checks: selfResult.checks,
      errors,
      warnings,
      info,
      exitCode: selfResult.ok ? 0 : 1,
      fixesApplied: [],
    };
  }

  const firstPass = await runDoctorChecks({
    cwd: input.cwd,
    governanceOnly: input.governanceOnly ?? false,
      workspace: input.workspace ?? false,
    });

  let fixesApplied: string[] = [];
  let checks = firstPass.checks;
  if (input.fix) {
    const fixed = await applyDoctorFixes(input.cwd, firstPass.config);
    fixesApplied = fixed.changed;
    const secondPass = await runDoctorChecks({
      cwd: input.cwd,
      governanceOnly: input.governanceOnly ?? false,
      workspace: input.workspace ?? false,
    });
    checks = secondPass.checks;
  }

  const errors = checks.filter((check) => check.severity === "error" && !check.passed);
  const warnings = checks.filter((check) => check.severity === "warning" && !check.passed);
  const info = checks.filter((check) => check.severity === "info");
  const ok = errors.length === 0;
  const toolMatrix = input.toolMatrix ? await analyzeToolMatrix(input.cwd) : undefined;

  return {
    ok,
    mode: "full",
    checks,
    errors,
    warnings,
    info,
    exitCode: ok ? 0 : 1,
    fixesApplied,
    toolMatrix,
  };
}
