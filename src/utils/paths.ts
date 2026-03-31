import { join, relative, sep } from "node:path";
import { exists } from "./fs.js";

/**
 * Build the `.bbg/generated-snapshots/` relative path for a workspace-relative file.
 */
export function toSnapshotRelativePath(filePath: string): string {
  return `.bbg/generated-snapshots/${filePath}.gen`;
}

/**
 * Convert an absolute file path to a forward-slash workspace-relative path.
 */
export function normalizeWorkspaceRelativePath(cwd: string, filePath: string): string {
  return relative(cwd, filePath).split(sep).join("/");
}

/**
 * Resolve the built-in templates root directory by probing candidates
 * relative to `commandDir` (= `dirname(fileURLToPath(import.meta.url))` in the caller).
 *
 * The optional `extraCandidates` array is appended after the two default candidates,
 * which allows upgrade.ts to pass `join(cwd, "node_modules", "bbg", "templates")`.
 */
export async function resolveBuiltinTemplatesRoot(
  commandDir: string,
  extraCandidates: string[] = [],
): Promise<string> {
  const candidates = [
    join(commandDir, "..", "..", "templates"),
    join(commandDir, "..", "templates"),
    ...extraCandidates,
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? join(commandDir, "..", "..", "templates");
}

/**
 * Resolve the package root directory by looking for the `agents/` marker directory
 * relative to `commandDir`.
 */
export async function resolvePackageRoot(commandDir: string): Promise<string> {
  const candidates = [
    join(commandDir, "..", ".."),
    join(commandDir, ".."),
  ];

  for (const candidate of candidates) {
    if (await exists(join(candidate, "agents"))) {
      return candidate;
    }
  }

  return candidates[0] ?? join(commandDir, "..", "..");
}
