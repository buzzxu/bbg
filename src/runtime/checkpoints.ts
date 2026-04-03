import type { RepoEntry } from "../config/schema.js";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { sha256Hex } from "../config/hash.js";
import type { RuntimeConfig } from "./schema.js";
import { appendRuntimeCommandRun } from "./sessions.js";
import { readJsonStore, writeJsonStore } from "./store.js";
import { exists } from "../utils/fs.js";
import { runRuntimeCommandCheckWithConfig, type QualityGateCheckResult } from "./quality-gate.js";
import { collectWorkspaceFiles, toWorkspaceRelativePath } from "./workspace-files.js";

interface StoredCheckpointCheck {
  ok: boolean;
  exitCode: number;
}

export interface CheckpointDocument {
  version: number;
  name: string;
  createdAt: string;
  checks: {
    build: StoredCheckpointCheck;
    tests: StoredCheckpointCheck;
    typecheck: StoredCheckpointCheck;
    lint: StoredCheckpointCheck;
  };
  fileHashes: Record<string, string>;
}

export interface CheckpointResult {
  ok: boolean;
  name: string;
  checkpointFile: string;
  checks: {
    build: QualityGateCheckResult;
    tests: QualityGateCheckResult;
    typecheck: QualityGateCheckResult;
    lint: QualityGateCheckResult;
  };
  fileHashes: Record<string, string>;
}

export interface VerifyResult {
  ok: boolean;
  checkpointName: string;
  checks: {
    build: QualityGateCheckResult;
    tests: QualityGateCheckResult;
    typecheck: QualityGateCheckResult;
    lint: QualityGateCheckResult;
  };
  comparisons: {
    build: { matchesCheckpoint: boolean };
    tests: { matchesCheckpoint: boolean };
    typecheck: { matchesCheckpoint: boolean };
    lint: { matchesCheckpoint: boolean };
  };
  changedFiles: string[];
}

function sanitizeCheckpointName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function resolveDefaultCheckpointName(): string {
  return sanitizeCheckpointName(new Date().toISOString()) || "checkpoint";
}

function resolveExplicitCheckpointName(name: string): string {
  if (name.trim().length === 0) {
    throw new Error("Checkpoint name cannot be blank.");
  }

  const sanitizedName = sanitizeCheckpointName(name.trim());
  if (sanitizedName.length === 0) {
    throw new Error("Checkpoint name cannot be empty after sanitization.");
  }

  return sanitizedName;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCheckpointDocument(value: unknown): value is CheckpointDocument {
  if (!isRecord(value) || !isRecord(value.checks) || !isRecord(value.fileHashes)) {
    return false;
  }

  return typeof value.version === "number"
    && typeof value.name === "string"
    && typeof value.createdAt === "string"
    && [value.checks.build, value.checks.tests, value.checks.typecheck, value.checks.lint].every((check) => isRecord(check)
      && typeof check.ok === "boolean"
      && typeof check.exitCode === "number")
    && Object.values(value.fileHashes).every((hash) => typeof hash === "string");
}

async function snapshotFileHashes(cwd: string): Promise<Record<string, string>> {
  const fileHashes: Record<string, string> = {};

  for (const filePath of await collectWorkspaceFiles(cwd)) {
    const relativePath = toWorkspaceRelativePath(cwd, filePath);
    fileHashes[relativePath] = sha256Hex(await readFile(filePath));
  }

  return fileHashes;
}

async function readCheckpointDocument(checkpointPath: string): Promise<CheckpointDocument> {
  return readJsonStore<CheckpointDocument>(
    checkpointPath,
    {
      version: 1,
      name: "",
      createdAt: "",
      checks: {
        build: { ok: false, exitCode: 1 },
        tests: { ok: false, exitCode: 1 },
        typecheck: { ok: false, exitCode: 1 },
        lint: { ok: false, exitCode: 1 },
      },
      fileHashes: {},
    },
    isCheckpointDocument,
  );
}

function checkpointSortTime(checkpoint: CheckpointDocument, modifiedTimeMs: number): number {
  const createdAtMs = Date.parse(checkpoint.createdAt);
  return Number.isNaN(createdAtMs) ? modifiedTimeMs : createdAtMs;
}

function toStoredCheck(check: QualityGateCheckResult): StoredCheckpointCheck {
  return {
    ok: check.ok,
    exitCode: check.exitCode,
  };
}

function toComparison(current: QualityGateCheckResult, checkpoint: StoredCheckpointCheck): { matchesCheckpoint: boolean } {
  return {
    matchesCheckpoint: current.ok === checkpoint.ok && current.exitCode === checkpoint.exitCode,
  };
}

function compareFileHashes(previous: Record<string, string>, current: Record<string, string>): string[] {
  const files = new Set([...Object.keys(previous), ...Object.keys(current)]);
  return [...files].filter((filePath) => previous[filePath] !== current[filePath]).sort();
}

async function resolveCheckpointPath(cwd: string, name?: string): Promise<string> {
  if (name !== undefined) {
    const checkpointName = resolveExplicitCheckpointName(name);
    const checkpointPath = join(cwd, ".bbg", "checkpoints", `${checkpointName}.json`);
    if (!(await exists(checkpointPath))) {
      throw new Error(`Checkpoint '${checkpointName}' not found. Run \`bbg checkpoint --name ${checkpointName}\` first.`);
    }

    return checkpointPath;
  }

  const checkpointsDir = join(cwd, ".bbg", "checkpoints");
  if (!(await exists(checkpointsDir))) {
    throw new Error("No checkpoint found. Run `bbg checkpoint` first.");
  }

  const files = (await readdir(checkpointsDir)).filter((entry) => entry.endsWith(".json"));
  if (files.length === 0) {
    throw new Error("No checkpoint found. Run `bbg checkpoint` first.");
  }

  const checkpoints = await Promise.all(files.map(async (fileName) => {
    const checkpointPath = join(checkpointsDir, fileName);
    const [checkpoint, fileStats] = await Promise.all([readCheckpointDocument(checkpointPath), stat(checkpointPath)]);
    return {
      path: checkpointPath,
      sortTime: checkpointSortTime(checkpoint, fileStats.mtimeMs),
    };
  }));

  checkpoints.sort((left, right) => left.sortTime - right.sortTime || left.path.localeCompare(right.path));
  return checkpoints.at(-1)?.path ?? join(checkpointsDir, files[0]);
}

export async function createCheckpoint(input: {
  cwd: string;
  runtime: RuntimeConfig;
  repos: RepoEntry[];
  name?: string;
}): Promise<CheckpointResult> {
  const name = input.name === undefined ? resolveDefaultCheckpointName() : resolveExplicitCheckpointName(input.name);
  const build = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "build", repos: input.repos, runtime: input.runtime });
  const tests = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "tests", repos: input.repos, runtime: input.runtime });
  const typecheck = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "typecheck", repos: input.repos, runtime: input.runtime });
  const lint = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "lint", repos: input.repos, runtime: input.runtime });
  const fileHashes = await snapshotFileHashes(input.cwd);
  const checkpointPath = join(input.cwd, ".bbg", "checkpoints", `${name}.json`);
  const ok = build.ok && tests.ok && typecheck.ok && lint.ok;

  await writeJsonStore(checkpointPath, {
    version: 1,
    name,
    createdAt: new Date().toISOString(),
    checks: {
      build: toStoredCheck(build),
      tests: toStoredCheck(tests),
      typecheck: toStoredCheck(typecheck),
      lint: toStoredCheck(lint),
    },
    fileHashes,
  } satisfies CheckpointDocument);

  await appendRuntimeCommandRun(input.cwd, input.runtime, {
    command: "checkpoint",
    ok,
    details: {
      checkpoint: name,
      trackedFiles: Object.keys(fileHashes).length,
    },
  });

  return {
    ok,
    name,
    checkpointFile: `.bbg/checkpoints/${name}.json`,
    checks: { build, tests, typecheck, lint },
    fileHashes,
  };
}

export async function verifyCheckpoint(input: {
  cwd: string;
  runtime: RuntimeConfig;
  repos: RepoEntry[];
  checkpoint?: string;
}): Promise<VerifyResult> {
  const checkpointPath = await resolveCheckpointPath(input.cwd, input.checkpoint);
  const checkpoint = await readCheckpointDocument(checkpointPath);
  const build = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "build", repos: input.repos, runtime: input.runtime });
  const tests = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "tests", repos: input.repos, runtime: input.runtime });
  const typecheck = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "typecheck", repos: input.repos, runtime: input.runtime });
  const lint = await runRuntimeCommandCheckWithConfig({ cwd: input.cwd, name: "lint", repos: input.repos, runtime: input.runtime });
  const currentFileHashes = await snapshotFileHashes(input.cwd);
  const changedFiles = compareFileHashes(checkpoint.fileHashes, currentFileHashes);
  const comparisons = {
    build: toComparison(build, checkpoint.checks.build),
    tests: toComparison(tests, checkpoint.checks.tests),
    typecheck: toComparison(typecheck, checkpoint.checks.typecheck),
    lint: toComparison(lint, checkpoint.checks.lint),
  };
  const ok = build.ok && tests.ok && typecheck.ok && lint.ok && changedFiles.length === 0 && Object.values(comparisons).every((entry) => entry.matchesCheckpoint);

  await appendRuntimeCommandRun(input.cwd, input.runtime, {
    command: "verify",
    ok,
    details: {
      checkpoint: checkpoint.name,
      changedFiles: changedFiles.length,
    },
  });

  return {
    ok,
    checkpointName: checkpoint.name,
    checks: { build, tests, typecheck, lint },
    comparisons,
    changedFiles,
  };
}
