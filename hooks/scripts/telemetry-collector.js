#!/usr/bin/env node

/**
 * telemetry-collector.js - Records telemetry events to SQLite database.
 * Called by other hooks and commands to track activity.
 *
 * Usage (from other hooks):
 *   node hooks/scripts/telemetry-collector.js <event_type> [json_details]
 *
 * Or pipe JSON via stdin:
 *   echo '{"event_type":"hook_fired","category":"security","details":{}}' | node hooks/scripts/telemetry-collector.js
 *
 * Silently succeeds if SQLite is unavailable - telemetry is non-blocking.
 */

import { execFile } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BBG_DIR = join(process.cwd(), ".bbg");
const DB_PATH = join(BBG_DIR, "telemetry.db");
const SCHEMA_PATH = join(BBG_DIR, "scripts", "telemetry-init.sql");

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures the telemetry database exists. Initializes from schema if missing.
 * Returns true if the database is ready, false otherwise.
 */
async function ensureDatabase() {
  if (await fileExists(DB_PATH)) {
    return true;
  }

  if (!(await fileExists(SCHEMA_PATH))) {
    return false;
  }

  try {
    await mkdir(BBG_DIR, { recursive: true });
    await execFileAsync("sqlite3", [DB_PATH, `.read ${SCHEMA_PATH}`]);
    return true;
  } catch {
    return false;
  }
}

function escapeSqlString(str) {
  if (str == null) {
    return "";
  }

  return String(str).replace(/'/g, "''");
}

function sqlStr(val) {
  return val == null ? "NULL" : `'${escapeSqlString(val)}'`;
}

function sqlNum(val) {
  return val == null ? "NULL" : Number(val);
}

/**
 * Inserts a telemetry event into the database.
 */
async function recordEvent({ event_type, category, session_id, status, duration_ms, details }) {
  const detailsJson = details ? JSON.stringify(details) : null;
  const sql = `
    INSERT INTO telemetry_events (event_type, category, session_id, status, duration_ms, details)
    VALUES ('${escapeSqlString(event_type)}', '${escapeSqlString(category || "general")}', ${sqlStr(session_id)}, '${escapeSqlString(status || "ok")}', ${sqlNum(duration_ms)}, ${sqlStr(detailsJson)});
  `;

  try {
    await execFileAsync("sqlite3", [DB_PATH, sql]);
  } catch (error) {
    if (process.env.BBG_DEBUG) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[telemetry] Failed to record event: ${message}`);
    }
  }
}

/**
 * Inserts a hook hit record.
 */
async function recordHookHit({ hook_name, action, false_positive, details }) {
  const detailsJson = details ? JSON.stringify(details) : null;
  const sql = `
    INSERT INTO hook_hits (hook_name, action, false_positive, details)
    VALUES ('${escapeSqlString(hook_name)}', ${sqlStr(action)}, ${false_positive ? 1 : 0}, ${sqlStr(detailsJson)});
  `;

  try {
    await execFileAsync("sqlite3", [DB_PATH, sql]);
  } catch (error) {
    if (process.env.BBG_DEBUG) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[telemetry] Failed to record hook hit: ${message}`);
    }
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data);
    });
    setTimeout(() => {
      resolve(data);
    }, 1000);
  });
}

async function parseInput() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    const event_type = args[0];
    let details = null;
    if (args[1]) {
      try {
        details = JSON.parse(args[1]);
      } catch {
        details = { raw: args[1] };
      }
    }
    return { event_type, details };
  }

  const stdin = await readStdin();
  if (stdin.trim()) {
    try {
      return JSON.parse(stdin);
    } catch {
      return { event_type: "unknown", details: { raw: stdin.trim() } };
    }
  }

  return null;
}

async function main() {
  const dbReady = await ensureDatabase();
  if (!dbReady) {
    return;
  }

  const input = await parseInput();
  if (!input) {
    return;
  }

  if (input.hook_name) {
    await recordHookHit(input);
  } else if (input.event_type) {
    await recordEvent(input);
  }
}

main().catch((error) => {
  if (process.env.BBG_DEBUG) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[telemetry] Error: ${message}`);
  }
});
