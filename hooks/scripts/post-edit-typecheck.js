#!/usr/bin/env node

/**
 * post-edit-typecheck.js — Run TypeScript type checking after editing .ts files.
 * Executes tsc --noEmit on the edited file and reports errors.
 */

import { execSync } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const input = await readStdin();
  let toolOutput = {};

  try {
    toolOutput = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const filePath = toolOutput.filePath ?? toolOutput.file_path ?? "";

  if (!filePath || !/\.(ts|tsx)$/.test(filePath)) {
    process.exit(0);
  }

  const tsconfigPath = join(process.cwd(), "tsconfig.json");
  const hasTsconfig = await fileExists(tsconfigPath);

  if (!hasTsconfig) {
    console.log("[typecheck] No tsconfig.json found, skipping.");
    process.exit(0);
  }

  try {
    execSync("npx tsc --noEmit --pretty 2>&1", {
      encoding: "utf-8",
      timeout: 30000,
      cwd: process.cwd(),
    });
    console.log(`[typecheck] No type errors found.`);
  } catch (err) {
    const output = err.stdout ?? err.message ?? "";
    const errorLines = output
      .split("\n")
      .filter((line) => line.includes("error TS"))
      .slice(0, 10);

    if (errorLines.length > 0) {
      console.log(`[typecheck] ${errorLines.length} type error(s) detected:`);
      for (const line of errorLines) {
        console.log(`  ${line.trim()}`);
      }
    } else {
      console.log("[typecheck] Type checking failed with unknown errors.");
    }
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
  console.error(`[typecheck] Error: ${err.message}`);
  process.exit(1);
});
