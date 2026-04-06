#!/usr/bin/env node

/**
 * build-repo-map.js - File-level repo map builder with importance scoring.
 *
 * Walks the project directory tree, scores each file by recency, import
 * popularity, and file role, then writes `.bbg/context/repo-map.json`.
 *
 * Usage: node .bbg/scripts/build-repo-map.js [--root <dir>]
 *
 * Zero dependencies - uses only Node.js built-ins.
 */

import { readdir, stat, readFile, mkdir, writeFile } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const ROOT = process.argv.includes("--root")
  ? process.argv[process.argv.indexOf("--root") + 1]
  : process.cwd();

const OUTPUT_DIR = join(ROOT, ".bbg", "context");
const OUTPUT_FILE = join(OUTPUT_DIR, "repo-map.json");

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".bbg",
  "dist",
  "build",
  "out",
  ".next",
  "__pycache__",
  ".mypy_cache",
  ".pytest_cache",
  "target",
  "vendor",
  ".venv",
  "venv",
  "coverage",
  ".turbo",
  ".cache",
]);

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".php",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".rb",
  ".swift",
  ".vue",
  ".svelte",
  ".astro",
]);

const ENTRY_PATTERNS = [
  /^(main|index|app|cli|server|mod)\./,
  /^(package|cargo|go|build|pom)\./,
  /\.(config|rc)\./,
  /^(tsconfig|vite\.config|next\.config|webpack\.config)/,
];

const TEST_PATTERNS = [
  /\.test\.|\.spec\.|_test\.|_spec\./,
  /^test_|^spec_/, 
  /\/__tests__\//,
  /\/tests?\//,
];

const GENERATED_PATTERNS = [/\.d\.ts$/, /\.min\.js$/, /\.map$/, /\.lock$/, /generated|auto-gen/i];

async function walkDir(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(fullPath, files);
      continue;
    }
    if (entry.isFile() && CODE_EXTENSIONS.has(extname(entry.name))) {
      const fileStat = await stat(fullPath);
      files.push({
        path: relative(ROOT, fullPath),
        name: entry.name,
        size: fileStat.size,
        modifiedAt: fileStat.mtimeMs,
      });
    }
  }
  return files;
}

async function buildImportCounts(files) {
  const counts = new Map();
  for (const file of files) counts.set(file.path, 0);

  for (const file of files) {
    try {
      const content = await readFile(join(ROOT, file.path), "utf-8");
      for (const other of files) {
        if (other.path === file.path) continue;
        const stem = other.name.replace(extname(other.name), "");
        const pattern = new RegExp(
          `(?:from\\s+['\"]|import\\s+['\"]|require\\s*\\(\\s*['\"])[^'\"]*${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['\")]`,
        );
        if (pattern.test(content)) {
          counts.set(other.path, (counts.get(other.path) ?? 0) + 1);
        }
      }
    } catch {
      // Skip unreadable files.
    }
  }

  return counts;
}

function scoreFile(file, importCount, maxImports, oldestMs, newestMs) {
  let score = 0;

  const timeRange = newestMs - oldestMs || 1;
  score += Math.round(((file.modifiedAt - oldestMs) / timeRange) * 30);

  const popularityRatio = maxImports > 0 ? importCount / maxImports : 0;
  score += Math.round(popularityRatio * 30);

  if (ENTRY_PATTERNS.some((pattern) => pattern.test(file.name) || pattern.test(file.path))) {
    score += 25;
  }

  if (TEST_PATTERNS.some((pattern) => pattern.test(file.name) || pattern.test(file.path))) {
    score -= 15;
  }

  if (GENERATED_PATTERNS.some((pattern) => pattern.test(file.name) || pattern.test(file.path))) {
    score -= 20;
  }

  const depth = file.path.split("/").length;
  if (depth <= 2) score += 5;

  return Math.max(0, Math.min(100, score));
}

async function main() {
  const files = await walkDir(ROOT);
  if (files.length === 0) {
    console.log("No code files found.");
    return;
  }

  const importCounts = await buildImportCounts(files);
  const maxImports = Math.max(...importCounts.values(), 1);
  const timestamps = files.map((file) => file.modifiedAt);
  const oldestMs = Math.min(...timestamps);
  const newestMs = Math.max(...timestamps);

  const repoMap = files
    .map((file) => ({
      path: file.path,
      size: file.size,
      importedBy: importCounts.get(file.path) ?? 0,
      importance: scoreFile(
        file,
        importCounts.get(file.path) ?? 0,
        maxImports,
        oldestMs,
        newestMs,
      ),
      isEntry: ENTRY_PATTERNS.some((pattern) => pattern.test(file.name) || pattern.test(file.path)),
      isTest: TEST_PATTERNS.some((pattern) => pattern.test(file.name) || pattern.test(file.path)),
    }))
    .sort((a, b) => b.importance - a.importance);

  const output = {
    generated_at: new Date().toISOString(),
    root: ROOT,
    total_files: repoMap.length,
    files: repoMap,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Repo map: ${repoMap.length} files scored -> ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(`Error building repo map: ${error.message}`);
  process.exit(1);
});
