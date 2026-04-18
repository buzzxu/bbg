import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { sha256Hex } from "../config/hash.js";
import type { RepoEntry } from "../config/schema.js";
import type { RuntimeConfig, RuntimeCommandCheckName } from "./schema.js";
import { appendRuntimeCommandRun } from "./sessions.js";
import { runRuntimeCommandCheckWithConfig, type QualityGateCheckResult } from "./quality-gate.js";
import { collectWorkspaceFiles, toWorkspaceRelativePath } from "./workspace-files.js";
import { readJsonStore, writeJsonStore } from "./store.js";
import { exists } from "../utils/fs.js";

export interface LoopIterationRecord {
  iteration: number;
  timestamp: string;
  changedFiles: string[];
  checks: Partial<Record<RuntimeCommandCheckName, QualityGateCheckResult>>;
}

export interface LoopState {
  version: number;
  id: string;
  taskId: string | null;
  taskEnvId: string | null;
  startedAt: string;
  updatedAt: string;
  status: "running" | "waiting-for-change" | "completed" | "max-iterations";
  checks: RuntimeCommandCheckName[];
  maxIterations: number;
  pollIntervalMs: number;
  idleTimeoutMs: number;
  iterations: LoopIterationRecord[];
}

function createDefaultLoopState(): LoopState {
  return {
    version: 1,
    id: "",
    taskId: null,
    taskEnvId: null,
    startedAt: "",
    updatedAt: "",
    status: "running",
    checks: ["build", "tests", "typecheck"],
    maxIterations: 1,
    pollIntervalMs: 1000,
    idleTimeoutMs: 1000,
    iterations: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLoopState(value: unknown): value is LoopState {
  return isRecord(value)
    && typeof value.version === "number"
    && typeof value.id === "string"
    && (value.taskId === null || typeof value.taskId === "string")
    && (value.taskEnvId === null || typeof value.taskEnvId === "string")
    && typeof value.startedAt === "string"
    && typeof value.updatedAt === "string"
    && typeof value.status === "string"
    && Array.isArray(value.checks)
    && Array.isArray(value.iterations);
}

function getLoopStatePath(cwd: string, id: string): string {
  return join(cwd, ".bbg", "loops", `${id}.json`);
}

async function snapshotWorkspaceHashes(cwd: string): Promise<Record<string, string>> {
  const files = await collectWorkspaceFiles(cwd);
  const hashes = await Promise.all(
    files.map(async (filePath) => [toWorkspaceRelativePath(cwd, filePath), sha256Hex(await readFile(filePath))] as const),
  );
  return Object.fromEntries(hashes);
}

function diffHashes(previous: Record<string, string>, current: Record<string, string>): string[] {
  const paths = new Set([...Object.keys(previous), ...Object.keys(current)]);
  return [...paths].filter((filePath) => previous[filePath] !== current[filePath]).sort();
}

async function waitForWorkspaceChange(cwd: string, baseline: Record<string, string>, pollIntervalMs: number, idleTimeoutMs: number): Promise<string[]> {
  const deadline = Date.now() + idleTimeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    const current = await snapshotWorkspaceHashes(cwd);
    const changedFiles = diffHashes(baseline, current);
    if (changedFiles.length > 0) {
      return changedFiles;
    }
  }

  return [];
}

async function runChecks(
  cwd: string,
  repos: RepoEntry[],
  runtime: RuntimeConfig,
  checks: RuntimeCommandCheckName[],
): Promise<Partial<Record<RuntimeCommandCheckName, QualityGateCheckResult>>> {
  const entries = await Promise.all(
    checks.map(async (name) => [name, await runRuntimeCommandCheckWithConfig({ cwd, name, repos, runtime })] as const),
  );
  return Object.fromEntries(entries);
}

export async function runAutonomousLoop(input: {
  cwd: string;
  runtime: RuntimeConfig;
  repos: RepoEntry[];
  id: string;
  taskId?: string | null;
  taskEnvId?: string | null;
  checks: RuntimeCommandCheckName[];
  maxIterations: number;
  pollIntervalMs: number;
  idleTimeoutMs: number;
}): Promise<LoopState> {
  const now = new Date().toISOString();
  let baseline = await snapshotWorkspaceHashes(input.cwd);
  const state: LoopState = {
    version: 1,
    id: input.id,
    taskId: input.taskId ?? null,
    taskEnvId: input.taskEnvId ?? null,
    startedAt: now,
    updatedAt: now,
    status: "running",
    checks: input.checks,
    maxIterations: input.maxIterations,
    pollIntervalMs: input.pollIntervalMs,
    idleTimeoutMs: input.idleTimeoutMs,
    iterations: [],
  };

  for (let iteration = 1; iteration <= input.maxIterations; iteration += 1) {
    const checks = await runChecks(input.cwd, input.repos, input.runtime, input.checks);
    const record: LoopIterationRecord = {
      iteration,
      timestamp: new Date().toISOString(),
      changedFiles: [],
      checks,
    };
    state.iterations.push(record);
    state.updatedAt = record.timestamp;

    if (Object.values(checks).every((check) => check?.ok === true)) {
      state.status = "completed";
      await writeJsonStore(getLoopStatePath(input.cwd, input.id), state);
      await appendRuntimeCommandRun(input.cwd, input.runtime, {
        command: "loop-start",
        ok: true,
        details: {
          loop: input.id,
          iterations: iteration,
          status: state.status,
        },
      });
      return state;
    }

    if (iteration === input.maxIterations) {
      state.status = "max-iterations";
      break;
    }

    const changedFiles = await waitForWorkspaceChange(input.cwd, baseline, input.pollIntervalMs, input.idleTimeoutMs);
    record.changedFiles = changedFiles;
    state.updatedAt = new Date().toISOString();
    await writeJsonStore(getLoopStatePath(input.cwd, input.id), state);

    if (changedFiles.length === 0) {
      state.status = "waiting-for-change";
      await appendRuntimeCommandRun(input.cwd, input.runtime, {
        command: "loop-start",
        ok: false,
        details: {
          loop: input.id,
          iterations: iteration,
          status: state.status,
        },
      });
      return state;
    }

    baseline = await snapshotWorkspaceHashes(input.cwd);
  }

  state.updatedAt = new Date().toISOString();
  await writeJsonStore(getLoopStatePath(input.cwd, input.id), state);
  await appendRuntimeCommandRun(input.cwd, input.runtime, {
    command: "loop-start",
    ok: state.status === "completed",
    details: {
      loop: input.id,
      iterations: state.iterations.length,
      status: state.status,
    },
  });
  return state;
}

export async function readLoopState(cwd: string, id?: string): Promise<LoopState> {
  if (id) {
    const state = await readJsonStore(getLoopStatePath(cwd, id), createDefaultLoopState(), isLoopState);
    if (state.id.length === 0) {
      throw new Error(`Loop '${id}' not found.`);
    }
    return state;
  }

  const root = join(cwd, ".bbg", "loops");
  if (!(await exists(root))) {
    throw new Error("No loop state found. Run `bbg loop-start` first.");
  }

  const candidates = (await readdir(root)).filter((entry) => entry.endsWith(".json")).sort();
  const latest = candidates.at(-1);
  if (!latest) {
    throw new Error("No loop state found. Run `bbg loop-start` first.");
  }

  return readJsonStore(join(root, latest), createDefaultLoopState(), isLoopState);
}

export async function listLoopStates(cwd: string): Promise<LoopState[]> {
  const root = join(cwd, ".bbg", "loops");
  if (!(await exists(root))) {
    return [];
  }

  const entries = (await readdir(root)).filter((entry) => entry.endsWith(".json")).sort();
  const states = await Promise.all(
    entries.map((entry) => readJsonStore(join(root, entry), createDefaultLoopState(), isLoopState)),
  );

  return states
    .filter((state) => state.id.length > 0)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
