import { resolveRuntimePaths } from "./paths.js";
import type { RuntimeConfig } from "./schema.js";
import { readJsonStore, writeJsonStore } from "./store.js";

export interface TelemetryEvent {
  type: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface TelemetryDocument {
  version: number;
  events: TelemetryEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTelemetryEvent(value: unknown): value is TelemetryEvent {
  return isRecord(value) && typeof value.type === "string" && typeof value.timestamp === "string" && isRecord(value.details);
}

function isTelemetryDocument(value: unknown): value is TelemetryDocument {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
   return typeof candidate.version === "number" && Array.isArray(candidate.events) && candidate.events.every(isTelemetryEvent);
}

export function createDefaultTelemetryDocument(): TelemetryDocument {
  return {
    version: 1,
    events: [],
  };
}

export async function readTelemetryDocument(cwd: string, runtime: RuntimeConfig): Promise<TelemetryDocument> {
  const paths = resolveRuntimePaths(cwd, runtime);
  return readJsonStore(paths.telemetry, createDefaultTelemetryDocument(), isTelemetryDocument);
}

export async function appendTelemetryEvent(
  cwd: string,
  runtime: RuntimeConfig,
  event: Omit<TelemetryEvent, "timestamp"> & { timestamp?: string },
): Promise<void> {
  if (!runtime.telemetry.enabled) {
    return;
  }

  const paths = resolveRuntimePaths(cwd, runtime);
  const current = await readTelemetryDocument(cwd, runtime);
  current.events.push({
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString(),
  });
  await writeJsonStore(paths.telemetry, current);
}
