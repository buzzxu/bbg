import { join, posix } from "node:path";
import type { RuntimeConfig } from "./schema.js";

export interface RuntimePaths {
  telemetry: string;
  evaluation: string;
  policy: string;
  repoMap: string;
  sessionHistory: string;
}

export function isValidRuntimeRelativePath(filePath: string): boolean {
  if (filePath.length === 0 || posix.isAbsolute(filePath)) {
    return false;
  }

  const normalizedPath = posix.normalize(filePath);
  return normalizedPath.startsWith(".bbg/") && normalizedPath !== ".bbg";
}

function resolveRuntimePath(cwd: string, filePath: string): string {
  if (!isValidRuntimeRelativePath(filePath)) {
    throw new Error(`Invalid runtime path: ${filePath}`);
  }

  return join(cwd, filePath);
}

export function resolveRuntimePaths(cwd: string, runtime: RuntimeConfig): RuntimePaths {
  return {
    telemetry: resolveRuntimePath(cwd, runtime.telemetry.file),
    evaluation: resolveRuntimePath(cwd, runtime.evaluation.file),
    policy: resolveRuntimePath(cwd, runtime.policy.file),
    repoMap: resolveRuntimePath(cwd, runtime.context.repoMapFile),
    sessionHistory: resolveRuntimePath(cwd, runtime.context.sessionHistoryFile),
  };
}
