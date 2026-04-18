import { mkdir, readdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { execa } from "execa";
import { readJsonStore, writeJsonStore } from "./store.js";
import { exists, writeTextFile } from "../utils/fs.js";
import { slugifyValue } from "../utils/slug.js";

export type TaskEnvStatus = "active" | "finished" | "stale" | "broken";

export interface TaskEnvManifest {
  version: number;
  id: string;
  task: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  gitRoot: string;
  baseRef: string;
  worktreePath: string;
  artifactRoot: string;
  uiArtifactsPath: string;
  logArtifactsPath: string;
  metricArtifactsPath: string;
  traceArtifactsPath: string;
  notesPath: string;
  status: TaskEnvStatus;
}

function createDefaultTaskEnvManifest(): TaskEnvManifest {
  return {
    version: 1,
    id: "",
    task: "",
    slug: "",
    createdAt: "",
    updatedAt: "",
    gitRoot: "",
    baseRef: "HEAD",
    worktreePath: "",
    artifactRoot: "",
    uiArtifactsPath: "",
    logArtifactsPath: "",
    metricArtifactsPath: "",
    traceArtifactsPath: "",
    notesPath: "",
    status: "active",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTaskEnvManifest(value: unknown): value is TaskEnvManifest {
  return isRecord(value)
    && typeof value.version === "number"
    && typeof value.id === "string"
    && typeof value.task === "string"
    && typeof value.slug === "string"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && typeof value.gitRoot === "string"
    && typeof value.baseRef === "string"
    && typeof value.worktreePath === "string"
    && typeof value.artifactRoot === "string"
    && typeof value.uiArtifactsPath === "string"
    && typeof value.logArtifactsPath === "string"
    && typeof value.metricArtifactsPath === "string"
    && typeof value.traceArtifactsPath === "string"
    && typeof value.notesPath === "string"
    && (value.status === "active" || value.status === "finished" || value.status === "stale" || value.status === "broken");
}

export function getTaskEnvRoot(cwd: string, slug: string): string {
  return join(cwd, ".bbg", "task-envs", slug);
}

export function getTaskEnvManifestPath(cwd: string, slug: string): string {
  return join(getTaskEnvRoot(cwd, slug), "manifest.json");
}

async function resolveGitRoot(cwd: string): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"], { cwd });
  return stdout.trim();
}

async function resolveTaskEnvHealth(cwd: string, manifest: TaskEnvManifest): Promise<TaskEnvStatus> {
  if (manifest.status === "finished") {
    return "finished";
  }

  const gitRootPath = join(cwd, manifest.gitRoot);
  if (!(await exists(gitRootPath))) {
    return "broken";
  }

  const worktreePath = join(cwd, manifest.worktreePath);
  if (!(await exists(worktreePath))) {
    return "stale";
  }

  return "active";
}

async function loadTaskEnvManifest(cwd: string, slug: string): Promise<TaskEnvManifest> {
  const manifest = await readJsonStore(getTaskEnvManifestPath(cwd, slug), createDefaultTaskEnvManifest(), isTaskEnvManifest);
  if (manifest.id.length === 0) {
    throw new Error(`Task environment '${slug}' not found.`);
  }
  const status = await resolveTaskEnvHealth(cwd, manifest);
  if (status === manifest.status) {
    return manifest;
  }

  const updatedManifest: TaskEnvManifest = {
    ...manifest,
    status,
    updatedAt: new Date().toISOString(),
  };
  await writeJsonStore(getTaskEnvManifestPath(cwd, slug), updatedManifest);
  return updatedManifest;
}

async function writeNotesTemplate(notesPath: string, manifest: TaskEnvManifest): Promise<void> {
  const content = [
    "# Task Environment Notes",
    "",
    `- Task: ${manifest.task}`,
    `- Worktree: ${manifest.worktreePath}`,
    `- UI Artifacts: ${manifest.uiArtifactsPath}`,
    `- Logs: ${manifest.logArtifactsPath}`,
    `- Metrics: ${manifest.metricArtifactsPath}`,
    `- Traces: ${manifest.traceArtifactsPath}`,
    "",
    "## Verification Targets",
    "",
    "- [ ] UI path reproduced in the task worktree",
    "- [ ] Screenshots or DOM snapshots captured",
    "- [ ] Relevant logs collected",
    "- [ ] Metrics and traces summarized when available",
    "",
  ].join("\n");
  await writeTextFile(notesPath, content);
}

async function createTaskEnvDirectories(cwd: string, slug: string): Promise<Omit<TaskEnvManifest, "version" | "id" | "task" | "createdAt" | "updatedAt" | "gitRoot" | "baseRef" | "status">> {
  const root = getTaskEnvRoot(cwd, slug);
  const worktreePath = join(root, "worktree");
  const artifactRoot = join(root, "artifacts");
  const uiArtifactsPath = join(artifactRoot, "ui");
  const logArtifactsPath = join(artifactRoot, "logs");
  const metricArtifactsPath = join(artifactRoot, "metrics");
  const traceArtifactsPath = join(artifactRoot, "traces");
  const notesPath = join(root, "notes.md");

  await mkdir(uiArtifactsPath, { recursive: true });
  await mkdir(logArtifactsPath, { recursive: true });
  await mkdir(metricArtifactsPath, { recursive: true });
  await mkdir(traceArtifactsPath, { recursive: true });

  return {
    slug,
    worktreePath,
    artifactRoot,
    uiArtifactsPath,
    logArtifactsPath,
    metricArtifactsPath,
    traceArtifactsPath,
    notesPath,
  };
}

export async function startTaskEnv(input: {
  cwd: string;
  task: string;
  baseRef?: string;
}): Promise<TaskEnvManifest> {
  const slug = slugifyValue(input.task);
  const manifestPath = getTaskEnvManifestPath(input.cwd, slug);
  if (await exists(manifestPath)) {
    const existing = await loadTaskEnvManifest(input.cwd, slug);
    if (existing.status === "active") {
      return existing;
    }
    if (existing.status === "finished") {
      throw new Error(`Task environment '${existing.id}' is finished. Use \`bbg task-env attach ${existing.id}\` for inspection or start a new task slug.`);
    }
    throw new Error(`Task environment '${existing.id}' is ${existing.status}. Run \`bbg task-env repair ${existing.id}\` before reuse.`);
  }

  const gitRoot = await resolveGitRoot(input.cwd);
  const createdAt = new Date().toISOString();
  const baseRef = input.baseRef?.trim().length ? input.baseRef.trim() : "HEAD";
  const paths = await createTaskEnvDirectories(input.cwd, slug);

  await execa("git", ["worktree", "add", "--detach", paths.worktreePath, baseRef], { cwd: gitRoot });

  const manifest: TaskEnvManifest = {
    version: 1,
    id: slug,
    task: input.task.trim(),
    slug,
    createdAt,
    updatedAt: createdAt,
    gitRoot: relative(input.cwd, gitRoot).length === 0 ? "." : relative(input.cwd, gitRoot).split("\\").join("/"),
    baseRef,
    worktreePath: relative(input.cwd, paths.worktreePath).split("\\").join("/"),
    artifactRoot: relative(input.cwd, paths.artifactRoot).split("\\").join("/"),
    uiArtifactsPath: relative(input.cwd, paths.uiArtifactsPath).split("\\").join("/"),
    logArtifactsPath: relative(input.cwd, paths.logArtifactsPath).split("\\").join("/"),
    metricArtifactsPath: relative(input.cwd, paths.metricArtifactsPath).split("\\").join("/"),
    traceArtifactsPath: relative(input.cwd, paths.traceArtifactsPath).split("\\").join("/"),
    notesPath: relative(input.cwd, paths.notesPath).split("\\").join("/"),
    status: "active",
  };

  await Promise.all([
    writeJsonStore(manifestPath, manifest),
    writeNotesTemplate(paths.notesPath, manifest),
  ]);

  return manifest;
}

export async function attachTaskEnv(input: { cwd: string; id: string }): Promise<TaskEnvManifest> {
  const slug = slugifyValue(input.id);
  return loadTaskEnvManifest(input.cwd, slug);
}

export async function repairTaskEnv(input: { cwd: string; id: string }): Promise<TaskEnvManifest> {
  const slug = slugifyValue(input.id);
  const manifest = await loadTaskEnvManifest(input.cwd, slug);
  if (manifest.status === "finished") {
    return manifest;
  }
  if (manifest.status === "active") {
    return manifest;
  }

  const worktreePath = join(input.cwd, manifest.worktreePath);
  await rm(worktreePath, { recursive: true, force: true });
  await execa("git", ["worktree", "add", "--detach", worktreePath, manifest.baseRef], {
    cwd: join(input.cwd, manifest.gitRoot),
  });

  const repaired: TaskEnvManifest = {
    ...manifest,
    status: "active",
    updatedAt: new Date().toISOString(),
  };
  await writeJsonStore(getTaskEnvManifestPath(input.cwd, slug), repaired);
  return repaired;
}

export async function finishTaskEnv(input: { cwd: string; id: string }): Promise<TaskEnvManifest> {
  const slug = slugifyValue(input.id);
  const manifestPath = getTaskEnvManifestPath(input.cwd, slug);
  const manifest = await loadTaskEnvManifest(input.cwd, slug);

  const worktreePath = join(input.cwd, manifest.worktreePath);
  if (await exists(worktreePath)) {
    await execa("git", ["worktree", "remove", "--force", worktreePath], { cwd: join(input.cwd, manifest.gitRoot) });
  }

  const updated: TaskEnvManifest = {
    ...manifest,
    updatedAt: new Date().toISOString(),
    status: "finished",
  };

  await writeJsonStore(manifestPath, updated);
  return updated;
}

export async function listTaskEnvs(cwd: string): Promise<TaskEnvManifest[]> {
  const envsRoot = join(cwd, ".bbg", "task-envs");
  if (!(await exists(envsRoot))) {
    return [];
  }

  const entries = await readdir(envsRoot, { withFileTypes: true });
  const manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        try {
          return await loadTaskEnvManifest(cwd, entry.name);
        } catch {
          return createDefaultTaskEnvManifest();
        }
      }),
  );

  return manifests
    .filter((manifest) => manifest.id.length > 0)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function removeTaskEnvArtifacts(cwd: string, id: string): Promise<void> {
  await rm(getTaskEnvRoot(cwd, slugifyValue(id)), { recursive: true, force: true });
}
