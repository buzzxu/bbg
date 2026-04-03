import { execa } from "execa";
import type { RepoEntry } from "../config/schema.js";
import { resolveRuntimeCommands } from "./commands.js";
import { readTextFile } from "../utils/fs.js";
import type { RuntimeConfig, RuntimeCommandCheckName } from "./schema.js";
import { appendRuntimeCommandRun } from "./sessions.js";
import { collectWorkspaceFiles, toWorkspaceRelativePath } from "./workspace-files.js";

export type QualityGateCheckName = RuntimeCommandCheckName | "security";

export interface QualityGateCheckResult {
  name: QualityGateCheckName;
  command: string;
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface QualityGateResult {
  ok: boolean;
  checks: Record<QualityGateCheckName, QualityGateCheckResult>;
}

const SECRET_PATTERNS = [
  /sk_(?:live|test)_[A-Za-z0-9_]+/i,
  /(?:api[_-]?key|token|secret)\s*[:=]\s*["'][^"'\s]{8,}["']/i,
];

const SECURITY_SCAN_EXCLUDED_DIRECTORIES = new Set([
  "__fixtures__",
  "__tests__",
  "docs",
  "fixture",
  "fixtures",
  "test",
  "tests",
]);

function shouldSkipSecurityScanFile(relativePath: string): boolean {
  return relativePath
    .split("/")
    .some((segment) => SECURITY_SCAN_EXCLUDED_DIRECTORIES.has(segment));
}

function toErrorResult(name: RuntimeCommandCheckName, command: string, error: unknown): QualityGateCheckResult {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { exitCode?: number; stdout?: string; stderr?: string; message?: string };
    return {
      name,
      command,
      ok: false,
      exitCode: candidate.exitCode ?? 1,
      stdout: candidate.stdout ?? "",
      stderr: candidate.stderr ?? candidate.message ?? String(error),
    };
  }

  return {
    name,
    command,
    ok: false,
    exitCode: 1,
    stdout: "",
    stderr: String(error),
  };
}

export async function runRuntimeCommandCheck(cwd: string, name: RuntimeCommandCheckName): Promise<QualityGateCheckResult> {
  return runRuntimeCommandCheckWithConfig({ cwd, name, repos: [], runtime: {} });
}

export async function runRuntimeCommandCheckWithConfig(input: {
  cwd: string;
  name: RuntimeCommandCheckName;
  repos: RepoEntry[];
  runtime: Pick<RuntimeConfig, "commands">;
}): Promise<QualityGateCheckResult> {
  const definitions = resolveRuntimeCommands(input.cwd, input.repos, input.runtime.commands, input.name);
  let stdout = "";
  let stderr = "";

  for (const definition of definitions) {
    try {
      const result = await execa(definition.command, definition.args, { cwd: definition.cwd, reject: false });
      stdout = [stdout, result.stdout].filter((value) => value.length > 0).join("\n");
      stderr = [stderr, result.stderr].filter((value) => value.length > 0).join("\n");
      if (result.exitCode !== 0) {
        return {
          name: input.name,
          command: definitions.map((entry) => entry.displayCommand).join(" && "),
          ok: false,
          exitCode: result.exitCode ?? 1,
          stdout,
          stderr,
        };
      }
    } catch (error: unknown) {
      return toErrorResult(input.name, definition.displayCommand, error);
    }
  }

  return {
    name: input.name,
    command: definitions.map((entry) => entry.displayCommand).join(" && "),
    ok: true,
    exitCode: 0,
    stdout,
    stderr,
  };
}

export async function runSecurityCheck(cwd: string): Promise<QualityGateCheckResult> {
  const matchedFiles: string[] = [];
  const unreadableFiles: string[] = [];

  for (const filePath of await collectWorkspaceFiles(cwd)) {
    const relativePath = toWorkspaceRelativePath(cwd, filePath);
    if (shouldSkipSecurityScanFile(relativePath)) {
      continue;
    }

    try {
      const content = await readTextFile(filePath);
      if (SECRET_PATTERNS.some((pattern) => pattern.test(content))) {
        matchedFiles.push(relativePath);
      }
    } catch {
      unreadableFiles.push(relativePath);
      continue;
    }
  }

  const ok = matchedFiles.length === 0 && unreadableFiles.length === 0;
  const stdout = matchedFiles.length === 0 ? "No secret-like content detected." : matchedFiles.join("\n");
  const stderr = unreadableFiles.length === 0 ? "" : `Unreadable files during security scan:\n${unreadableFiles.join("\n")}`;

  return {
    name: "security",
    command: "phase1-security-scan",
    ok,
    exitCode: ok ? 0 : 1,
    stdout,
    stderr,
  };
}

export async function runQualityGate(input: { cwd: string; runtime: RuntimeConfig; repos: RepoEntry[] }): Promise<QualityGateResult> {
  const build = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "build", repos: input.repos, runtime: input.runtime });
  const typecheck = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "typecheck", repos: input.repos, runtime: input.runtime });
  const tests = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "tests", repos: input.repos, runtime: input.runtime });
  const lint = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "lint", repos: input.repos, runtime: input.runtime });
  const security = await runSecurityCheck(input.cwd);
  const checks = { build, typecheck, tests, lint, security };
  const ok = Object.values(checks).every((check) => check.ok);

  await appendRuntimeCommandRun(input.cwd, input.runtime, {
    command: "quality-gate",
    ok,
    details: {
      failedChecks: Object.values(checks)
        .filter((check) => !check.ok)
        .map((check) => check.name),
    },
  });

  return { ok, checks };
}
