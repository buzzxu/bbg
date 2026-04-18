import { mkdir, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { readJsonStore, writeJsonStore } from "./store.js";
import { exists, writeTextFile } from "../utils/fs.js";
import { slugifyValue } from "../utils/slug.js";
import { getTaskEnvManifestPath, getTaskEnvRoot, type TaskEnvManifest } from "./task-envs.js";

export interface ObserveSession {
  version: number;
  id: string;
  topic: string;
  createdAt: string;
  updatedAt: string;
  envId: string | null;
  rootPath: string;
  uiArtifactsPath: string;
  logArtifactsPath: string;
  metricArtifactsPath: string;
  traceArtifactsPath: string;
  notesPath: string;
}

export type ObserveEvidenceReadiness = "empty" | "partial" | "ready";

function createDefaultObserveSession(): ObserveSession {
  return {
    version: 1,
    id: "",
    topic: "",
    createdAt: "",
    updatedAt: "",
    envId: null,
    rootPath: "",
    uiArtifactsPath: "",
    logArtifactsPath: "",
    metricArtifactsPath: "",
    traceArtifactsPath: "",
    notesPath: "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isObserveSession(value: unknown): value is ObserveSession {
  return isRecord(value)
    && typeof value.version === "number"
    && typeof value.id === "string"
    && typeof value.topic === "string"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && (value.envId === null || typeof value.envId === "string")
    && typeof value.rootPath === "string"
    && typeof value.uiArtifactsPath === "string"
    && typeof value.logArtifactsPath === "string"
    && typeof value.metricArtifactsPath === "string"
    && typeof value.traceArtifactsPath === "string"
    && typeof value.notesPath === "string";
}

function getObserveRoot(cwd: string, slug: string): string {
  return join(cwd, ".bbg", "observations", slug);
}

function getObserveManifestPath(cwd: string, slug: string): string {
  return join(getObserveRoot(cwd, slug), "manifest.json");
}

function getEnvObserveRoot(cwd: string, envId: string, slug: string): string {
  return join(getTaskEnvRoot(cwd, slugifyValue(envId)), "observations", slug);
}

function getEnvObserveManifestPath(cwd: string, envId: string, slug: string): string {
  return join(getEnvObserveRoot(cwd, envId, slug), "manifest.json");
}

async function loadTaskEnv(cwd: string, envId: string): Promise<TaskEnvManifest> {
  return readJsonStore(getTaskEnvManifestPath(cwd, slugifyValue(envId)), {
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
  }, (value): value is TaskEnvManifest => isRecord(value) && typeof value.id === "string");
}

async function countFiles(pathValue: string): Promise<number> {
  if (!(await exists(pathValue))) {
    return 0;
  }
  return (await readdir(pathValue)).length;
}

export async function startObserveSession(input: {
  cwd: string;
  topic: string;
  envId?: string;
}): Promise<ObserveSession> {
  const slug = slugifyValue(input.topic);
  const createdAt = new Date().toISOString();
  let root = getObserveRoot(input.cwd, slug);
  let manifestPath = getObserveManifestPath(input.cwd, slug);
  let uiArtifactsPath = join(root, "ui");
  let logArtifactsPath = join(root, "logs");
  let metricArtifactsPath = join(root, "metrics");
  let traceArtifactsPath = join(root, "traces");
  let notesPath = join(root, "notes.md");
  let envId: string | null = null;

  if (input.envId) {
    const env = await loadTaskEnv(input.cwd, input.envId);
    if (env.id.length === 0) {
      throw new Error(`Task environment '${input.envId}' not found.`);
    }
    envId = env.id;
    root = getEnvObserveRoot(input.cwd, env.id, slug);
    manifestPath = getEnvObserveManifestPath(input.cwd, env.id, slug);
    uiArtifactsPath = join(input.cwd, env.uiArtifactsPath);
    logArtifactsPath = join(input.cwd, env.logArtifactsPath);
    metricArtifactsPath = join(input.cwd, env.metricArtifactsPath);
    traceArtifactsPath = join(input.cwd, env.traceArtifactsPath);
    notesPath = join(root, "notes.md");
    await mkdir(root, { recursive: true });
  } else {
    await mkdir(uiArtifactsPath, { recursive: true });
    await mkdir(logArtifactsPath, { recursive: true });
    await mkdir(metricArtifactsPath, { recursive: true });
    await mkdir(traceArtifactsPath, { recursive: true });
  }

  if (await exists(manifestPath)) {
    return readJsonStore(manifestPath, createDefaultObserveSession(), isObserveSession);
  }

  const manifest: ObserveSession = {
    version: 1,
    id: slug,
    topic: input.topic.trim(),
    createdAt,
    updatedAt: createdAt,
    envId,
    rootPath: relative(input.cwd, root).split("\\").join("/"),
    uiArtifactsPath: relative(input.cwd, uiArtifactsPath).split("\\").join("/"),
    logArtifactsPath: relative(input.cwd, logArtifactsPath).split("\\").join("/"),
    metricArtifactsPath: relative(input.cwd, metricArtifactsPath).split("\\").join("/"),
    traceArtifactsPath: relative(input.cwd, traceArtifactsPath).split("\\").join("/"),
    notesPath: relative(input.cwd, notesPath).split("\\").join("/"),
  };

  await Promise.all([
    writeJsonStore(manifestPath, manifest),
    writeTextFile(
      notesPath,
      [
        "# Observation Notes",
        "",
        `- Topic: ${manifest.topic}`,
        `- UI Artifacts: ${manifest.uiArtifactsPath}`,
        `- Logs: ${manifest.logArtifactsPath}`,
        `- Metrics: ${manifest.metricArtifactsPath}`,
        `- Traces: ${manifest.traceArtifactsPath}`,
        "",
      ].join("\n"),
    ),
  ]);

  return manifest;
}

export async function readObserveSession(cwd: string, id: string): Promise<ObserveSession> {
  const slug = slugifyValue(id);
  const directPath = getObserveManifestPath(cwd, slug);
  if (await exists(directPath)) {
    return readJsonStore(directPath, createDefaultObserveSession(), isObserveSession);
  }

  const taskEnvRoot = join(cwd, ".bbg", "task-envs");
  if (await exists(taskEnvRoot)) {
    const entries = await readdir(taskEnvRoot, { withFileTypes: true });
    for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
      const candidatePath = getEnvObserveManifestPath(cwd, entry.name, slug);
      if (await exists(candidatePath)) {
        return readJsonStore(candidatePath, createDefaultObserveSession(), isObserveSession);
      }
    }
  }

  throw new Error(`Observation session '${id}' not found.`);
}

export async function summarizeObserveSession(cwd: string, id: string): Promise<ObserveSession & {
  uiArtifacts: number;
  logArtifacts: number;
  metricArtifacts: number;
  traceArtifacts: number;
  evidenceKinds: string[];
  totalArtifacts: number;
  readiness: ObserveEvidenceReadiness;
}> {
  const session = await readObserveSession(cwd, id);
  const uiArtifacts = await countFiles(join(cwd, session.uiArtifactsPath));
  const logArtifacts = await countFiles(join(cwd, session.logArtifactsPath));
  const metricArtifacts = await countFiles(join(cwd, session.metricArtifactsPath));
  const traceArtifacts = await countFiles(join(cwd, session.traceArtifactsPath));
  const evidenceKinds = [
    ...(uiArtifacts > 0 ? ["ui"] : []),
    ...(logArtifacts > 0 ? ["logs"] : []),
    ...(metricArtifacts > 0 ? ["metrics"] : []),
    ...(traceArtifacts > 0 ? ["traces"] : []),
  ];
  const totalArtifacts = uiArtifacts + logArtifacts + metricArtifacts + traceArtifacts;
  const readiness: ObserveEvidenceReadiness = totalArtifacts === 0
    ? "empty"
    : evidenceKinds.length >= 2 || totalArtifacts >= 3
      ? "ready"
      : "partial";

  return {
    ...session,
    uiArtifacts,
    logArtifacts,
    metricArtifacts,
    traceArtifacts,
    evidenceKinds,
    totalArtifacts,
    readiness,
  };
}
