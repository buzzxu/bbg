import { rmdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import fg from "fast-glob";
import type { FileHashRecord } from "../config/hash.js";
import { sha256Hex } from "../config/hash.js";
import { parseConfig } from "../config/read-write.js";
import type { BbgConfig } from "../config/schema.js";
import { hasManagedSection, isManagedAdapterPath, removeManagedSection } from "../adapters/managed.js";
import { removeBbgGitignoreEntries } from "./init-gitignore.js";
import { buildTrackedFiles } from "../lifecycle/tracked-files.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import { uiText } from "../i18n/ui-copy.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";
import { promptConfirm } from "../utils/prompts.js";

export interface RunUninstallInput {
  cwd: string;
  dryRun?: boolean;
  force?: boolean;
  keepRuntimeData?: boolean;
  keepDocs?: boolean;
  keepKnowledge?: boolean;
  keepToolAdapters?: boolean;
  yes?: boolean;
}

export interface RunUninstallResult {
  deleted: string[];
  removedSections: string[];
  kept: string[];
  skippedModified: string[];
  missing: string[];
  notices: string[];
}

type DecisionDisposition = "delete" | "remove-section" | "keep" | "skip-modified" | "missing";

interface UninstallDecision {
  path: string;
  disposition: DecisionDisposition;
  reason: string;
  nextContent?: string;
}

const DYNAMIC_DOC_FILES = [
  "docs/architecture/technical-architecture.md",
  "docs/architecture/business-architecture.md",
  "docs/architecture/repo-dependency-graph.md",
  "docs/architecture/workspace-topology.md",
  "docs/architecture/integration-map.md",
  "docs/architecture/index.md",
];

const DIRECTORY_CANDIDATES = [
  ".bbg/generated-snapshots",
  ".bbg/upgrade-patches",
  ".bbg/context",
  ".bbg/sessions",
  ".bbg/evaluations",
  ".bbg/telemetry",
  ".bbg/policy",
  ".bbg/tasks",
  ".bbg/task-envs",
  ".bbg/loops",
  ".bbg/repos",
  ".bbg/analyze",
  ".bbg/knowledge",
];

const RUNTIME_DATA_PREFIXES = [
  ".bbg/tasks",
  ".bbg/task-envs",
  ".bbg/loops",
  ".bbg/sessions",
  ".bbg/evaluations",
  ".bbg/telemetry",
  ".bbg/context",
  ".bbg/analyze",
  ".bbg/repos",
];

const KNOWLEDGE_PREFIXES = [
  ".bbg/knowledge",
  "docs/wiki",
];

const DOC_PREFIXES = [
  "docs/workflows",
  "docs/architecture/languages",
  "docs/architecture/repos",
  "docs/architecture/technical-architecture.md",
  "docs/architecture/business-architecture.md",
  "docs/architecture/repo-dependency-graph.md",
  "docs/architecture/workspace-topology.md",
  "docs/architecture/integration-map.md",
  "docs/architecture/index.md",
  "docs/business",
  "docs/repositories",
];

const TOOL_ADAPTER_PREFIXES = [
  ".claude",
  ".codex",
  ".opencode",
  ".gemini",
  ".cursor",
  "CLAUDE.md",
];

const BASELINE_OPTIONAL_MANAGED_PREFIXES = [
  ".bbg",
  ...KNOWLEDGE_PREFIXES,
  ...DOC_PREFIXES,
  ...TOOL_ADAPTER_PREFIXES,
];

function normalizePath(pathValue: string): string {
  return pathValue.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function isPathWithinPrefix(pathValue: string, prefix: string): boolean {
  const normalizedPath = normalizePath(pathValue);
  const normalizedPrefix = normalizePath(prefix);
  return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);
}

function isPathWithinAny(pathValue: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => isPathWithinPrefix(pathValue, prefix));
}

async function maybeLoadConfig(cwd: string, notices: string[]): Promise<BbgConfig | null> {
  try {
    return parseConfig(await readTextFile(join(cwd, ".bbg", "config.json")));
  } catch {
    notices.push("unable to parse .bbg/config.json; using fallback uninstall plan");
    return null;
  }
}

async function maybeLoadHashRecord(cwd: string, notices: string[]): Promise<FileHashRecord> {
  try {
    const contents = await readTextFile(join(cwd, ".bbg", "file-hashes.json"));
    return JSON.parse(contents) as FileHashRecord;
  } catch {
    notices.push("unable to parse .bbg/file-hashes.json; modified-file detection will be partial");
    return {};
  }
}

async function collectDynamicDocCandidates(cwd: string): Promise<string[]> {
  const generated = await fg(
    [
      "docs/wiki/**/*.md",
      "docs/architecture/languages/**/*.md",
      "docs/architecture/repos/**/*.md",
      "docs/repositories/**/*.md",
      "docs/business/**/*.md",
    ],
    {
      cwd,
      onlyFiles: true,
      dot: false,
    },
  );

  return [...generated, ...DYNAMIC_DOC_FILES].map(normalizePath);
}

function collectDirectoryCandidates(config: BbgConfig | null): string[] {
  const runtime = config?.runtime ?? buildDefaultRuntimeConfig();
  const runtimeFiles = [
    runtime.telemetry.file,
    runtime.evaluation.file,
    runtime.policy.file,
    runtime.context.repoMapFile,
    runtime.context.sessionHistoryFile,
  ];

  const runtimeDirectories = runtimeFiles
    .map((filePath) => normalizePath(filePath).split("/").slice(0, -1).join("/"))
    .filter((value) => value.length > 0);

  return [...DIRECTORY_CANDIDATES, ...runtimeDirectories]
    .map(normalizePath)
    .filter((value, index, all) => all.indexOf(value) === index);
}

function pruneChildrenOfDirectories(paths: string[], directories: string[]): string[] {
  const normalizedDirectories = directories.map(normalizePath);
  return paths.filter((pathValue) => !normalizedDirectories.some((directory) => normalizePath(pathValue).startsWith(`${directory}/`)));
}

function shouldKeepPath(pathValue: string, input: RunUninstallInput): string | null {
  if (input.keepRuntimeData && isPathWithinAny(pathValue, RUNTIME_DATA_PREFIXES)) {
    return "preserved by --keep-runtime-data";
  }

  if (input.keepKnowledge && isPathWithinAny(pathValue, KNOWLEDGE_PREFIXES)) {
    return "preserved by --keep-knowledge";
  }

  if (input.keepDocs && isPathWithinAny(pathValue, DOC_PREFIXES)) {
    return "preserved by --keep-docs";
  }

  if (input.keepToolAdapters && isPathWithinAny(pathValue, TOOL_ADAPTER_PREFIXES)) {
    return "preserved by --keep-tool-adapters";
  }

  return null;
}

async function decideTrackedFile(
  cwd: string,
  pathValue: string,
  previousHash: string | undefined,
  input: RunUninstallInput,
): Promise<UninstallDecision> {
  const keepReason = shouldKeepPath(pathValue, input);
  if (keepReason) {
    return { path: pathValue, disposition: "keep", reason: keepReason };
  }

  const absolutePath = join(cwd, pathValue);
  let currentContent: string;
  try {
    currentContent = await readTextFile(absolutePath);
  } catch {
    return { path: pathValue, disposition: "missing", reason: "file already absent" };
  }

  if (pathValue === ".gitignore") {
    const nextContent = removeBbgGitignoreEntries(currentContent);
    return nextContent.length > 0
      ? { path: pathValue, disposition: "remove-section", reason: "remove bbg gitignore entries", nextContent }
      : { path: pathValue, disposition: "delete", reason: "gitignore only contained bbg-managed entries" };
  }

  if (isManagedAdapterPath(pathValue) && hasManagedSection(currentContent)) {
    const nextContent = removeManagedSection(currentContent);
    return nextContent === null
      ? { path: pathValue, disposition: "skip-modified", reason: "adapter file missing managed section" }
      : nextContent.length > 0
        ? { path: pathValue, disposition: "remove-section", reason: "remove bbg-managed adapter section", nextContent }
        : { path: pathValue, disposition: "delete", reason: "adapter file only contained bbg-managed content" };
  }

  if (!previousHash) {
    if (isPathWithinAny(pathValue, BASELINE_OPTIONAL_MANAGED_PREFIXES)) {
      return { path: pathValue, disposition: "delete", reason: "bbg-owned file outside baseline hash inventory" };
    }

    return input.force
      ? { path: pathValue, disposition: "delete", reason: "forced removal without baseline hash" }
      : { path: pathValue, disposition: "skip-modified", reason: "file has no generated baseline hash" };
  }

  const currentHash = sha256Hex(currentContent);
  if (currentHash === previousHash || input.force) {
    return {
      path: pathValue,
      disposition: "delete",
      reason: currentHash === previousHash ? "generated file matches recorded baseline" : "forced removal of modified generated file",
    };
  }

  return { path: pathValue, disposition: "skip-modified", reason: "user-modified generated file" };
}

function decisionForDirectory(pathValue: string, input: RunUninstallInput): UninstallDecision {
  const keepReason = shouldKeepPath(pathValue, input);
  if (keepReason) {
    return { path: pathValue, disposition: "keep", reason: keepReason };
  }

  return { path: pathValue, disposition: "delete", reason: "bbg-managed runtime directory" };
}

async function executeDecision(cwd: string, decision: UninstallDecision): Promise<void> {
  const absolutePath = join(cwd, decision.path);
  if (decision.disposition === "delete") {
    await rm(absolutePath, { recursive: true, force: true });
    return;
  }

  if (decision.disposition === "remove-section") {
    if (decision.nextContent && decision.nextContent.length > 0) {
      await writeTextFile(absolutePath, decision.nextContent);
      return;
    }

    await rm(absolutePath, { recursive: true, force: true });
  }
}

async function pruneEmptyAncestors(cwd: string, pathValue: string): Promise<void> {
  let current = join(cwd, normalizePath(pathValue));

  try {
    current = (await stat(current)).isDirectory() ? current : dirname(current);
  } catch {
    current = dirname(current);
  }

  while (normalizePath(current).startsWith(normalizePath(cwd)) && normalizePath(current) !== normalizePath(cwd)) {
    try {
      await rmdir(current);
    } catch {
      break;
    }

    current = dirname(current);
  }
}

export async function runUninstall(input: RunUninstallInput): Promise<RunUninstallResult> {
  const notices: string[] = [];
  const hasConfigFile = await exists(join(input.cwd, ".bbg", "config.json"));
  const hasHashesFile = await exists(join(input.cwd, ".bbg", "file-hashes.json"));
  const config = await maybeLoadConfig(input.cwd, notices);
  const hashRecord = await maybeLoadHashRecord(input.cwd, notices);
  const hasConfig = Boolean(config) || hasConfigFile;
  const hasHashes = Object.keys(hashRecord).length > 0 || hasHashesFile;

  if (!hasConfig && !hasHashes) {
    throw new Error("No bbg installation metadata found. Run `bbg init` first.");
  }

  let trackedFiles = [] as Awaited<ReturnType<typeof buildTrackedFiles>>;
  if (hasConfig) {
    try {
      trackedFiles = await buildTrackedFiles(input.cwd, hashRecord);
    } catch {
      notices.push("unable to render tracked template inventory; falling back to path-based uninstall");
    }
  }

  const dynamicDocs = await collectDynamicDocCandidates(input.cwd);
  const directoryCandidates = collectDirectoryCandidates(config);
  const rootCandidates = [".bbg/config.json", ".bbg/file-hashes.json"];

  const trackedPaths = trackedFiles.map((file) => normalizePath(file.path));
  const fileCandidates = pruneChildrenOfDirectories(
    [...rootCandidates, ...trackedPaths, ...dynamicDocs].filter((value, index, all) => all.indexOf(value) === index),
    directoryCandidates,
  );

  const decisions = new Map<string, UninstallDecision>();
  for (const directory of directoryCandidates) {
    decisions.set(directory, decisionForDirectory(directory, input));
  }

  for (const pathValue of fileCandidates) {
    if (decisions.has(pathValue)) {
      continue;
    }

    const tracked = trackedFiles.find((item) => normalizePath(item.path) === pathValue);
    decisions.set(pathValue, await decideTrackedFile(input.cwd, pathValue, tracked?.previousHash, input));
  }

  if (!input.dryRun && !input.yes) {
    const planSummary = [
      `Delete ${[...decisions.values()].filter((decision) => decision.disposition === "delete").length} path(s)`,
      `remove sections from ${[...decisions.values()].filter((decision) => decision.disposition === "remove-section").length} file(s)`,
      `skip ${[
        ...decisions.values(),
      ].filter((decision) => decision.disposition === "skip-modified" || decision.disposition === "keep").length} path(s)`,
    ].join(", ");
    const confirmed = await promptConfirm({
      message: uiText("uninstall.confirm", { value: planSummary }),
      default: false,
    });

    if (!confirmed) {
      throw new Error("Uninstall aborted by user.");
    }
  }

  const deleted: string[] = [];
  const removedSections: string[] = [];
  const kept: string[] = [];
  const skippedModified: string[] = [];
  const missing: string[] = [];

  for (const decision of [...decisions.values()].sort((left, right) => right.path.localeCompare(left.path))) {
    switch (decision.disposition) {
      case "delete":
        deleted.push(decision.path);
        if (!input.dryRun) {
          await executeDecision(input.cwd, decision);
          await pruneEmptyAncestors(input.cwd, decision.path);
        }
        break;
      case "remove-section":
        removedSections.push(decision.path);
        if (!input.dryRun) {
          await executeDecision(input.cwd, decision);
          if (!decision.nextContent || decision.nextContent.length === 0) {
            await pruneEmptyAncestors(input.cwd, decision.path);
          }
        }
        break;
      case "keep":
        kept.push(decision.path);
        break;
      case "skip-modified":
        skippedModified.push(decision.path);
        notices.push(`${decision.path}: ${decision.reason}`);
        break;
      case "missing":
        missing.push(decision.path);
        break;
      default:
        break;
    }
  }

  return {
    deleted,
    removedSections,
    kept,
    skippedModified,
    missing,
    notices,
  };
}
