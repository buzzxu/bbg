import { randomUUID } from "node:crypto";
import { access } from "node:fs/promises";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Check if a file or directory exists at the given path.
 * This is the single source of truth — never re-implement this function.
 */
export async function exists(pathValue: string): Promise<boolean> {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
}

export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  const tempFilePath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;

  await mkdir(dirname(filePath), { recursive: true });

  try {
    await writeFile(tempFilePath, content, "utf8");
    await rename(tempFilePath, filePath);
  } catch (error: unknown) {
    try {
      await unlink(tempFilePath);
    } catch {}

    throw error;
  }
}
