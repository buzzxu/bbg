#!/usr/bin/env node

/**
 * session-start.js — Load previous session context and display project status.
 * Reads .bbg/session-state.json and restores TODO state for continuity.
 */

import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

const STATE_PATH = join(process.cwd(), ".bbg", "session-state.json");

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const exists = await fileExists(STATE_PATH);

  if (!exists) {
    console.log("[session-start] No previous session state found. Starting fresh.");
    console.log(`[session-start] Project: bbg @ ${process.cwd()}`);
    return;
  }

  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    const state = JSON.parse(raw);

    console.log("[session-start] Restored previous session context.");
    console.log(`  Last session: ${state.timestamp ?? "unknown"}`);
    console.log(`  Summary: ${state.summary ?? "none"}`);

    if (Array.isArray(state.todos) && state.todos.length > 0) {
      console.log(`  Pending TODOs (${state.todos.length}):`);
      for (const todo of state.todos) {
        const status = todo.done ? "done" : "pending";
        console.log(`    [${status}] ${todo.text}`);
      }
    }

    if (Array.isArray(state.modifiedFiles) && state.modifiedFiles.length > 0) {
      console.log(`  Previously modified files (${state.modifiedFiles.length}):`);
      for (const f of state.modifiedFiles.slice(0, 10)) {
        console.log(`    - ${f}`);
      }
    }
  } catch (err) {
    console.error(`[session-start] Failed to parse session state: ${err.message}`);
  }
}

main().catch((err) => {
  console.error(`[session-start] Error: ${err.message}`);
  process.exit(1);
});
