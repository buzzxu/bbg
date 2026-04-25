import { constants as fsConstants } from "node:fs";
import { access, readdir } from "node:fs/promises";
import { extname, isAbsolute, join } from "node:path";
import fg from "fast-glob";
import { getAllManagedLanguageGuidePaths, getLanguageGuidePathsForLanguages } from "../analyze/language-docs.js";
import { parseConfig } from "../config/read-write.js";
import { sha256Hex, type FileHashRecord } from "../config/hash.js";
import type { BbgConfig } from "../config/schema.js";
import { getPolicyCoverageReport } from "../policy/engine.js";
import { POLICY_COMMANDS } from "../policy/schema.js";
import { readAnalyzeQuarantineSummary } from "../runtime/analyze-quarantine.js";
import { readLatestAnalyzeRunState } from "../runtime/analyze-runs.js";
import { resolveRuntimeCommands } from "../runtime/commands.js";
import { resolveRuntimePaths } from "../runtime/paths.js";
import { buildDefaultRuntimeConfig, type RuntimeConfig } from "../runtime/schema.js";
import { readTelemetryDocument } from "../runtime/telemetry.js";
import { readWikiDoctorArtifacts } from "../runtime/wiki.js";
import { exists, readTextFile } from "../utils/fs.js";
import { expectedRepoIgnoreEntries } from "./shared.js";
import { extractManagedSection, isManagedAdapterPath } from "../adapters/managed.js";

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
const PRIMARY_COMMAND_DOCS = [
  ".bbg/harness/commands/analyze.md",
  ".bbg/harness/commands/start.md",
  ".bbg/harness/commands/resume.md",
  ".bbg/harness/commands/status.md",
  ".bbg/harness/commands/add-repo.md",
];

const REQUIRED_SCRIPTS = [".bbg/harness/scripts/doctor.py", ".bbg/harness/scripts/sync_versions.py"];
const REQUIRED_HOOKS = [".githooks/pre-commit", ".githooks/pre-push"];
const REQUIRED_RUNTIME_SCRIPTS = ["build", "typecheck", "test", "lint"] as const;
const SHELL_BUILTIN_COMMANDS = new Set([
  ".",
  ":",
  "[",
  "alias",
  "cd",
  "command",
  "echo",
  "eval",
  "exit",
  "export",
  "false",
  "hash",
  "printf",
  "pwd",
  "readonly",
  "set",
  "shift",
  "source",
  "test",
  "true",
  "type",
  "unalias",
]);

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
    if (isManagedAdapterPath(relativePath)) {
      const snapshotPath = join(cwd, ".bbg", "generated-snapshots", `${relativePath}.gen`);
      if (!(await exists(snapshotPath))) {
        mismatched.push(relativePath);
        continue;
      }
      const snapshotContent = await readTextFile(snapshotPath);
      const currentSection = extractManagedSection(currentContent);
      const snapshotSection = extractManagedSection(snapshotContent);
      if (currentSection === null || snapshotSection === null || currentSection !== snapshotSection) {
        mismatched.push(relativePath);
      }
      continue;
    }
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

async function runAnalyzeArtifactChecks(cwd: string, config: BbgConfig | null): Promise<DoctorCheckResult[]> {
  const state = await readLatestAnalyzeRunState(cwd);
  const quarantine = await readAnalyzeQuarantineSummary(cwd);
  const reposToCheck = state?.repos.length
    ? state.repos
    : (config?.repos.map((repo) => repo.name) ?? []);
  const wikiArtifacts = await readWikiDoctorArtifacts({
    cwd,
    repos: reposToCheck,
    hasAnalyzeState: state !== null,
  });
  const canonicalWikiCheck = buildCheck(
    "wiki-canonical-layer",
    "warning",
    wikiArtifacts.missingCanonical.length === 0,
    wikiArtifacts.missingCanonical.length === 0
      ? "wiki canonical layer exists"
      : `missing wiki canonical files: ${wikiArtifacts.missingCanonical.join(", ")}`,
  );
  if (state === null) {
    return [
      buildCheck("analyze-artifacts", "info", false, "analyze has not been run yet"),
      buildCheck("knowledge-artifacts", "info", false, "workspace knowledge has not been generated yet"),
      buildCheck("language-pattern-guides", "info", false, "language pattern guides have not been generated yet"),
      canonicalWikiCheck,
      buildCheck("wiki-generated-artifacts", "info", false, "wiki generated artifacts have not been created yet"),
      buildCheck(
        "analyze-quarantine",
        "warning",
        quarantine.count === 0,
        quarantine.count === 0
          ? "no quarantined analyze runtime state detected"
          : `analyze runtime state quarantined: ${quarantine.count} file(s), latest ${quarantine.latestQuarantinedAt ?? "unknown"}`,
      ),
    ];
  }

  const requiredDocs = reposToCheck.flatMap((repo) => [
    `docs/architecture/repos/${repo}.md`,
    `docs/repositories/${repo}.md`,
    `.bbg/knowledge/repos/${repo}/technical.json`,
    `.bbg/knowledge/repos/${repo}/business.json`,
    `.bbg/knowledge/repos/${repo}/patterns.json`,
  ]);
  const workspaceDocs = [
    "docs/architecture/technical-architecture.md",
    "docs/architecture/business-architecture.md",
    "docs/architecture/repo-dependency-graph.md",
    "docs/architecture/languages/README.md",
    "docs/architecture/workspace-topology.md",
    "docs/architecture/integration-map.md",
    "docs/architecture/integration-contracts.md",
    "docs/architecture/runtime-constraints.md",
    "docs/architecture/risk-surface.md",
    "docs/architecture/decision-history.md",
    "docs/architecture/change-impact-map.md",
    "docs/business/capability-map.md",
    "docs/business/critical-flows.md",
    "docs/business/domain-model.md",
    "docs/business/module-map.md",
    "docs/business/core-flows.md",
    "docs/business/project-context.md",
    ".bbg/knowledge/workspace/topology.json",
    ".bbg/knowledge/workspace/integration-map.json",
    ".bbg/knowledge/workspace/business-modules.json",
    ".bbg/knowledge/workspace/business-context.json",
    ".bbg/knowledge/workspace/constraints.json",
    ".bbg/knowledge/workspace/capabilities.json",
    ".bbg/knowledge/workspace/critical-flows.json",
    ".bbg/knowledge/workspace/contracts.json",
    ".bbg/knowledge/workspace/domain-model.json",
    ".bbg/knowledge/workspace/risk-surface.json",
    ".bbg/knowledge/workspace/decisions.json",
    ".bbg/knowledge/workspace/change-impact.json",
  ];
  const requiredLanguageDocs = getLanguageGuidePathsForLanguages(
    reposToCheck.map((repoName) => config?.repos.find((repo) => repo.name === repoName)?.stack.language ?? "unknown"),
  );
  const existingManagedLanguageDocs = (await fg("docs/architecture/languages/**/*.md", { cwd, onlyFiles: true, dot: false }))
    .filter((pathValue) => getAllManagedLanguageGuidePaths().includes(pathValue));
  const staleLanguageDocs = existingManagedLanguageDocs
    .filter((pathValue) => pathValue !== "docs/architecture/languages/README.md")
    .filter((pathValue) => !requiredLanguageDocs.includes(pathValue))
    .sort();
  const requiredPaths = state.scope === "workspace" ? [...requiredDocs, ...workspaceDocs] : requiredDocs;
  const missing = (await checkManyExist(cwd, requiredPaths)).missing;
  const missingLanguageDocs = (await checkManyExist(cwd, requiredLanguageDocs)).missing;
  const languageMetadataMissing: string[] = [];
  for (const pathValue of requiredLanguageDocs.filter((candidate) => !missingLanguageDocs.includes(candidate))) {
    const content = await readTextFile(join(cwd, pathValue));
    if (!content.includes("minimum_supported_version:") || !content.includes("last_reviewed:") || !content.includes("sources:")) {
      languageMetadataMissing.push(pathValue);
    }
  }

  return [
    buildCheck(
      "analyze-artifacts",
      "warning",
      missing.length === 0,
      missing.length === 0
        ? `analyze artifacts exist for ${reposToCheck.length} repo(s)`
        : `missing analyze artifacts: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "..." : ""}`,
    ),
    buildCheck(
      "knowledge-artifacts",
      "warning",
      missing.filter((entry) => entry.startsWith(".bbg/knowledge/")).length === 0,
      missing.filter((entry) => entry.startsWith(".bbg/knowledge/")).length === 0
        ? "repo/workspace knowledge artifacts exist"
        : `missing knowledge artifacts: ${missing.filter((entry) => entry.startsWith(".bbg/knowledge/")).slice(0, 8).join(", ")}`,
    ),
    buildCheck(
      "language-pattern-guides",
      "warning",
      missingLanguageDocs.length === 0 && languageMetadataMissing.length === 0 && staleLanguageDocs.length === 0,
      missingLanguageDocs.length === 0 && languageMetadataMissing.length === 0 && staleLanguageDocs.length === 0
        ? "language pattern guides exist with version metadata"
        : [
            missingLanguageDocs.length > 0
              ? `missing language guides: ${missingLanguageDocs.slice(0, 8).join(", ")}`
              : null,
            languageMetadataMissing.length > 0
              ? `language guide metadata incomplete: ${languageMetadataMissing.slice(0, 8).join(", ")}`
              : null,
            staleLanguageDocs.length > 0
              ? `stale language guides are still present: ${staleLanguageDocs.slice(0, 8).join(", ")}`
              : null,
          ].filter((value): value is string => Boolean(value)).join("; "),
    ),
    canonicalWikiCheck,
    buildCheck(
      "wiki-generated-artifacts",
      "warning",
      wikiArtifacts.missingGenerated.length === 0,
      wikiArtifacts.missingGenerated.length === 0
        ? "wiki generated artifacts exist"
        : `missing wiki generated artifacts: ${wikiArtifacts.missingGenerated.join(", ")}`,
    ),
    buildCheck(
      "analyze-quarantine",
      "warning",
      quarantine.count === 0,
      quarantine.count === 0
        ? "no quarantined analyze runtime state detected"
        : `analyze runtime state quarantined: ${quarantine.count} file(s), latest ${quarantine.latestQuarantinedAt ?? "unknown"}`,
    ),
  ];
}

async function runTaskRuntimeChecks(cwd: string): Promise<DoctorCheckResult[]> {
  const checks: DoctorCheckResult[] = [];
  const taskEnvRoot = join(cwd, ".bbg", "task-envs");
  const brokenEnvIds: string[] = [];
  const reusedNotes: string[] = [];

  if (await exists(taskEnvRoot)) {
    const envEntries = await readdir(taskEnvRoot, { withFileTypes: true });
    for (const entry of envEntries.filter((candidate) => candidate.isDirectory())) {
      const manifestPath = join(taskEnvRoot, entry.name, "manifest.json");
      if (!(await exists(manifestPath))) {
        brokenEnvIds.push(entry.name);
        continue;
      }

      try {
        const manifest = JSON.parse(await readTextFile(manifestPath)) as Record<string, unknown>;
        const status = typeof manifest.status === "string" ? manifest.status : "broken";
        if (status === "stale" || status === "broken") {
          brokenEnvIds.push(entry.name);
        }

        const envNotesPath = typeof manifest.notesPath === "string" ? manifest.notesPath : null;
        const observationsRoot = join(taskEnvRoot, entry.name, "observations");
        if (envNotesPath && (await exists(observationsRoot))) {
          const observationEntries = await readdir(observationsRoot, { withFileTypes: true });
          for (const observationEntry of observationEntries.filter((candidate) => candidate.isDirectory())) {
            const observationManifestPath = join(observationsRoot, observationEntry.name, "manifest.json");
            if (!(await exists(observationManifestPath))) {
              continue;
            }
            const observationManifest = JSON.parse(await readTextFile(observationManifestPath)) as Record<string, unknown>;
            const notesPath = typeof observationManifest.notesPath === "string" ? observationManifest.notesPath : null;
            if (notesPath === envNotesPath) {
              reusedNotes.push(`${entry.name}/${observationEntry.name}`);
            }
          }
        }
      } catch {
        brokenEnvIds.push(entry.name);
      }
    }
  }

  checks.push(
    buildCheck(
      "task-runtime-env-health",
      "warning",
      brokenEnvIds.length === 0,
      brokenEnvIds.length === 0
        ? "task environments are healthy"
        : `stale or broken task environments: ${brokenEnvIds.join(", ")}`,
    ),
  );
  checks.push(
    buildCheck(
      "task-runtime-observe-isolation",
      "warning",
      reusedNotes.length === 0,
      reusedNotes.length === 0
        ? "observation notes are isolated from task environment notes"
        : `observation notes reuse task env notes for: ${reusedNotes.join(", ")}`,
    ),
  );

  return checks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readPackageScripts(cwd: string): Promise<Record<string, string> | null> {
  const packageJsonPath = join(cwd, "package.json");
  if (!(await exists(packageJsonPath))) {
    return null;
  }

  try {
    const parsed = JSON.parse(await readTextFile(packageJsonPath)) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.scripts)) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(parsed.scripts).filter(([, value]) => typeof value === "string"),
    ) as Record<string, string>;
  } catch {
    return null;
  }
}

function splitScriptSegments(script: string): string[] {
  return script
    .split(/(?:&&|\|\||;|\|)/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function extractCommandName(segment: string): string | null {
  let remaining = segment.trim();
  while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(remaining)) {
    const match = remaining.match(/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S+)\s*/);
    if (!match) {
      break;
    }

    remaining = remaining.slice(match[0].length).trimStart();
  }

  const commandMatch = remaining.match(/^(?:"([^"]+)"|'([^']+)'|(\S+))/);
  const commandName = commandMatch?.[1] ?? commandMatch?.[2] ?? commandMatch?.[3] ?? null;
  if (commandName !== null && SHELL_BUILTIN_COMMANDS.has(commandName)) {
    return null;
  }

  return commandName;
}

function isRelativeCommandPath(commandName: string): boolean {
  return commandName.startsWith("./")
    || commandName.startsWith("../")
    || commandName.startsWith(".\\")
    || commandName.startsWith("..\\");
}

function normalizeRelativeCommandPath(commandName: string): string {
  return commandName.replace(/\\/g, "/");
}

function getCandidateCommandPaths(cwd: string, commandName: string): string[] {
  const extensions = process.platform === "win32"
    ? (process.env.PATHEXT?.split(";").filter((entry) => entry.length > 0) ?? [".EXE", ".CMD", ".BAT", ".COM"])
    : [""];
  const searchPaths = [join(cwd, "node_modules", ".bin"), ...(process.env.PATH?.split(process.platform === "win32" ? ";" : ":") ?? [])];

  if (isAbsolute(commandName)) {
    if (process.platform === "win32" && extname(commandName).length > 0) {
      return [commandName];
    }

    return extensions.map((extension) => `${commandName}${extension}`);
  }

  if (isRelativeCommandPath(commandName)) {
    const normalizedCommandName = normalizeRelativeCommandPath(commandName);
    if (process.platform === "win32" && extname(normalizedCommandName).length > 0) {
      return [join(cwd, normalizedCommandName)];
    }

    return extensions.map((extension) => join(cwd, `${normalizedCommandName}${extension}`));
  }

  return searchPaths.flatMap((searchPath) => extensions.map((extension) => join(searchPath, `${commandName}${extension}`)));
}

async function hasExecutableCommandCapability(cwd: string, commandName: string): Promise<boolean> {
  for (const candidatePath of getCandidateCommandPaths(cwd, commandName)) {
    if (await isExecutable(candidatePath)) {
      return true;
    }
  }

  return false;
}

async function findScriptsMissingExecutableCapabilities(cwd: string, packageScripts: Record<string, string> | null): Promise<string[]> {
  const missing: string[] = [];

  for (const scriptName of REQUIRED_RUNTIME_SCRIPTS) {
    const script = packageScripts?.[scriptName];
    if (typeof script !== "string" || script.trim().length === 0) {
      continue;
    }

    const commandNames = splitScriptSegments(script)
      .map(extractCommandName)
      .filter((commandName): commandName is string => commandName !== null);
    let missingCapability = false;
    for (const commandName of commandNames) {
      if (!(await hasExecutableCommandCapability(cwd, commandName))) {
        missingCapability = true;
        break;
      }
    }

    if (missingCapability) {
      missing.push(scriptName);
    }
  }

  return missing;
}

async function findConfiguredCommandsMissingExecutableCapabilities(cwd: string, config: BbgConfig): Promise<string[]> {
  const missing: string[] = [];

  for (const commandName of ["build", "typecheck", "tests", "lint"] as const) {
    const definitions = resolveRuntimeCommands(cwd, config.repos, config.runtime?.commands, commandName);
    let missingCapability = false;
    for (const definition of definitions) {
      if (!(await hasExecutableCommandCapability(definition.cwd, definition.command))) {
        missingCapability = true;
        break;
      }
    }

    if (missingCapability) {
      missing.push(commandName === "tests" ? "test" : commandName);
    }
  }

  return missing;
}

export async function runHarnessRuntimeChecks(input: {
  cwd: string;
  config: BbgConfig | null;
  runtime: RuntimeConfig;
}): Promise<DoctorCheckResult[]> {
  const checks: DoctorCheckResult[] = [];
  const runtimePaths = resolveRuntimePaths(input.cwd, input.runtime);
  const packageScripts = await readPackageScripts(input.cwd);
  const hasConfiguredRuntimeCommands = input.config?.runtime?.commands !== undefined;
  const missingRuntimeScripts = REQUIRED_RUNTIME_SCRIPTS.filter((scriptName) => {
    if (hasConfiguredRuntimeCommands) {
      return false;
    }

    const script = packageScripts?.[scriptName];
    return typeof script !== "string" || script.trim().length === 0;
  });
  const missingExecutableCapabilities = hasConfiguredRuntimeCommands && input.config !== null
    ? await findConfiguredCommandsMissingExecutableCapabilities(input.cwd, input.config)
    : await findScriptsMissingExecutableCapabilities(input.cwd, packageScripts);

  checks.push(
    buildCheck(
      "runtime-configured",
      "warning",
      input.config?.runtime !== undefined,
      input.config?.runtime !== undefined
        ? "runtime config exists"
        : "runtime config missing; phase 1 defaults are in use",
    ),
  );

  checks.push(
    buildCheck(
      "runtime-command-scripts",
      "warning",
      missingRuntimeScripts.length === 0 && missingExecutableCapabilities.length === 0,
      missingRuntimeScripts.length === 0 && missingExecutableCapabilities.length === 0
        ? "runtime command scripts exist"
        : [
          missingRuntimeScripts.length > 0 ? `missing package.json scripts: ${missingRuntimeScripts.join(", ")}` : null,
          missingExecutableCapabilities.length > 0
            ? `missing executable command capabilities: ${missingExecutableCapabilities.join(", ")}`
            : null,
        ].filter((entry) => entry !== null).join("; "),
    ),
  );

  let telemetryCheck = buildCheck("runtime-telemetry", "warning", false, "telemetry disabled in runtime config");
  if (input.runtime.telemetry.enabled) {
    if (!(await exists(runtimePaths.telemetry))) {
      telemetryCheck = buildCheck("runtime-telemetry", "warning", false, `missing telemetry store: ${input.runtime.telemetry.file}`);
    } else {
      try {
        const telemetry = await readTelemetryDocument(input.cwd, input.runtime);
        telemetryCheck = buildCheck(
          "runtime-telemetry",
          "warning",
          telemetry.events.length > 0,
          telemetry.events.length > 0
            ? `${telemetry.events.length} telemetry event(s) recorded`
            : `telemetry store has no events: ${input.runtime.telemetry.file}`,
        );
      } catch {
        telemetryCheck = buildCheck("runtime-telemetry", "warning", false, `invalid telemetry store: ${input.runtime.telemetry.file}`);
      }
    }
  }
  checks.push(telemetryCheck);

  const [datasetFiles, experimentFiles] = await Promise.all([
    fg([".bbg/evals/*.dataset.json", "evals/*.dataset.json"], { cwd: input.cwd, onlyFiles: true, dot: true }),
    fg([".bbg/evals/*.experiment.json", "evals/*.experiment.json"], { cwd: input.cwd, onlyFiles: true, dot: true }),
  ]);
  const missingEvalArtifacts: string[] = [];
  if (datasetFiles.length === 0) {
    missingEvalArtifacts.push("dataset");
  }
  if (experimentFiles.length === 0) {
    missingEvalArtifacts.push("experiment");
  }
  checks.push(
    buildCheck(
      "runtime-eval-datasets",
      "warning",
      missingEvalArtifacts.length === 0,
      missingEvalArtifacts.length === 0
        ? "eval datasets and experiments exist"
        : `missing eval artifacts: ${missingEvalArtifacts.join(", ")}`,
    ),
  );

  checks.push(
    buildCheck(
      "runtime-repo-map",
      "warning",
      input.runtime.context.enabled && (await exists(runtimePaths.repoMap)),
      !input.runtime.context.enabled
        ? "runtime context disabled in config"
        : (await exists(runtimePaths.repoMap))
          ? "repo-map exists"
          : `missing repo-map: ${input.runtime.context.repoMapFile}`,
    ),
  );

  let policyCoverageCheck = buildCheck("runtime-policy-coverage", "warning", false, "runtime policy disabled in config");
  if (input.runtime.policy.enabled) {
    try {
      const coverage = await getPolicyCoverageReport({ cwd: input.cwd, runtime: input.runtime });
      const missingCoverage = POLICY_COMMANDS.filter((command) => coverage.defaultedCommands.includes(command));
      const passed = input.config?.runtime !== undefined && missingCoverage.length === 0 && coverage.source === "authored";
      policyCoverageCheck = buildCheck(
        "runtime-policy-coverage",
        "warning",
        passed,
        passed
          ? "runtime policy explicitly covers all governed commands"
          : coverage.source === "disabled"
            ? "runtime policy disabled in config"
            : `policy coverage gap for commands: ${missingCoverage.join(", ") || "all"}`,
      );
    } catch {
      policyCoverageCheck = buildCheck("runtime-policy-coverage", "warning", false, `invalid policy store: ${input.runtime.policy.file}`);
    }
  }
  checks.push(policyCoverageCheck);

  return checks;
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
  const runtime = config?.runtime ?? buildDefaultRuntimeConfig();

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

  const primaryCommandDocsResult = await checkManyExist(options.cwd, PRIMARY_COMMAND_DOCS);
  checks.push(
    buildCheck(
      "primary-command-docs",
      "warning",
      primaryCommandDocsResult.missing.length === 0,
      primaryCommandDocsResult.missing.length === 0
        ? "primary command docs exist"
        : `missing primary command docs: ${primaryCommandDocsResult.missing.join(", ")}`,
    ),
  );

  const analyzeLatestPath = join(options.cwd, ".bbg", "analyze", "latest.json");
  checks.push(
    buildCheck(
      "analyze-state",
      "info",
      await exists(analyzeLatestPath),
      (await exists(analyzeLatestPath)) ? "analyze latest state exists" : "analyze has not been run yet",
    ),
  );

  checks.push(...(await runAnalyzeArtifactChecks(options.cwd, config)));

  const tasksRoot = join(options.cwd, ".bbg", "tasks");
  checks.push(
    buildCheck(
      "task-sessions",
      "info",
      await exists(tasksRoot),
      (await exists(tasksRoot)) ? "task sessions directory exists" : "no task sessions recorded yet",
    ),
  );
  checks.push(...(await runTaskRuntimeChecks(options.cwd)));

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
  checks.push(...(await runHarnessRuntimeChecks({ cwd: options.cwd, config, runtime })));

  // Template file existence check
  if (config && hasConfig) {
    const hashesPath = join(options.cwd, ".bbg", "file-hashes.json");
    if (await exists(hashesPath)) {
      try {
        const record = JSON.parse(await readTextFile(hashesPath)) as FileHashRecord;
        const missingTemplateFiles: string[] = [];
        for (const relativePath of Object.keys(record)) {
          if (!(await exists(join(options.cwd, relativePath)))) {
            missingTemplateFiles.push(relativePath);
          }
        }
        checks.push(
          buildCheck(
            "template-files-exist",
            "warning",
            missingTemplateFiles.length === 0,
            missingTemplateFiles.length === 0
              ? "all template-tracked files exist on disk"
              : `${missingTemplateFiles.length} template-tracked file(s) missing: ${missingTemplateFiles.slice(0, 5).join(", ")}${missingTemplateFiles.length > 5 ? "..." : ""}`,
          ),
        );
      } catch {
        checks.push(
          buildCheck("template-files-exist", "warning", false, "unable to parse .bbg/file-hashes.json for template check"),
        );
      }
    }
  }

  // Template version match check
  if (config) {
    const { CLI_VERSION } = await import("../constants.js");
    const versionMatch = config.version === CLI_VERSION;
    checks.push(
      buildCheck(
        "template-version-match",
        "info",
        versionMatch,
        versionMatch
          ? `project version (${config.version}) matches CLI version (${CLI_VERSION})`
          : `project version (${config.version}) differs from CLI version (${CLI_VERSION}) — consider running bbg upgrade`,
      ),
    );
  }

  return { checks, config };
}
