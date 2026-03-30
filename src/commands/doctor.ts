import { applyDoctorFixes } from "../doctor/fix.js";
import { runDoctorChecks, type DoctorCheckResult } from "../doctor/checks.js";

export interface RunDoctorInput {
  cwd: string;
  json?: boolean;
  fix?: boolean;
  governanceOnly?: boolean;
  workspace?: boolean;
}

export interface RunDoctorResult {
  ok: boolean;
  mode: "full";
  checks: DoctorCheckResult[];
  errors: DoctorCheckResult[];
  warnings: DoctorCheckResult[];
  info: DoctorCheckResult[];
  exitCode: 0 | 1;
  fixesApplied: string[];
}

export async function runDoctor(input: RunDoctorInput): Promise<RunDoctorResult> {
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

  return {
    ok,
    mode: "full",
    checks,
    errors,
    warnings,
    info,
    exitCode: ok ? 0 : 1,
    fixesApplied,
  };
}
