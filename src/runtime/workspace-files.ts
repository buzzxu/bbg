import { lstat, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

const SKIP_DIRECTORIES = new Set([".bbg", ".git", "coverage", "dist", "node_modules"]);

function isPathInsideDirectory(root: string, target: string): boolean {
  const pathRelative = relative(root, target);
  return pathRelative === "" || (!pathRelative.startsWith("..") && !isAbsolute(pathRelative));
}

async function collectWorkspaceFilesFrom(workspaceRoot: string, currentDir: string): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(currentDir, entry.name);
    const stats = entry.isDirectory() || entry.isFile() || entry.isSymbolicLink() ? undefined : await lstat(entryPath);

    if (entry.isSymbolicLink() || stats?.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory() || stats?.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const realDirectoryPath = await realpath(entryPath);
      if (!isPathInsideDirectory(workspaceRoot, realDirectoryPath)) {
        continue;
      }

      files.push(...await collectWorkspaceFilesFrom(workspaceRoot, entryPath));
      continue;
    }

    if (entry.isFile() || stats?.isFile()) {
      const realFilePath = await realpath(entryPath);
      if (!isPathInsideDirectory(workspaceRoot, realFilePath)) {
        continue;
      }

      files.push(entryPath);
    }
  }

  return files;
}

export async function collectWorkspaceFiles(cwd: string, currentDir = cwd): Promise<string[]> {
  return collectWorkspaceFilesFrom(await realpath(cwd), currentDir);
}

export function toWorkspaceRelativePath(cwd: string, filePath: string): string {
  return relative(cwd, filePath).split("\\").join("/");
}
