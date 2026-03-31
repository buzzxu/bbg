import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import { parseConfig } from "../config/read-write.js";
import { sha256Hex, type FileHashRecord } from "../config/hash.js";
import type { BbgConfig } from "../config/schema.js";
import { exists, readTextFile } from "../utils/fs.js";

export type DoctorSeverity = "error" | "warning" | "info";

export interface DoctorCheckResult {
  id: string;
  checkId: string;
  severity: DoctorSeverity;
  passed: boolean;
  message: string;
}

export interface DoctorChecksOptions {
  cwd: string;
  governanceOnly?: boolean;
  workspace?: boolean;
}

export interface DoctorChecksRunResult {
  checks: DoctorCheckResult[];
  config: BbgConfig | null;
}

const WORKFLOW_DOCS = [
  "docs/workflows/code-review-policy.md",
  "docs/workflows/cross-audit-policy.md",
  "docs/workflows/harness-engineering-playbook.md",
  "docs/workflows/ai-task-prompt-template.md",
  "docs/workflows/requirement-template.md",
  "docs/workflows/regression-checklist.md",
  "docs/workflows/development-standards.md",
  "docs/workflows/release-checklist.md",
];

const TASK_TEMPLATES = ["docs/tasks/TEMPLATE.md", "docs/changes/TEMPLATE.md", "docs/handoffs/TEMPLATE.md"];

const REQUIRED_SCRIPTS = ["scripts/doctor.py", "scripts/sync_versions.py"];
const REQUIRED_HOOKS = [".githooks/pre-commit", ".githooks/pre-push"];

function buildCheck(
  id: string,
  severity: DoctorSeverity,
  passed: boolean,
  message: string,
): DoctorCheckResult {
  return { id, checkId: id, severity, passed, message };
}

async function isExecutable(pathValue: string): Promise<boolean> {
  if (process.platform === "win32") {
    return exists(pathValue);
  }

  try {
    await access(pathValue, fsConstants.F_OK | fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function checkManyExist(cwd: string, relativePaths: string[]): Promise<{ missing: string[] }> {
  const missing: string[] = [];
  for (const relativePath of relativePaths) {
    if (!(await exists(join(cwd, relativePath)))) {
      missing.push(relativePath);
    }
  }

  return { missing };
}

function expectedRepoIgnoreEntries(config: BbgConfig | null): string[] {
  if (!config) {
    return [];
  }

  const seen = new Set<string>();
  const entries: string[] = [];
  for (const repo of config.repos) {
    const name = repo.name.trim().replace(/^\/+|\/+$/g, "");
    if (name.length === 0 || seen.has(name)) {
      continue;
    }

    seen.add(name);
    entries.push(`${name}/`);
  }

  return entries;
}

async function runHashIntegrityCheck(cwd: string): Promise<DoctorCheckResult> {
  const hashesPath = join(cwd, ".bbg", "file-hashes.json");
  if (!(await exists(hashesPath))) {
    return buildCheck("hash-integrity", "info", false, "missing .bbg/file-hashes.json");
  }

  let record: FileHashRecord;
  try {
    record = JSON.parse(await readTextFile(hashesPath)) as FileHashRecord;
  } catch {
    return buildCheck("hash-integrity", "info", false, "unable to parse .bbg/file-hashes.json");
  }

  const mismatched: string[] = [];
  for (const [relativePath, entry] of Object.entries(record)) {
    if (!entry || typeof entry.generatedHash !== "string") {
      mismatched.push(relativePath);
      continue;
    }

    const absolutePath = join(cwd, relativePath);
    if (!(await exists(absolutePath))) {
      mismatched.push(relativePath);
      continue;
    }

    const currentContent = await readTextFile(absolutePath);
    if (sha256Hex(currentContent) !== entry.generatedHash) {
      mismatched.push(relativePath);
    }
  }

  return buildCheck(
    "hash-integrity",
    "info",
    mismatched.length === 0,
    mismatched.length === 0 ? "all tracked generated files match stored hashes" : `${mismatched.length} tracked files differ from hashes`,
  );
}

async function runAiFillMarkersCheck(cwd: string): Promise<DoctorCheckResult> {
  const files = await fg("docs/**/*.md", { cwd, absolute: true, onlyFiles: true, dot: false });
  let markerCount = 0;
  for (const filePath of files) {
    const content = await readTextFile(filePath);
    const matches = content.match(/<!--\s*AI-FILL(?:\s*:[\s\S]*?)?\s*-->/g);
    markerCount += matches?.length ?? 0;
  }

  return buildCheck(
    "ai-fill-markers",
    "info",
    markerCount === 0,
    markerCount === 0 ? "no AI-FILL markers found" : `${markerCount} AI-FILL markers remain`,
  );
}

export async function runDoctorChecks(options: DoctorChecksOptions): Promise<DoctorChecksRunResult> {
  const checks: DoctorCheckResult[] = [];
  const configPath = join(options.cwd, ".bbg", "config.json");
  const rootAgentsPath = join(options.cwd, "AGENTS.md");
  const rootReadmePath = join(options.cwd, "README.md");

  const hasConfig = await exists(configPath);
  checks.push(buildCheck("config-exists", "error", hasConfig, ".bbg/config.json exists"));

  let config: BbgConfig | null = null;
  if (hasConfig) {
    try {
      config = parseConfig(await readTextFile(configPath));
      checks.push(buildCheck("config-schema", "error", true, "config schema is valid"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push(buildCheck("config-schema", "error", false, `config schema is invalid: ${message}`));
    }
  } else {
    checks.push(buildCheck("config-schema", "error", false, "config schema cannot be validated without config file"));
  }

  checks.push(buildCheck("root-agents-md", "error", await exists(rootAgentsPath), "root AGENTS.md exists"));
  checks.push(buildCheck("root-readme", "error", await exists(rootReadmePath), "root README.md exists"));

  const includeWorkspaceChecks = options.workspace === true && options.governanceOnly !== true;

  if (options.governanceOnly) {
    checks.push(buildCheck("child-agents-md", "error", true, "skipped in governance-only mode"));
  } else if (config) {
    const missingRepoDirs: string[] = [];
    const missingChildAgents: string[] = [];
    for (const repo of config.repos) {
      const repoDir = join(options.cwd, repo.name);
      const repoDirExists = await exists(repoDir);
      if (!repoDirExists && includeWorkspaceChecks) {
        missingRepoDirs.push(repo.name);
      }

      if (!(await exists(join(repoDir, "AGENTS.md")))) {
        missingChildAgents.push(repo.name);
      }
    }

    checks.push(
      buildCheck(
        "child-agents-md",
        "error",
        missingChildAgents.length === 0,
        missingChildAgents.length === 0
          ? "all repo AGENTS.md files exist"
          : `missing AGENTS.md for repos: ${missingChildAgents.join(", ")}`,
      ),
    );
    if (includeWorkspaceChecks) {
      checks.push(
        buildCheck(
          "repo-dirs-exist",
          "error",
          missingRepoDirs.length === 0,
          missingRepoDirs.length === 0
            ? "all configured repo directories exist"
            : `missing repo directories: ${missingRepoDirs.join(", ")}`,
        ),
      );
    }
  } else {
    checks.push(buildCheck("child-agents-md", "error", false, "cannot validate without valid config"));
    if (includeWorkspaceChecks) {
      checks.push(buildCheck("repo-dirs-exist", "error", false, "cannot validate without valid config"));
    }
  }

  const workflowDocsResult = await checkManyExist(options.cwd, WORKFLOW_DOCS);
  checks.push(
    buildCheck(
      "workflow-docs",
      "warning",
      workflowDocsResult.missing.length === 0,
      workflowDocsResult.missing.length === 0
        ? "workflow docs exist"
        : `missing workflow docs: ${workflowDocsResult.missing.join(", ")}`,
    ),
  );

  const taskTemplatesResult = await checkManyExist(options.cwd, TASK_TEMPLATES);
  checks.push(
    buildCheck(
      "task-templates",
      "warning",
      taskTemplatesResult.missing.length === 0,
      taskTemplatesResult.missing.length === 0
        ? "task templates exist"
        : `missing task templates: ${taskTemplatesResult.missing.join(", ")}`,
    ),
  );

  const missingScripts: string[] = [];
  for (const scriptPath of REQUIRED_SCRIPTS) {
    if (!(await isExecutable(join(options.cwd, scriptPath)))) {
      missingScripts.push(scriptPath);
    }
  }
  checks.push(
    buildCheck(
      "scripts-exist",
      "warning",
      missingScripts.length === 0,
      missingScripts.length === 0 ? "scripts exist and are executable" : `missing or non-executable scripts: ${missingScripts.join(", ")}`,
    ),
  );

  const missingHooks: string[] = [];
  for (const hookPath of REQUIRED_HOOKS) {
    if (!(await isExecutable(join(options.cwd, hookPath)))) {
      missingHooks.push(hookPath);
    }
  }
  checks.push(
    buildCheck(
      "githooks-exist",
      "warning",
      missingHooks.length === 0,
      missingHooks.length === 0 ? "githooks exist and are executable" : `missing or non-executable hooks: ${missingHooks.join(", ")}`,
    ),
  );

  const expectedEntries = expectedRepoIgnoreEntries(config);
  const gitignorePath = join(options.cwd, ".gitignore");
  if (!(await exists(gitignorePath))) {
    checks.push(buildCheck("gitignore-repos", "warning", false, ".gitignore is missing"));
  } else {
    const lines = (await readTextFile(gitignorePath)).split(/\r?\n/).map((line) => line.trim());
    const missingEntries = expectedEntries.filter((entry) => !lines.includes(entry));
    checks.push(
      buildCheck(
        "gitignore-repos",
        "warning",
        missingEntries.length === 0,
        missingEntries.length === 0
          ? "all configured repos are ignored in .gitignore"
          : `missing .gitignore entries: ${missingEntries.join(", ")}`,
      ),
    );
  }

  if (includeWorkspaceChecks) {
    checks.push(await runHashIntegrityCheck(options.cwd));
  }

  checks.push(await runAiFillMarkersCheck(options.cwd));

  return { checks, config };
}
