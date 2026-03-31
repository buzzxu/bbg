#!/usr/bin/env node

/**
 * suggest-compact.js — Estimate token usage and suggest compaction.
 * Tracks cumulative edits per session and warns when approaching
 * context window limits to suggest running /compact.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const STATE_DIR = join(process.cwd(), ".bbg");
const TRACKER_PATH = join(STATE_DIR, "token-tracker.json");

const AVG_CHARS_PER_TOKEN = 4;
const CONTEXT_LIMIT_TOKENS = 200000;
const WARN_THRESHOLD = 0.7;
const CRITICAL_THRESHOLD = 0.9;

async function loadTracker() {
  try {
    const raw = await readFile(TRACKER_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { totalChars: 0, editCount: 0, startedAt: new Date().toISOString() };
  }
}

async function saveTracker(tracker) {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(TRACKER_PATH, JSON.stringify(tracker, null, 2), "utf-8");
}

function estimateTokens(charCount) {
  return Math.ceil(charCount / AVG_CHARS_PER_TOKEN);
}

async function main() {
  const input = await readStdin();
  let contentLength = 0;

  try {
    const parsed = JSON.parse(input);
    const content = parsed.content ?? parsed.newString ?? parsed.output ?? "";
    contentLength = content.length;
  } catch {
    contentLength = input.length;
  }

  const tracker = await loadTracker();
  tracker.totalChars += contentLength;
  tracker.editCount += 1;

  const estimatedTokens = estimateTokens(tracker.totalChars);
  const usage = estimatedTokens / CONTEXT_LIMIT_TOKENS;

  await saveTracker(tracker);

  if (usage >= CRITICAL_THRESHOLD) {
    console.log(`[compact] CRITICAL: Estimated ${estimatedTokens.toLocaleString()} tokens used (${(usage * 100).toFixed(0)}%).`);
    console.log(`[compact] Strongly recommend running /compact now to avoid context overflow.`);
  } else if (usage >= WARN_THRESHOLD) {
    console.log(`[compact] WARNING: Estimated ${estimatedTokens.toLocaleString()} tokens used (${(usage * 100).toFixed(0)}%).`);
    console.log(`[compact] Consider running /compact soon.`);
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 1000);
  });
}

main().catch((err) => {
  console.error(`[compact] Error: ${err.message}`);
  process.exit(1);
});
