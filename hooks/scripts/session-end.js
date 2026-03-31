#!/usr/bin/env node

/**
 * session-end.js — Save session state and summarize changes.
 * Writes .bbg/session-state.json for next session continuity.
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";

const STATE_DIR = join(process.cwd(), ".bbg");
const STATE_PATH = join(STATE_DIR, "session-state.json");

function getGitChanges() {
  try {
    const diff = execSync("git diff --name-only HEAD", { encoding: "utf-8", timeout: 5000 });
    const staged = execSync("git diff --name-only --cached", { encoding: "utf-8", timeout: 5000 });
    const files = [...new Set([...diff.trim().split("\n"), ...staged.trim().split("\n")])];
    return files.filter(Boolean);
  } catch {
    return [];
  }
}

function getRecentCommitMessages() {
  try {
    const log = execSync("git log --oneline -5", { encoding: "utf-8", timeout: 5000 });
    return log.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

async function loadExistingState() {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function main() {
  const existing = await loadExistingState();
  const modifiedFiles = getGitChanges();
  const recentCommits = getRecentCommitMessages();

  const state = {
    timestamp: new Date().toISOString(),
    summary: modifiedFiles.length > 0
      ? `Modified ${modifiedFiles.length} file(s) this session.`
      : "No file changes detected.",
    modifiedFiles,
    recentCommits,
    todos: existing.todos ?? [],
    sessionCount: (existing.sessionCount ?? 0) + 1,
  };

  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");

  console.log("[session-end] Session state saved.");
  console.log(`  Files modified: ${modifiedFiles.length}`);
  console.log(`  Recent commits: ${recentCommits.length}`);
  console.log(`  State written to: ${STATE_PATH}`);
}

main().catch((err) => {
  console.error(`[session-end] Error: ${err.message}`);
  process.exit(1);
});
