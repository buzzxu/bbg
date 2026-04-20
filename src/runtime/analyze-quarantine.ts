import { randomUUID } from "node:crypto";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { normalizeWorkspaceRelativePath } from "../utils/paths.js";
import { exists } from "../utils/fs.js";

export const ANALYZE_QUARANTINE_RETENTION_DAYS = 30;

const ANALYZE_QUARANTINE_DIR = [".bbg", "quarantine", "analyze"];
const RETENTION_MS = ANALYZE_QUARANTINE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface AnalyzeQuarantineEntrySummary {
  path: string;
  quarantinedAt: string;
}

export interface AnalyzeQuarantineSummary {
  count: number;
  latestQuarantinedAt: string | null;
  entries: AnalyzeQuarantineEntrySummary[];
}

function getAnalyzeQuarantineDir(cwd: string): string {
  return join(cwd, ...ANALYZE_QUARANTINE_DIR);
}

function buildTimestamp(now: Date): string {
  return now.toISOString().replaceAll("-", "").replaceAll(":", "").replaceAll(".", "");
}

function sanitizeRelativePathForFilename(pathValue: string): string {
  return pathValue
    .replaceAll("\\", "__")
    .replaceAll("/", "__")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function pruneAnalyzeQuarantine(cwd: string, now = new Date()): Promise<void> {
  const quarantineDir = getAnalyzeQuarantineDir(cwd);
  if (!(await exists(quarantineDir))) {
    return;
  }

  const cutoff = now.getTime() - RETENTION_MS;
  const entries = await readdir(quarantineDir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const entryPath = join(quarantineDir, entry.name);
    const entryStat = await stat(entryPath);
    if (entryStat.mtime.getTime() > cutoff) {
      return;
    }

    await rm(entryPath, { recursive: true, force: true });
  }));
}

export async function quarantineAnalyzeRuntimeStore(cwd: string, filePath: string): Promise<string | null> {
  if (!(await exists(filePath))) {
    return null;
  }

  const quarantineDir = getAnalyzeQuarantineDir(cwd);
  await mkdir(quarantineDir, { recursive: true });

  const relativePath = normalizeWorkspaceRelativePath(cwd, filePath);
  const destination = join(
    quarantineDir,
    `${buildTimestamp(new Date())}-${sanitizeRelativePathForFilename(relativePath)}-${randomUUID()}.json`,
  );

  await mkdir(dirname(destination), { recursive: true });
  await rename(filePath, destination);
  return normalizeWorkspaceRelativePath(cwd, destination);
}

export async function readAnalyzeQuarantineSummary(cwd: string): Promise<AnalyzeQuarantineSummary> {
  const quarantineDir = getAnalyzeQuarantineDir(cwd);
  if (!(await exists(quarantineDir))) {
    return {
      count: 0,
      latestQuarantinedAt: null,
      entries: [],
    };
  }

  const entries = await readdir(quarantineDir, { withFileTypes: true });
  const summaries = (await Promise.all(entries
    .filter((entry) => entry.isFile())
    .map(async (entry) => {
      const entryPath = join(quarantineDir, entry.name);
      const entryStat = await stat(entryPath);
      return {
        path: normalizeWorkspaceRelativePath(cwd, entryPath),
        quarantinedAt: entryStat.mtime.toISOString(),
      };
    })))
    .sort((left, right) => right.quarantinedAt.localeCompare(left.quarantinedAt));

  return {
    count: summaries.length,
    latestQuarantinedAt: summaries[0]?.quarantinedAt ?? null,
    entries: summaries,
  };
}
