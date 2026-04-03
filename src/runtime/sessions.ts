import { resolveRuntimePaths } from "./paths.js";
import type { RuntimeConfig, SessionHistoryDocument } from "./schema.js";
import { createDefaultSessionHistory } from "./schema.js";
import { appendTelemetryEvent } from "./telemetry.js";
import { readJsonStore, writeJsonStore } from "./store.js";

export interface RuntimeRunRecord {
  command: string;
  ok: boolean;
  timestamp: string;
  details: Record<string, unknown>;
}

interface EvaluationHistoryDocument {
  version: number;
  runs: RuntimeRunRecord[];
}

interface SessionEntry {
  id?: string;
  startedAt?: string;
  endedAt?: string;
  commands?: number;
}

export interface SessionsSummaryResult {
  totalSessions: number;
  latest: SessionEntry | null;
  previous: SessionEntry | null;
  comparison: {
    commandDelta: number;
    durationDeltaMs: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEvaluationHistoryDocument(value: unknown): value is EvaluationHistoryDocument {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.version === "number" && Array.isArray(value.runs);
}

function isSessionHistoryDocument(value: unknown): value is SessionHistoryDocument {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.version === "number" && Array.isArray(value.sessions);
}

function createDefaultEvaluationHistory(): EvaluationHistoryDocument {
  return {
    version: 1,
    runs: [],
  };
}

function toSessionEntry(value: Record<string, unknown>): SessionEntry {
  return {
    id: typeof value.id === "string" ? value.id : undefined,
    startedAt: typeof value.startedAt === "string" ? value.startedAt : undefined,
    endedAt: typeof value.endedAt === "string" ? value.endedAt : undefined,
    commands: typeof value.commands === "number" ? value.commands : undefined,
  };
}

function toDurationMs(session: SessionEntry | null): number {
  if (!session?.startedAt || !session.endedAt) {
    return 0;
  }

  const startedAt = Date.parse(session.startedAt);
  const endedAt = Date.parse(session.endedAt);
  if (Number.isNaN(startedAt) || Number.isNaN(endedAt)) {
    return 0;
  }

  return Math.max(0, endedAt - startedAt);
}

function createSessionEntry(timestamp: string): Record<string, unknown> {
  return {
    id: timestamp,
    startedAt: timestamp,
    endedAt: timestamp,
    commands: 1,
  };
}

function shouldExtendSession(session: SessionEntry | null, timestamp: string): boolean {
  if (session?.startedAt === undefined) {
    return false;
  }

  const previousEndedAt = Date.parse(session.endedAt ?? session.startedAt);
  const currentTime = Date.parse(timestamp);
  if (Number.isNaN(previousEndedAt) || Number.isNaN(currentTime)) {
    return false;
  }

  return currentTime - previousEndedAt <= 30 * 60 * 1000;
}

async function appendSessionHistory(cwd: string, runtime: RuntimeConfig, timestamp: string): Promise<void> {
  if (!runtime.context.enabled) {
    return;
  }

  const paths = resolveRuntimePaths(cwd, runtime);
  const history = await readJsonStore(paths.sessionHistory, createDefaultSessionHistory(), isSessionHistoryDocument);
  const sessions = history.sessions.map((session) => (isRecord(session) ? { ...session } : {}));
  const latest = sessions.at(-1);

  if (shouldExtendSession(latest === undefined ? null : toSessionEntry(latest), timestamp)) {
    const startedAt = typeof latest?.startedAt === "string" ? latest.startedAt : timestamp;
    const commands = typeof latest?.commands === "number" ? latest.commands + 1 : 1;
    sessions[sessions.length - 1] = {
      ...latest,
      startedAt,
      endedAt: timestamp,
      commands,
    };
  } else {
    sessions.push(createSessionEntry(timestamp));
  }

  await writeJsonStore(paths.sessionHistory, {
    version: history.version,
    sessions,
  });
}

export async function appendRuntimeCommandRun(
  cwd: string,
  runtime: RuntimeConfig,
  record: Omit<RuntimeRunRecord, "timestamp"> & { timestamp?: string },
): Promise<void> {
  const timestamp = record.timestamp ?? new Date().toISOString();
  const paths = resolveRuntimePaths(cwd, runtime);

  if (runtime.evaluation.enabled) {
    const history = await readJsonStore(paths.evaluation, createDefaultEvaluationHistory(), isEvaluationHistoryDocument);
    history.runs.push({ ...record, timestamp });
    await writeJsonStore(paths.evaluation, history);
  }

  await appendSessionHistory(cwd, runtime, timestamp);

  await appendTelemetryEvent(cwd, runtime, {
    type: "runtime.command.completed",
    timestamp,
    details: {
      command: record.command,
      ok: record.ok,
      ...record.details,
    },
  });
}

export async function summarizeSessions(cwd: string, runtime: RuntimeConfig): Promise<SessionsSummaryResult> {
  const paths = resolveRuntimePaths(cwd, runtime);
  const history = await readJsonStore(paths.sessionHistory, createDefaultSessionHistory(), isSessionHistoryDocument);
  const sessions = history.sessions.map((session) => toSessionEntry(session));
  const latest = sessions.at(-1) ?? null;
  const previous = sessions.at(-2) ?? null;

  const result = {
    totalSessions: sessions.length,
    latest,
    previous,
    comparison: {
      commandDelta: (latest?.commands ?? 0) - (previous?.commands ?? 0),
      durationDeltaMs: toDurationMs(latest) - toDurationMs(previous),
    },
  };

  await appendRuntimeCommandRun(cwd, runtime, {
    command: "sessions",
    ok: true,
    details: {
      totalSessions: result.totalSessions,
    },
  });

  return result;
}
