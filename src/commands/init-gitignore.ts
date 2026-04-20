import { join } from "node:path";
import type { RepoEntry } from "../config/schema.js";
import {
  BBG_GITIGNORE_ENTRIES,
  MANAGED_GITIGNORE_BLOCK_START,
  MANAGED_GITIGNORE_BLOCK_END,
} from "../constants.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";

export function buildRepoIgnoreEntries(repos: RepoEntry[]): string[] {
  const seen = new Set<string>();
  const entries: string[] = [];

  for (const repo of repos) {
    const cleanedName = repo.name.trim().replace(/^\/+|\/+$/g, "");
    if (cleanedName.length === 0 || seen.has(cleanedName)) {
      continue;
    }

    seen.add(cleanedName);
    entries.push(`${cleanedName}/`);
  }

  return entries;
}

export async function ensureRootGitignore(cwd: string, repos: RepoEntry[]): Promise<string> {
  const gitignorePath = join(cwd, ".gitignore");
  const hasGitignore = await exists(gitignorePath);
  const existingContent = hasGitignore ? await readTextFile(gitignorePath) : "";
  const originalLines = existingContent.length > 0 ? existingContent.split(/\r?\n/) : [];
  const lines = [...originalLines];
  const managedStartIndex = lines.findIndex((line) => line.trim() === MANAGED_GITIGNORE_BLOCK_START);
  const managedEndIndex = lines.findIndex((line, index) => index > managedStartIndex && line.trim() === MANAGED_GITIGNORE_BLOCK_END);

  if (managedStartIndex >= 0 && managedEndIndex > managedStartIndex) {
    lines.splice(managedStartIndex, managedEndIndex - managedStartIndex + 1);
  }

  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
    lines.pop();
  }

  for (const entry of BBG_GITIGNORE_ENTRIES) {
    if (!lines.some((line) => line.trim() === entry)) {
      lines.push(entry);
    }
  }

  const managedEntries = buildRepoIgnoreEntries(repos);
  if (managedEntries.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push(MANAGED_GITIGNORE_BLOCK_START, ...managedEntries, MANAGED_GITIGNORE_BLOCK_END);
  }

  const outputLines = lines;
  await writeTextFile(gitignorePath, `${outputLines.join("\n")}\n`);
  return gitignorePath;
}

export function removeBbgGitignoreEntries(content: string): string {
  const lines = content.length > 0 ? content.split(/\r?\n/) : [];
  const nextLines: string[] = [];
  let skippingManagedBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === MANAGED_GITIGNORE_BLOCK_START) {
      skippingManagedBlock = true;
      continue;
    }

    if (trimmed === MANAGED_GITIGNORE_BLOCK_END) {
      skippingManagedBlock = false;
      continue;
    }

    if (skippingManagedBlock) {
      continue;
    }

    if (BBG_GITIGNORE_ENTRIES.includes(trimmed as (typeof BBG_GITIGNORE_ENTRIES)[number])) {
      continue;
    }

    nextLines.push(line);
  }

  while (nextLines.length > 0 && nextLines[0]?.trim() === "") {
    nextLines.shift();
  }

  while (nextLines.length > 0 && nextLines[nextLines.length - 1]?.trim() === "") {
    nextLines.pop();
  }

  const normalized = nextLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return normalized.length > 0 ? `${normalized}\n` : "";
}
