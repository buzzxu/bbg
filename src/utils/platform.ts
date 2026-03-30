import { chmodSync } from "node:fs";

export const isWindows = process.platform === "win32";

export const isMac = process.platform === "darwin";

export const isLinux = process.platform === "linux";

export function makeExecutable(filePath: string): void {
  if (isWindows) {
    return;
  }

  chmodSync(filePath, 0o755);
}

export function normalizeGitIgnorePath(p: string): string {
  const normalized = p
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");

  return normalized || ".";
}
