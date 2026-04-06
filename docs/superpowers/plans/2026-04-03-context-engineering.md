# Context Engineering Implementation Plan (Phase 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Context Engineering as generated governance content — repo map builder, 5 language-specific symbol map extractors, SQLite context tables, context-loading and session-memory skills, and context-refresh/budget commands — giving AI tools intelligent context selection for target projects.

**Architecture:** BBG is a generator. All new files are governance content that BBG copies to target projects via `bbg init`. The only `src/` changes are registering new templates in the governance manifest (`src/templates/governance.ts`) and updating test count assertions. The repo-map script, context SQL schema, skills, and commands are always-generated (core). The 5 symbol-map scripts are conditionally generated based on detected languages — they register in the language-specific sections of the manifest, following the same pattern as `LANGUAGE_AGENTS` and `LANGUAGE_SKILLS`. Template files for always-generated scripts live under `templates/generic/.bbg/scripts/`. Each symbol-map script uses only tools from its target language ecosystem (zero extra dependencies).

**Tech Stack:** TypeScript (ESM), vitest, SQLite DDL, Node.js (TypeScript Compiler API), Python (ast module, regex), Bash (go doc, cargo/regex), Handlebars-free copy templates

**Depends on:** Phase 2 (Telemetry) establishes the `BBG_SCRIPTS` array pattern and `templates/generic/.bbg/scripts/` directory. If Phase 2 has not been applied, Task 10 of this plan includes creating the `BBG_SCRIPTS` infrastructure from scratch.

---

## File Map

| Action | File                                                                | Responsibility                                      |
| ------ | ------------------------------------------------------------------- | --------------------------------------------------- |
| Create | `templates/generic/.bbg/scripts/build-repo-map.js`                  | File-level repo map builder with importance scoring |
| Create | `templates/generic/.bbg/scripts/context-schema.sql`                 | 3 tables + 1 view for context tracking              |
| Create | `templates/generic/.bbg/scripts/build-symbol-map-ts.js`             | TypeScript symbol extraction via TS Compiler API    |
| Create | `templates/generic/.bbg/scripts/build-symbol-map-java.py`           | Java symbol extraction via regex + import analysis  |
| Create | `templates/generic/.bbg/scripts/build-symbol-map-go.sh`             | Go symbol extraction via `go doc` + `go list`       |
| Create | `templates/generic/.bbg/scripts/build-symbol-map-rust.sh`           | Rust symbol extraction via regex on `pub` symbols   |
| Create | `templates/generic/.bbg/scripts/build-symbol-map-python.py`         | Python symbol extraction via `ast` module           |
| Create | `skills/context-loading/SKILL.md`                                   | Context loading strategy skill                      |
| Create | `skills/session-memory/SKILL.md`                                    | Long-task session memory skill                      |
| Create | `commands/context-refresh.md`                                       | Refresh repo/symbol maps command                    |
| Create | `commands/context-budget.md`                                        | Check/set context budget command                    |
| Modify | `src/templates/governance.ts:49-71,126-151,172-176,230-296,302-315` | Register all new content (core + conditional)       |
| Modify | `tests/unit/templates/governance.test.ts:60-101,135-136,183-184`    | Update count assertions                             |

---

## Task 1: Create build-repo-map.js

**Files:**

- Create: `templates/generic/.bbg/scripts/build-repo-map.js`

- [ ] **Step 1: Create the directory structure (idempotent)**

Run: `mkdir -p templates/generic/.bbg/scripts`

- [ ] **Step 2: Create build-repo-map.js**

Create `templates/generic/.bbg/scripts/build-repo-map.js`:

```javascript
#!/usr/bin/env node

/**
 * build-repo-map.js — File-level repo map builder with importance scoring.
 *
 * Walks the project directory tree, scores each file by recency, import
 * popularity, and file role, then writes `.bbg/context/repo-map.json`.
 *
 * Usage: node .bbg/scripts/build-repo-map.js [--root <dir>]
 *
 * Zero dependencies — uses only Node.js built-ins.
 */

import { readdir, stat, readFile, mkdir, writeFile } from "node:fs/promises";
import { join, relative, extname, basename } from "node:path";

const ROOT = process.argv.includes("--root") ? process.argv[process.argv.indexOf("--root") + 1] : process.cwd();

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

const TEST_PATTERNS = [/\.test\.|\.spec\.|_test\.|_spec\./, /^test_|^spec_/, /\/__tests__\//, /\/tests?\//];

const GENERATED_PATTERNS = [/\.d\.ts$/, /\.min\.js$/, /\.map$/, /\.lock$/, /generated|auto-gen/i];

/** Walk the directory tree and collect file metadata. */
async function walkDir(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(fullPath, files);
    } else if (entry.isFile() && CODE_EXTENSIONS.has(extname(entry.name))) {
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

/** Count how many other files import/reference a given file. */
async function buildImportCounts(files) {
  const counts = new Map();
  for (const f of files) counts.set(f.path, 0);

  for (const f of files) {
    try {
      const content = await readFile(join(ROOT, f.path), "utf-8");
      for (const other of files) {
        if (other.path === f.path) continue;
        const stem = other.name.replace(extname(other.name), "");
        // Match common import patterns: from './path', import 'path', require('path')
        const pattern = new RegExp(
          `(?:from\\s+['"]|import\\s+['"]|require\\s*\\(\\s*['"])` +
            `[^'"]*${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['")]`,
        );
        if (pattern.test(content)) {
          counts.set(other.path, (counts.get(other.path) || 0) + 1);
        }
      }
    } catch {
      // Skip unreadable files
    }
  }
  return counts;
}

/** Calculate importance score for a file (0-100). */
function scoreFile(file, importCount, nowMs, maxImports, oldestMs, newestMs) {
  let score = 0;
  const name = file.name;
  const path = file.path;

  // Recency: 0-30 points (most recent = 30)
  const timeRange = newestMs - oldestMs || 1;
  score += Math.round(((file.modifiedAt - oldestMs) / timeRange) * 30);

  // Import popularity: 0-30 points
  const popularityRatio = maxImports > 0 ? importCount / maxImports : 0;
  score += Math.round(popularityRatio * 30);

  // Entry/config files: +25 points
  if (ENTRY_PATTERNS.some((p) => p.test(name) || p.test(path))) {
    score += 25;
  }

  // Test files: -15 points
  if (TEST_PATTERNS.some((p) => p.test(name) || p.test(path))) {
    score -= 15;
  }

  // Generated files: -20 points
  if (GENERATED_PATTERNS.some((p) => p.test(name) || p.test(path))) {
    score -= 20;
  }

  // Shallow depth bonus: +5 for files in src/ root
  const depth = path.split("/").length;
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
  const nowMs = Date.now();
  const maxImports = Math.max(...importCounts.values(), 1);
  const timestamps = files.map((f) => f.modifiedAt);
  const oldestMs = Math.min(...timestamps);
  const newestMs = Math.max(...timestamps);

  const repoMap = files
    .map((file) => ({
      path: file.path,
      size: file.size,
      importedBy: importCounts.get(file.path) || 0,
      importance: scoreFile(file, importCounts.get(file.path) || 0, nowMs, maxImports, oldestMs, newestMs),
      isEntry: ENTRY_PATTERNS.some((p) => p.test(file.name) || p.test(file.path)),
      isTest: TEST_PATTERNS.some((p) => p.test(file.name) || p.test(file.path)),
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
  console.log(`Repo map: ${repoMap.length} files scored → ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(`Error building repo map: ${err.message}`);
  process.exit(1);
});
```

- [ ] **Step 3: Verify the file exists**

Run: `wc -l templates/generic/.bbg/scripts/build-repo-map.js`
Expected: ~130-140 lines

- [ ] **Step 4: Commit**

```bash
git add templates/generic/.bbg/scripts/build-repo-map.js
git commit -m "feat: add repo map builder script with importance scoring"
```

---

## Task 2: Create context-schema.sql

**Files:**

- Create: `templates/generic/.bbg/scripts/context-schema.sql`

- [ ] **Step 1: Create context-schema.sql with 3 tables + 1 view**

Create `templates/generic/.bbg/scripts/context-schema.sql`:

```sql
-- =============================================================================
-- context-schema.sql — BBG Context Engineering Schema
-- 3 tables + 1 view for context load tracking, session decisions, and file
-- associations. Run idempotently:
--   sqlite3 .bbg/telemetry.db < .bbg/scripts/context-schema.sql
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Context load tracking — records what context was loaded per session/task.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS context_loads (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp         TEXT    NOT NULL DEFAULT (datetime('now')),
  session_id        TEXT,
  task_type         TEXT,
  files_loaded      INTEGER,
  symbols_loaded    INTEGER,
  tokens_estimated  INTEGER,
  budget_limit      INTEGER,
  budget_used_pct   REAL,
  strategy          TEXT
);

CREATE INDEX IF NOT EXISTS idx_context_loads_session ON context_loads(session_id);
CREATE INDEX IF NOT EXISTS idx_context_loads_task    ON context_loads(task_type);

-- ---------------------------------------------------------------------------
-- Session decisions — step-by-step decision log for long-running tasks.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS session_decisions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp         TEXT    NOT NULL DEFAULT (datetime('now')),
  session_id        TEXT    NOT NULL,
  task_id           TEXT,
  step              TEXT    NOT NULL,
  decision          TEXT    NOT NULL,
  reason            TEXT,
  outcome           TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_decisions_sid  ON session_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_decisions_task ON session_decisions(task_id);

-- ---------------------------------------------------------------------------
-- File associations — links files to entities (tasks, agents, skills, etc.).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS file_associations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path         TEXT    NOT NULL,
  entity_type       TEXT    NOT NULL,
  entity_id         TEXT    NOT NULL,
  relation          TEXT    NOT NULL,
  timestamp         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_file_assoc_path   ON file_associations(file_path);
CREATE INDEX IF NOT EXISTS idx_file_assoc_entity ON file_associations(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- View: context efficiency — average load stats grouped by task type.
-- ---------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS v_context_efficiency AS
SELECT
  task_type,
  AVG(files_loaded)     AS avg_files,
  AVG(tokens_estimated) AS avg_tokens,
  AVG(budget_used_pct)  AS avg_budget_usage,
  COUNT(*)              AS total_loads
FROM context_loads
GROUP BY task_type;
```

- [ ] **Step 2: Verify the file exists**

Run: `wc -l templates/generic/.bbg/scripts/context-schema.sql`
Expected: ~75-85 lines

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/scripts/context-schema.sql
git commit -m "feat: add context engineering SQLite schema (3 tables, 1 view)"
```

---

## Task 3: Create build-symbol-map-ts.js

**Files:**

- Create: `templates/generic/.bbg/scripts/build-symbol-map-ts.js`

- [ ] **Step 1: Create build-symbol-map-ts.js**

Create `templates/generic/.bbg/scripts/build-symbol-map-ts.js`:

```javascript
#!/usr/bin/env node

/**
 * build-symbol-map-ts.js — TypeScript/JavaScript symbol extractor.
 *
 * Uses the TypeScript Compiler API (available in any TS project) to parse
 * source files and extract exported classes, functions, interfaces, types,
 * and enums with their dependencies.
 *
 * Usage: node .bbg/scripts/build-symbol-map-ts.js [--root <dir>] [--tsconfig <path>]
 *
 * Output: .bbg/context/symbol-map.json (unified format)
 *
 * Zero extra dependencies — requires only the `typescript` package already
 * present in TypeScript projects.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.argv.includes("--root") ? process.argv[process.argv.indexOf("--root") + 1] : process.cwd();

const TSCONFIG = process.argv.includes("--tsconfig")
  ? process.argv[process.argv.indexOf("--tsconfig") + 1]
  : join(ROOT, "tsconfig.json");

const OUTPUT_DIR = join(ROOT, ".bbg", "context");
const OUTPUT_FILE = join(OUTPUT_DIR, "symbol-map.json");

async function main() {
  let ts;
  try {
    ts = await import("typescript");
    if (ts.default) ts = ts.default;
  } catch {
    console.error("TypeScript not found. Install typescript in your project.");
    process.exit(1);
  }

  const configFile = ts.readConfigFile(TSCONFIG, (p) => readFileSync(p, "utf-8"));
  if (configFile.error) {
    console.error(`Cannot read ${TSCONFIG}: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`);
    process.exit(1);
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const symbols = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    const filePath = relative(ROOT, sourceFile.fileName);
    if (filePath.startsWith("node_modules")) continue;

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;

    const exports = checker.getExportsOfModule(moduleSymbol);
    for (const exp of exports) {
      const declarations = exp.getDeclarations();
      if (!declarations || declarations.length === 0) continue;
      const decl = declarations[0];
      const { line } = sourceFile.getLineAndCharacterOfPosition(decl.getStart());

      const kind = getSymbolKind(ts, decl);
      const modifiers = getModifiers(ts, decl);
      const dependencies = extractDependencies(ts, decl, checker);

      symbols.push({
        name: exp.getName(),
        kind,
        file: filePath,
        line: line + 1,
        exported: true,
        modifiers,
        dependencies,
        dependents: [],
        signature: kind === "function" ? getSignature(ts, decl, checker) : null,
      });
    }
  }

  // Resolve dependents (reverse lookup)
  const nameToIndex = new Map();
  symbols.forEach((s, i) => nameToIndex.set(s.name, i));
  for (const sym of symbols) {
    for (const dep of sym.dependencies) {
      const idx = nameToIndex.get(dep);
      if (idx !== undefined && !symbols[idx].dependents.includes(sym.name)) {
        symbols[idx].dependents.push(sym.name);
      }
    }
  }

  const output = {
    generated_at: new Date().toISOString(),
    language: "typescript",
    extractor: "build-symbol-map-ts.js",
    symbols,
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Symbol map: ${symbols.length} symbols extracted → ${OUTPUT_FILE}`);
}

function getSymbolKind(ts, decl) {
  if (ts.isClassDeclaration(decl)) return "class";
  if (ts.isFunctionDeclaration(decl)) return "function";
  if (ts.isInterfaceDeclaration(decl)) return "interface";
  if (ts.isTypeAliasDeclaration(decl)) return "type";
  if (ts.isEnumDeclaration(decl)) return "enum";
  if (ts.isVariableDeclaration(decl)) return "variable";
  return "unknown";
}

function getModifiers(ts, decl) {
  const mods = [];
  const modifiers = ts.canHaveModifiers(decl) ? ts.getModifiers(decl) : undefined;
  if (modifiers) {
    for (const mod of modifiers) {
      if (mod.kind === ts.SyntaxKind.ExportKeyword) mods.push("export");
      if (mod.kind === ts.SyntaxKind.DefaultKeyword) mods.push("default");
      if (mod.kind === ts.SyntaxKind.AsyncKeyword) mods.push("async");
      if (mod.kind === ts.SyntaxKind.AbstractKeyword) mods.push("abstract");
    }
  }
  return mods;
}

function extractDependencies(ts, decl, checker) {
  const deps = new Set();
  function visit(node) {
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      deps.add(node.typeName.text);
    }
    if (ts.isIdentifier(node) && node.parent && ts.isHeritageClause(node.parent.parent)) {
      deps.add(node.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(decl);
  return [...deps];
}

function getSignature(ts, decl, checker) {
  if (!ts.isFunctionDeclaration(decl) || !decl.name) return null;
  const symbol = checker.getSymbolAtLocation(decl.name);
  if (!symbol) return null;
  const type = checker.getTypeOfSymbolAtLocation(symbol, decl);
  const signatures = type.getCallSignatures();
  if (signatures.length === 0) return null;
  return checker.signatureToString(signatures[0]);
}

main().catch((err) => {
  console.error(`Error extracting symbols: ${err.message}`);
  process.exit(1);
});
```

- [ ] **Step 2: Verify the file exists**

Run: `wc -l templates/generic/.bbg/scripts/build-symbol-map-ts.js`
Expected: ~130-145 lines

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/scripts/build-symbol-map-ts.js
git commit -m "feat: add TypeScript symbol map extractor using TS Compiler API"
```

---

## Task 4: Create build-symbol-map-java.py

**Files:**

- Create: `templates/generic/.bbg/scripts/build-symbol-map-java.py`

- [ ] **Step 1: Create build-symbol-map-java.py**

Create `templates/generic/.bbg/scripts/build-symbol-map-java.py`:

```python
#!/usr/bin/env python3

"""
build-symbol-map-java.py — Java symbol extractor via regex + import analysis.

Parses Java source files using regex to extract public classes, interfaces,
enums, methods, and their import dependencies.

Usage: python .bbg/scripts/build-symbol-map-java.py [--root <dir>]

Output: .bbg/context/symbol-map.json (unified format)

Zero extra dependencies — uses only Python standard library.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(".")
for i, arg in enumerate(sys.argv[1:], 1):
    if arg == "--root" and i < len(sys.argv) - 1:
        ROOT = Path(sys.argv[i + 1])
        break

OUTPUT_DIR = ROOT / ".bbg" / "context"
OUTPUT_FILE = OUTPUT_DIR / "symbol-map.json"

IGNORE_DIRS = {"node_modules", ".git", ".bbg", "build", "target", ".gradle", ".idea", "out"}

# Regex patterns for Java declarations
CLASS_PATTERN = re.compile(
    r"^(\s*)(public|protected|private)?\s*(static\s+)?(abstract\s+)?(final\s+)?class\s+(\w+)"
    r"(?:\s+extends\s+(\w+))?"
    r"(?:\s+implements\s+([\w,\s]+))?",
    re.MULTILINE,
)
INTERFACE_PATTERN = re.compile(
    r"^(\s*)(public|protected|private)?\s*(static\s+)?interface\s+(\w+)"
    r"(?:\s+extends\s+([\w,\s]+))?",
    re.MULTILINE,
)
ENUM_PATTERN = re.compile(
    r"^(\s*)(public|protected|private)?\s*enum\s+(\w+)",
    re.MULTILINE,
)
METHOD_PATTERN = re.compile(
    r"^(\s*)(public|protected|private)\s+(static\s+)?([\w<>\[\],\s]+?)\s+(\w+)\s*\(",
    re.MULTILINE,
)
IMPORT_PATTERN = re.compile(r"^import\s+(static\s+)?([\w.]+)\s*;", re.MULTILINE)


def find_java_files(root):
    """Walk directory tree and yield .java source file paths."""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for fname in filenames:
            if fname.endswith(".java"):
                yield Path(dirpath) / fname


def extract_imports(content):
    """Extract imported type names from Java source."""
    deps = []
    for match in IMPORT_PATTERN.finditer(content):
        full_import = match.group(2)
        # Get the simple class name (last segment)
        simple_name = full_import.split(".")[-1]
        if simple_name != "*":
            deps.append(simple_name)
    return deps


def extract_symbols(filepath, content, rel_path):
    """Extract classes, interfaces, enums, and public methods."""
    symbols = []
    lines = content.split("\n")
    imports = extract_imports(content)

    for match in CLASS_PATTERN.finditer(content):
        line_num = content[: match.start()].count("\n") + 1
        name = match.group(6)
        modifiers = [m.strip() for m in [match.group(2), match.group(3), match.group(4), match.group(5)] if m]
        deps = list(imports)
        if match.group(7):
            deps.append(match.group(7).strip())
        if match.group(8):
            deps.extend([d.strip() for d in match.group(8).split(",")])
        symbols.append({
            "name": name,
            "kind": "class",
            "file": str(rel_path),
            "line": line_num,
            "exported": "public" in modifiers,
            "modifiers": modifiers,
            "dependencies": list(set(deps)),
            "dependents": [],
            "signature": None,
        })

    for match in INTERFACE_PATTERN.finditer(content):
        line_num = content[: match.start()].count("\n") + 1
        name = match.group(4)
        modifiers = [m.strip() for m in [match.group(2), match.group(3)] if m]
        deps = list(imports)
        if match.group(5):
            deps.extend([d.strip() for d in match.group(5).split(",")])
        symbols.append({
            "name": name,
            "kind": "interface",
            "file": str(rel_path),
            "line": line_num,
            "exported": "public" in modifiers,
            "modifiers": modifiers,
            "dependencies": list(set(deps)),
            "dependents": [],
            "signature": None,
        })

    for match in ENUM_PATTERN.finditer(content):
        line_num = content[: match.start()].count("\n") + 1
        name = match.group(3)
        modifiers = [m.strip() for m in [match.group(2)] if m]
        symbols.append({
            "name": name,
            "kind": "enum",
            "file": str(rel_path),
            "line": line_num,
            "exported": "public" in modifiers,
            "modifiers": modifiers,
            "dependencies": list(imports),
            "dependents": [],
            "signature": None,
        })

    return symbols


def main():
    all_symbols = []
    for filepath in find_java_files(ROOT):
        try:
            content = filepath.read_text(encoding="utf-8")
            rel_path = filepath.relative_to(ROOT)
            all_symbols.extend(extract_symbols(filepath, content, rel_path))
        except (OSError, UnicodeDecodeError):
            continue

    # Resolve dependents
    name_to_indices = {}
    for i, sym in enumerate(all_symbols):
        name_to_indices.setdefault(sym["name"], []).append(i)
    for sym in all_symbols:
        for dep in sym["dependencies"]:
            for idx in name_to_indices.get(dep, []):
                if sym["name"] not in all_symbols[idx]["dependents"]:
                    all_symbols[idx]["dependents"].append(sym["name"])

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "language": "java",
        "extractor": "build-symbol-map-java.py",
        "symbols": all_symbols,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(output, indent=2))
    print(f"Symbol map: {len(all_symbols)} symbols extracted → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Verify the file exists**

Run: `wc -l templates/generic/.bbg/scripts/build-symbol-map-java.py`
Expected: ~130-145 lines

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/scripts/build-symbol-map-java.py
git commit -m "feat: add Java symbol map extractor using regex + import analysis"
```

---

## Task 5: Create build-symbol-map-go.sh

**Files:**

- Create: `templates/generic/.bbg/scripts/build-symbol-map-go.sh`

- [ ] **Step 1: Create build-symbol-map-go.sh**

Create `templates/generic/.bbg/scripts/build-symbol-map-go.sh`:

```bash
#!/usr/bin/env bash

# build-symbol-map-go.sh — Go symbol extractor via go doc + go list.
#
# Uses `go list -json` to enumerate packages and `go doc` to extract
# exported symbols with their types and signatures.
#
# Usage: bash .bbg/scripts/build-symbol-map-go.sh [--root <dir>]
#
# Output: .bbg/context/symbol-map.json (unified format)
#
# Zero extra dependencies — uses only Go toolchain (go doc, go list).

set -euo pipefail

ROOT="."
while [[ $# -gt 0 ]]; do
  case "$1" in
    --root) ROOT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

OUTPUT_DIR="$ROOT/.bbg/context"
OUTPUT_FILE="$OUTPUT_DIR/symbol-map.json"
TEMP_FILE="$(mktemp)"

mkdir -p "$OUTPUT_DIR"

cd "$ROOT"

# Collect all local packages
PACKAGES=$(go list ./... 2>/dev/null || echo "")
if [ -z "$PACKAGES" ]; then
  echo '{"generated_at":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","language":"go","extractor":"build-symbol-map-go.sh","symbols":[]}' > "$OUTPUT_FILE"
  echo "No Go packages found."
  exit 0
fi

MODULE_PATH=$(go list -m 2>/dev/null || echo "")

# Start JSON array
echo '[' > "$TEMP_FILE"
FIRST=true

for PKG in $PACKAGES; do
  # Get package dir relative to root
  PKG_DIR=$(go list -f '{{.Dir}}' "$PKG" 2>/dev/null || continue)
  REL_DIR=$(realpath --relative-to="$PWD" "$PKG_DIR" 2>/dev/null || echo "$PKG_DIR")

  # Get exported symbols via go doc
  DOC_OUTPUT=$(go doc -all "$PKG" 2>/dev/null || continue)

  # Extract function signatures
  while IFS= read -r line; do
    FUNC_NAME=$(echo "$line" | sed -n 's/^func \([A-Z][A-Za-z0-9_]*\).*/\1/p')
    if [ -n "$FUNC_NAME" ]; then
      SIGNATURE=$(echo "$line" | sed 's/^func //')
      # Find the line number in source files
      LINE_NUM=0
      for gofile in "$PKG_DIR"/*.go; do
        [ -f "$gofile" ] || continue
        FOUND=$(grep -n "^func ${FUNC_NAME}" "$gofile" 2>/dev/null | head -1 | cut -d: -f1)
        if [ -n "$FOUND" ]; then
          LINE_NUM=$FOUND
          REL_FILE=$(realpath --relative-to="$PWD" "$gofile" 2>/dev/null || echo "$gofile")
          break
        fi
      done

      [ "$FIRST" = true ] && FIRST=false || echo ',' >> "$TEMP_FILE"
      cat >> "$TEMP_FILE" <<ENTRY
{"name":"$FUNC_NAME","kind":"function","file":"${REL_FILE:-$REL_DIR}","line":$LINE_NUM,"exported":true,"modifiers":["public"],"dependencies":[],"dependents":[],"signature":"$SIGNATURE"}
ENTRY
    fi
  done <<< "$DOC_OUTPUT"

  # Extract type declarations
  while IFS= read -r line; do
    TYPE_NAME=$(echo "$line" | sed -n 's/^type \([A-Z][A-Za-z0-9_]*\) \(struct\|interface\|int\|string\|.*\)/\1/p')
    KIND=$(echo "$line" | sed -n 's/^type [A-Z][A-Za-z0-9_]* \(struct\|interface\).*/\1/p')
    [ -z "$KIND" ] && KIND="type"
    if [ -n "$TYPE_NAME" ]; then
      LINE_NUM=0
      for gofile in "$PKG_DIR"/*.go; do
        [ -f "$gofile" ] || continue
        FOUND=$(grep -n "^type ${TYPE_NAME} " "$gofile" 2>/dev/null | head -1 | cut -d: -f1)
        if [ -n "$FOUND" ]; then
          LINE_NUM=$FOUND
          REL_FILE=$(realpath --relative-to="$PWD" "$gofile" 2>/dev/null || echo "$gofile")
          break
        fi
      done

      [ "$FIRST" = true ] && FIRST=false || echo ',' >> "$TEMP_FILE"
      cat >> "$TEMP_FILE" <<ENTRY
{"name":"$TYPE_NAME","kind":"$KIND","file":"${REL_FILE:-$REL_DIR}","line":$LINE_NUM,"exported":true,"modifiers":["public"],"dependencies":[],"dependents":[],"signature":null}
ENTRY
    fi
  done <<< "$DOC_OUTPUT"
done

echo ']' >> "$TEMP_FILE"

# Wrap in unified output format
GENERATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SYMBOLS=$(cat "$TEMP_FILE")
cat > "$OUTPUT_FILE" <<EOF
{
  "generated_at": "$GENERATED_AT",
  "language": "go",
  "extractor": "build-symbol-map-go.sh",
  "symbols": $SYMBOLS
}
EOF

rm -f "$TEMP_FILE"
SYMBOL_COUNT=$(echo "$SYMBOLS" | grep -c '"name"' || echo "0")
echo "Symbol map: $SYMBOL_COUNT symbols extracted → $OUTPUT_FILE"
```

- [ ] **Step 2: Verify the file exists**

Run: `wc -l templates/generic/.bbg/scripts/build-symbol-map-go.sh`
Expected: ~100-115 lines

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/scripts/build-symbol-map-go.sh
git commit -m "feat: add Go symbol map extractor using go doc + go list"
```

---

## Task 6: Create build-symbol-map-rust.sh

**Files:**

- Create: `templates/generic/.bbg/scripts/build-symbol-map-rust.sh`

- [ ] **Step 1: Create build-symbol-map-rust.sh**

Create `templates/generic/.bbg/scripts/build-symbol-map-rust.sh`:

```bash
#!/usr/bin/env bash

# build-symbol-map-rust.sh — Rust symbol extractor via regex on pub symbols.
#
# Scans .rs source files for `pub` declarations (fn, struct, enum, trait,
# type, const, mod) and extracts `use` dependencies.
#
# Usage: bash .bbg/scripts/build-symbol-map-rust.sh [--root <dir>]
#
# Output: .bbg/context/symbol-map.json (unified format)
#
# Zero extra dependencies — uses only bash, grep, sed, and find.

set -euo pipefail

ROOT="."
while [[ $# -gt 0 ]]; do
  case "$1" in
    --root) ROOT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

OUTPUT_DIR="$ROOT/.bbg/context"
OUTPUT_FILE="$OUTPUT_DIR/symbol-map.json"

mkdir -p "$OUTPUT_DIR"

# Collect all .rs source files (skip target/ and hidden dirs)
RS_FILES=$(find "$ROOT" -name "*.rs" \
  -not -path "*/target/*" \
  -not -path "*/.git/*" \
  -not -path "*/.bbg/*" \
  -not -path "*/node_modules/*" \
  2>/dev/null | sort)

if [ -z "$RS_FILES" ]; then
  echo '{"generated_at":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","language":"rust","extractor":"build-symbol-map-rust.sh","symbols":[]}' > "$OUTPUT_FILE"
  echo "No Rust source files found."
  exit 0
fi

GENERATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
FIRST=true

# Start output
echo '{"generated_at":"'"$GENERATED_AT"'","language":"rust","extractor":"build-symbol-map-rust.sh","symbols":[' > "$OUTPUT_FILE"

for FILE in $RS_FILES; do
  REL_FILE=$(realpath --relative-to="$ROOT" "$FILE" 2>/dev/null || echo "$FILE")

  # Extract use dependencies for this file
  DEPS=$(grep -E '^\s*use\s+' "$FILE" 2>/dev/null | \
    sed 's/.*use\s\+//' | sed 's/\s*;.*//' | \
    sed 's/.*:://' | sed 's/[{},]/ /g' | \
    tr ' ' '\n' | grep -E '^[A-Z]' | sort -u | \
    awk '{printf "\"%s\",", $0}' | sed 's/,$//')
  [ -z "$DEPS" ] && DEPS_ARR="[]" || DEPS_ARR="[$DEPS]"

  # Extract pub fn declarations
  grep -nE '^\s*pub(\s+async)?\s+fn\s+' "$FILE" 2>/dev/null | while IFS=: read -r LINE_NUM LINE_CONTENT; do
    FUNC_NAME=$(echo "$LINE_CONTENT" | sed -n 's/.*pub\s\+\(async\s\+\)\?fn\s\+\([a-zA-Z_][a-zA-Z0-9_]*\).*/\2/p')
    [ -z "$FUNC_NAME" ] && continue
    SIGNATURE=$(echo "$LINE_CONTENT" | sed 's/^\s*//' | sed 's/\s*{.*//')
    # Escape quotes in signature for JSON
    SIGNATURE=$(echo "$SIGNATURE" | sed 's/"/\\"/g')
    MODS='["public"]'
    echo "$LINE_CONTENT" | grep -q "async" && MODS='["public","async"]'

    [ "$FIRST" = true ] && FIRST=false || printf ',' >> "$OUTPUT_FILE"
    printf '{"name":"%s","kind":"function","file":"%s","line":%s,"exported":true,"modifiers":%s,"dependencies":%s,"dependents":[],"signature":"%s"}' \
      "$FUNC_NAME" "$REL_FILE" "$LINE_NUM" "$MODS" "$DEPS_ARR" "$SIGNATURE" >> "$OUTPUT_FILE"
  done

  # Extract pub struct/enum/trait/type declarations
  grep -nE '^\s*pub\s+(struct|enum|trait|type)\s+' "$FILE" 2>/dev/null | while IFS=: read -r LINE_NUM LINE_CONTENT; do
    KIND=$(echo "$LINE_CONTENT" | sed -n 's/.*pub\s\+\(struct\|enum\|trait\|type\)\s\+.*/\1/p')
    NAME=$(echo "$LINE_CONTENT" | sed -n 's/.*pub\s\+\(struct\|enum\|trait\|type\)\s\+\([A-Za-z_][A-Za-z0-9_]*\).*/\2/p')
    [ -z "$NAME" ] && continue

    [ "$FIRST" = true ] && FIRST=false || printf ',' >> "$OUTPUT_FILE"
    printf '{"name":"%s","kind":"%s","file":"%s","line":%s,"exported":true,"modifiers":["public"],"dependencies":%s,"dependents":[],"signature":null}' \
      "$NAME" "$KIND" "$REL_FILE" "$LINE_NUM" "$DEPS_ARR" >> "$OUTPUT_FILE"
  done
done

echo ']}' >> "$OUTPUT_FILE"

SYMBOL_COUNT=$(grep -c '"name"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
echo "Symbol map: $SYMBOL_COUNT symbols extracted → $OUTPUT_FILE"
```

- [ ] **Step 2: Verify the file exists**

Run: `wc -l templates/generic/.bbg/scripts/build-symbol-map-rust.sh`
Expected: ~90-105 lines

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/scripts/build-symbol-map-rust.sh
git commit -m "feat: add Rust symbol map extractor using pub regex + use deps"
```

---

## Task 7: Create build-symbol-map-python.py

**Files:**

- Create: `templates/generic/.bbg/scripts/build-symbol-map-python.py`

- [ ] **Step 1: Create build-symbol-map-python.py**

Create `templates/generic/.bbg/scripts/build-symbol-map-python.py`:

```python
#!/usr/bin/env python3

"""
build-symbol-map-python.py — Python symbol extractor using the ast module.

Parses Python source files using the built-in ast module to extract classes,
functions, and their import dependencies.

Usage: python .bbg/scripts/build-symbol-map-python.py [--root <dir>]

Output: .bbg/context/symbol-map.json (unified format)

Zero extra dependencies — uses only Python standard library (ast module).
"""

import ast
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(".")
for i, arg in enumerate(sys.argv[1:], 1):
    if arg == "--root" and i < len(sys.argv) - 1:
        ROOT = Path(sys.argv[i + 1])
        break

OUTPUT_DIR = ROOT / ".bbg" / "context"
OUTPUT_FILE = OUTPUT_DIR / "symbol-map.json"

IGNORE_DIRS = {
    "node_modules", ".git", ".bbg", "__pycache__", ".mypy_cache",
    ".pytest_cache", ".venv", "venv", "env", ".tox", "dist", "build",
    "egg-info", ".eggs",
}


def find_python_files(root):
    """Walk directory tree and yield .py source file paths."""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS and not d.endswith(".egg-info")]
        for fname in filenames:
            if fname.endswith(".py"):
                yield Path(dirpath) / fname


def extract_imports(tree):
    """Extract imported names from the AST."""
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name.split(".")[-1])
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name != "*":
                    imports.append(alias.name)
    return imports


def is_exported(name):
    """Check if a name is public (doesn't start with underscore)."""
    return not name.startswith("_")


def get_function_signature(node):
    """Build a function signature string from the AST node."""
    args = []
    for arg in node.args.args:
        annotation = ""
        if arg.annotation:
            try:
                annotation = ": " + ast.unparse(arg.annotation)
            except (AttributeError, ValueError):
                pass
        args.append(arg.arg + annotation)

    returns = ""
    if node.returns:
        try:
            returns = " -> " + ast.unparse(node.returns)
        except (AttributeError, ValueError):
            pass

    return f"({', '.join(args)}){returns}"


def extract_symbols_from_file(filepath, root):
    """Parse a Python file and extract symbols."""
    try:
        content = filepath.read_text(encoding="utf-8")
        tree = ast.parse(content, filename=str(filepath))
    except (SyntaxError, OSError, UnicodeDecodeError):
        return []

    rel_path = str(filepath.relative_to(root))
    imports = extract_imports(tree)
    symbols = []

    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.ClassDef):
            # Collect base class dependencies
            bases = []
            for base in node.bases:
                try:
                    bases.append(ast.unparse(base))
                except (AttributeError, ValueError):
                    pass

            decorators = []
            for dec in node.decorator_list:
                try:
                    decorators.append(ast.unparse(dec))
                except (AttributeError, ValueError):
                    pass

            modifiers = ["public"] if is_exported(node.name) else ["private"]
            if decorators:
                modifiers.extend(decorators)

            symbols.append({
                "name": node.name,
                "kind": "class",
                "file": rel_path,
                "line": node.lineno,
                "exported": is_exported(node.name),
                "modifiers": modifiers,
                "dependencies": list(set(imports + bases)),
                "dependents": [],
                "signature": None,
            })

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            modifiers = ["public"] if is_exported(node.name) else ["private"]
            if isinstance(node, ast.AsyncFunctionDef):
                modifiers.append("async")

            signature = get_function_signature(node)

            symbols.append({
                "name": node.name,
                "kind": "function",
                "file": rel_path,
                "line": node.lineno,
                "exported": is_exported(node.name),
                "modifiers": modifiers,
                "dependencies": list(set(imports)),
                "dependents": [],
                "signature": signature,
            })

    return symbols


def main():
    all_symbols = []
    for filepath in find_python_files(ROOT):
        all_symbols.extend(extract_symbols_from_file(filepath, ROOT))

    # Resolve dependents
    name_to_indices = {}
    for i, sym in enumerate(all_symbols):
        name_to_indices.setdefault(sym["name"], []).append(i)
    for sym in all_symbols:
        for dep in sym["dependencies"]:
            for idx in name_to_indices.get(dep, []):
                if sym["name"] not in all_symbols[idx]["dependents"]:
                    all_symbols[idx]["dependents"].append(sym["name"])

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "language": "python",
        "extractor": "build-symbol-map-python.py",
        "symbols": all_symbols,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(output, indent=2))
    print(f"Symbol map: {len(all_symbols)} symbols extracted → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Verify the file exists**

Run: `wc -l templates/generic/.bbg/scripts/build-symbol-map-python.py`
Expected: ~140-155 lines

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/scripts/build-symbol-map-python.py
git commit -m "feat: add Python symbol map extractor using ast module"
```

---

## Task 8: Create context-loading Skill

**Files:**

- Create: `skills/context-loading/SKILL.md`

- [ ] **Step 1: Create the skill directory**

Run: `mkdir -p skills/context-loading`

- [ ] **Step 2: Create SKILL.md**

Create `skills/context-loading/SKILL.md`:

````markdown
---
name: context-loading
category: ai-workflow
description: Intelligent context selection — load the right files within budget using repo map, symbol map, and priority tiers
---

# Context Loading

## Overview

Use this skill when starting any task that requires reading project files. AI tools have limited context windows. Loading files randomly wastes tokens. This skill teaches a priority-based strategy that loads the most relevant files first, stays within budget, and tracks what was loaded for efficiency analysis.

## Prerequisites

- Repo map at `.bbg/context/repo-map.json` (generated by `node .bbg/scripts/build-repo-map.js`)
- Optional: symbol map at `.bbg/context/symbol-map.json` (generated by language-specific extractors)
- Optional: SQLite database at `.bbg/telemetry.db` with context tables (from `.bbg/scripts/context-schema.sql`)

## Context Budget

Total budget depends on the model tier:

| Model Tier | Token Budget | Example Models            |
| ---------- | ------------ | ------------------------- |
| Opus       | ~120K tokens | Claude Opus, GPT-4        |
| Sonnet     | ~60K tokens  | Claude Sonnet, GPT-4o     |
| Light      | ~30K tokens  | Claude Haiku, GPT-4o-mini |

### Priority Allocation

| Priority | Content                                                | Budget % | Load Order |
| -------- | ------------------------------------------------------ | -------- | ---------- |
| P0       | Task-direct files (target file + direct dependencies)  | 40%      | First      |
| P1       | Architecture files (AGENTS.md, RULES.md, entry points) | 20%      | Second     |
| P2       | Related test files                                     | 15%      | Third      |
| P3       | Recently modified related files                        | 15%      | Fourth     |
| P4       | Project repo-map summary                               | 10%      | Last       |

## Workflow

### Step 1: Identify the Task Target

Determine the primary files for the task:

- **Bug fix**: the file with the bug + its direct imports
- **New feature**: the module where the feature will live + related interfaces
- **Refactor**: the files being refactored + their dependents (from symbol map)
- **Code review**: the changed files in the PR/diff

### Step 2: Load P0 — Task-Direct Files (40% budget)

1. Read the target file(s)
2. Use the symbol map to find direct dependencies:
   ```bash
   # Find what UserService depends on
   cat .bbg/context/symbol-map.json | grep -A5 '"name": "UserService"'
   ```
````

3. Load those dependency files
4. Track tokens used so far

### Step 3: Load P1 — Architecture Files (20% budget)

Load governance files that provide project context:

- `AGENTS.md` or `CLAUDE.md` (project instructions)
- `RULES.md` (coding standards)
- Entry point files (from repo map: files with `isEntry: true`)
- Only load sections relevant to the task, not entire files

### Step 4: Load P2 — Related Test Files (15% budget)

1. Find test files for the target:
   - Co-located: `src/foo.test.ts` for `src/foo.ts`
   - Test directory: `tests/unit/foo.test.ts` for `src/foo.ts`
2. Load test files to understand expected behavior and test patterns
3. If budget is tight, load only test names (describe/it blocks), not full test bodies

### Step 5: Load P3 — Recently Modified Related Files (15% budget)

Use the repo map to find high-importance files in the same module:

```bash
# Files in same directory, sorted by importance
cat .bbg/context/repo-map.json | \
  python3 -c "import json,sys; data=json.load(sys.stdin); [print(f['path'],f['importance']) for f in data['files'] if f['path'].startswith('src/services/')]"
```

### Step 6: Load P4 — Repo Map Summary (10% budget)

Load a condensed view of the project structure:

- Top 20 files by importance score
- Directory tree with file counts
- This gives the AI a bird's-eye view without loading every file

### Step 7: Track What Was Loaded

If the SQLite database exists, record the context load:

```bash
sqlite3 .bbg/telemetry.db "
  INSERT INTO context_loads (session_id, task_type, files_loaded, symbols_loaded, tokens_estimated, budget_limit, budget_used_pct, strategy)
  VALUES ('session-123', 'bug-fix', 12, 45, 35000, 60000, 58.3, 'priority-tiered');
"
```

## Budget Overflow Strategy

When P0 alone exceeds 40% of budget:

1. Load only the target file and its type signatures (not full implementations) for dependencies
2. Use symbol map signatures instead of reading full dependency files
3. Reduce P1 to just `AGENTS.md` summary section
4. Skip P3 entirely
5. Keep P2 (tests are critical for understanding behavior)

## Rules

- Always load P0 first — the task target is non-negotiable
- Never load files blindly — use repo map and symbol map to select
- Track tokens consumed at each priority tier
- If symbol map is outdated (>24h), suggest running `/context-refresh` first
- Prefer loading type signatures over full file contents when budget is tight
- Never load generated files, lock files, or vendored dependencies

## Anti-patterns

- Loading every file in a directory without checking relevance
- Reading full file contents when only the interface/types are needed
- Ignoring the repo map and loading files alphabetically
- Spending >50% of budget on architecture files instead of task-direct code
- Not tracking what was loaded, making it impossible to optimize later

## Checklist

- [ ] Repo map exists and is recent (< 24 hours old)
- [ ] Task target files identified
- [ ] P0 files loaded within 40% budget
- [ ] P1 architecture context loaded
- [ ] P2 test files loaded
- [ ] P3 related recent files loaded (if budget allows)
- [ ] P4 repo map summary loaded
- [ ] Context load recorded to telemetry database

## Related

- **Commands**: [/context-refresh](../../commands/context-refresh.md), [/context-budget](../../commands/context-budget.md)
- **Skills**: [session-memory](../session-memory/SKILL.md), [strategic-compact](../strategic-compact/SKILL.md), [search-first](../search-first/SKILL.md)

````

- [ ] **Step 3: Verify the file**

Run: `wc -l skills/context-loading/SKILL.md`
Expected: ~120-135 lines

- [ ] **Step 4: Commit**

```bash
git add skills/context-loading/SKILL.md
git commit -m "feat: add context-loading skill with priority-based budget strategy"
````

---

## Task 9: Create session-memory Skill

**Files:**

- Create: `skills/session-memory/SKILL.md`

- [ ] **Step 1: Create the skill directory**

Run: `mkdir -p skills/session-memory`

- [ ] **Step 2: Create SKILL.md**

Create `skills/session-memory/SKILL.md`:

````markdown
---
name: session-memory
category: ai-workflow
description: Long-task session memory — persist decisions across steps and sessions using structured summaries and SQLite storage
---

# Session Memory

## Overview

Use this skill during multi-step tasks that span long conversations or multiple sessions. AI context windows are finite — when a long task requires many steps, earlier decisions get pushed out of context. This skill maintains a decision chain that preserves critical choices, their rationale, and their outcomes, ensuring continuity even after compaction or session restart.

## Prerequisites

- SQLite database at `.bbg/telemetry.db` with session tables (from `.bbg/scripts/context-schema.sql`)
- Fallback: decisions can be written to `.bbg/context/session-decisions.json` if SQLite is unavailable

## Decision Record Format

Each key step produces a structured decision record:

```json
{
  "step": "Step 3: Choose database schema",
  "decision": "Use single table with JSON columns instead of normalized schema",
  "reason": "Fewer migrations needed, data shape varies per event type, query patterns don't require joins",
  "outcome": "Created events table with 7 columns including JSON details blob"
}
```
````

## Workflow

### Step 1: Initialize Session Memory

At the start of a long task, create a session ID and record the task:

```bash
# Record session start
sqlite3 .bbg/telemetry.db "
  INSERT INTO session_decisions (session_id, task_id, step, decision, reason, outcome)
  VALUES ('$(date +%s)', 'TASK-001', 'task-start', 'Starting: implement user auth', 'User requested feature', 'in-progress');
"
```

Or if using JSON fallback:

```bash
mkdir -p .bbg/context
echo '[]' > .bbg/context/session-decisions.json
```

### Step 2: Record Decisions at Each Key Step

After each significant decision (not every micro-step — only decisions that affect later work):

**Record when:**

- Choosing between implementation approaches
- Making architectural or design decisions
- Encountering and resolving unexpected issues
- Completing a milestone that changes the next steps
- Discovering something that invalidates earlier assumptions

**Do NOT record:**

- Routine code edits with obvious choices
- Running tests (record only if results change the plan)
- Reading files for context (record only if findings change the approach)

```bash
sqlite3 .bbg/telemetry.db "
  INSERT INTO session_decisions (session_id, task_id, step, decision, reason, outcome)
  VALUES ('session-abc', 'TASK-001', 'Step 3: schema design', 'Single table with JSON columns', 'Fewer migrations, flexible shape', 'Created events table');
"
```

### Step 3: Restore Session on Resume

When resuming a task (new session or after compaction), load the decision chain first:

```bash
# Load all decisions for the current task
sqlite3 -header -column .bbg/telemetry.db "
  SELECT step, decision, reason, outcome
  FROM session_decisions
  WHERE task_id = 'TASK-001'
  ORDER BY timestamp ASC;
"
```

This gives you the complete decision history without re-reading all the files that led to those decisions. The decision chain is a compressed representation of the session's key choices.

### Step 4: Cross-Session Continuity

For tasks spanning multiple sessions:

1. End of session: ensure all decisions are persisted to SQLite
2. Start of new session: query decisions for the active task
3. Rebuild context: decisions tell you WHAT was decided and WHY — load only the files needed for the NEXT step, not all files from previous steps

```bash
# Find active tasks with recent decisions
sqlite3 -header -column .bbg/telemetry.db "
  SELECT task_id, COUNT(*) AS steps, MAX(timestamp) AS last_activity
  FROM session_decisions
  GROUP BY task_id
  HAVING outcome != 'complete'
  ORDER BY last_activity DESC
  LIMIT 5;
"
```

### Step 5: Complete the Task

When the task is done, record completion:

```bash
sqlite3 .bbg/telemetry.db "
  INSERT INTO session_decisions (session_id, task_id, step, decision, reason, outcome)
  VALUES ('session-abc', 'TASK-001', 'complete', 'Task finished successfully', 'All requirements met', 'complete');
"
```

## Memory Compaction

When the context window fills up and compaction is needed:

1. Write all unrecorded decisions to SQLite BEFORE compacting
2. After compaction, load the decision chain from SQLite
3. The decision chain replaces the detailed conversation history — it's more efficient and preserves the key information

## File Association Tracking

Link files to tasks for faster context restoration:

```bash
sqlite3 .bbg/telemetry.db "
  INSERT INTO file_associations (file_path, entity_type, entity_id, relation)
  VALUES ('src/auth/service.ts', 'task', 'TASK-001', 'modified');
"
```

When resuming, query associated files:

```bash
sqlite3 -header -column .bbg/telemetry.db "
  SELECT file_path, relation FROM file_associations
  WHERE entity_type = 'task' AND entity_id = 'TASK-001'
  ORDER BY timestamp DESC;
"
```

## Rules

- Record decisions ONLY at meaningful choice points, not every micro-step
- Always include the reason — the "why" is more valuable than the "what"
- Persist decisions to SQLite before any context compaction
- On session resume, load decisions BEFORE loading files
- Keep decision text concise — one sentence for decision, one for reason
- Never delete decision history — it's an audit trail

## Anti-patterns

- Recording every code edit as a "decision" (noise overwhelms signal)
- Recording decisions without reasons (useless for restoration)
- Waiting until session end to persist decisions (risk of loss during compaction)
- Loading all previous session files instead of using the decision chain
- Not recording outcomes (makes it impossible to evaluate decision quality)

## Checklist

- [ ] Session ID established and recorded
- [ ] Decisions recorded at each key choice point
- [ ] All decisions include step, decision, reason, and outcome
- [ ] Decisions persisted to SQLite (or JSON fallback)
- [ ] Session restoration tested — can resume from decision chain alone
- [ ] File associations tracked for modified/created files
- [ ] Task marked as complete when finished

## Related

- **Commands**: [/context-refresh](../../commands/context-refresh.md), [/sessions](../../commands/sessions.md), [/checkpoint](../../commands/checkpoint.md)
- **Skills**: [context-loading](../context-loading/SKILL.md), [strategic-compact](../strategic-compact/SKILL.md)

````

- [ ] **Step 3: Verify the file**

Run: `wc -l skills/session-memory/SKILL.md`
Expected: ~130-150 lines

- [ ] **Step 4: Commit**

```bash
git add skills/session-memory/SKILL.md
git commit -m "feat: add session-memory skill for long-task decision persistence"
````

---

## Task 10: Create context-refresh and context-budget Commands

**Files:**

- Create: `commands/context-refresh.md`
- Create: `commands/context-budget.md`

- [ ] **Step 1: Create context-refresh.md**

Create `commands/context-refresh.md`:

```markdown
# /context-refresh

## Description

Regenerate the project's repo map and symbol maps. Run this when the codebase has changed significantly (new files, refactored modules, renamed symbols) to ensure context loading uses up-to-date information.

## Usage
```

/context-refresh
/context-refresh --repo-map
/context-refresh --symbol-map
/context-refresh --all

```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--repo-map` | `false` | Regenerate only the repo map |
| `--symbol-map` | `false` | Regenerate only the symbol map(s) |
| `--all` | `true` | Regenerate both repo map and symbol maps (default) |

## Process

1. **Regenerate repo map** — Run `node .bbg/scripts/build-repo-map.js`
   - Walks the project tree
   - Scores files by recency, import popularity, and role
   - Writes `.bbg/context/repo-map.json`
2. **Regenerate symbol map** — Run the language-appropriate extractor:
   - TypeScript: `node .bbg/scripts/build-symbol-map-ts.js`
   - Java: `python .bbg/scripts/build-symbol-map-java.py`
   - Go: `bash .bbg/scripts/build-symbol-map-go.sh`
   - Rust: `bash .bbg/scripts/build-symbol-map-rust.sh`
   - Python: `python .bbg/scripts/build-symbol-map-python.py`
3. **Report results** — Show file counts, symbol counts, and generation timestamps

## Output

```

Repo map refreshed: 342 files scored → .bbg/context/repo-map.json
Symbol map refreshed: 187 symbols extracted → .bbg/context/symbol-map.json
Generated at: 2026-04-03T14:30:00Z

```

## Rules

- Run all available extractors — detect which scripts exist in `.bbg/scripts/`
- If an extractor fails (e.g., `go` not installed), warn but continue with others
- Never modify source code — this is a read-only analysis
- Suggest running after major refactors, branch switches, or merges
- Track refresh timestamps so context-loading can check freshness

## Examples

```

/context-refresh # Refresh everything
/context-refresh --repo-map # Only rebuild the file-level repo map
/context-refresh --symbol-map # Only rebuild language symbol maps

```

## Related

- **Skills**: [context-loading](../skills/context-loading/SKILL.md), [search-first](../skills/search-first/SKILL.md)
- **Commands**: [/context-budget](context-budget.md)
```

- [ ] **Step 2: Create context-budget.md**

Create `commands/context-budget.md`:

```markdown
# /context-budget

## Description

Check and manage the context token budget. Shows how much context has been loaded, what the budget limits are for the current model tier, and how efficiently context is being used.

## Usage
```

/context-budget
/context-budget --tier opus
/context-budget --tier sonnet
/context-budget --tier light
/context-budget --history

````

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--tier` | auto-detect | Model tier: `opus` (120K), `sonnet` (60K), `light` (30K) |
| `--history` | `false` | Show context load history from telemetry database |

## Budget Tiers

| Tier | Total Budget | P0 (Task) | P1 (Architecture) | P2 (Tests) | P3 (Related) | P4 (Map) |
|------|-------------|-----------|-------------------|------------|-------------|---------|
| Opus | 120K tokens | 48K | 24K | 18K | 18K | 12K |
| Sonnet | 60K tokens | 24K | 12K | 9K | 9K | 6K |
| Light | 30K tokens | 12K | 6K | 4.5K | 4.5K | 3K |

## Process

1. **Detect model tier** — Infer from the current AI tool/model or use `--tier` override
2. **Check current usage** — Query the most recent `context_loads` entry:
   ```sql
   SELECT files_loaded, symbols_loaded, tokens_estimated, budget_limit, budget_used_pct, strategy
   FROM context_loads ORDER BY timestamp DESC LIMIT 1;
````

3. **Display budget breakdown** — Show each priority tier's allocation and usage
4. **Show efficiency metrics** — Average budget usage by task type:
   ```sql
   SELECT * FROM v_context_efficiency;
   ```
5. **Recommendations** — Suggest optimizations if budget is consistently over/under-used

## Output

```
Context Budget — Sonnet Tier (60K tokens)

| Priority | Allocated | Used    | Status    |
|----------|----------|---------|-----------|
| P0 Task  | 24,000   | 22,100  | OK (92%)  |
| P1 Arch  | 12,000   | 8,400   | OK (70%)  |
| P2 Tests | 9,000    | 9,200   | OVER (102%)|
| P3 Rel.  | 9,000    | 3,100   | OK (34%)  |
| P4 Map   | 6,000    | 2,800   | OK (47%)  |
| TOTAL    | 60,000   | 45,600  | OK (76%)  |

Efficiency: avg 71% budget usage across 14 loads (task types: bug-fix, feature, refactor)
```

## Rules

- Default to `sonnet` tier if model cannot be auto-detected
- Show both absolute token counts and percentages
- Flag any priority tier exceeding its allocation with "OVER" status
- If `--history` is used, show the last 10 context load records
- Recommend running `/context-refresh` if repo map is >24 hours old

## Examples

```
/context-budget                 # Show current budget for auto-detected tier
/context-budget --tier opus     # Show budget for opus-class models
/context-budget --history       # Show context load history
```

## Related

- **Skills**: [context-loading](../skills/context-loading/SKILL.md), [strategic-compact](../skills/strategic-compact/SKILL.md), [llm-cost-optimization](../skills/llm-cost-optimization/SKILL.md)
- **Commands**: [/context-refresh](context-refresh.md), [/model-route](model-route.md)

````

- [ ] **Step 3: Verify both files exist**

Run: `wc -l commands/context-refresh.md commands/context-budget.md`
Expected: context-refresh ~55-65 lines, context-budget ~75-85 lines

- [ ] **Step 4: Commit**

```bash
git add commands/context-refresh.md commands/context-budget.md
git commit -m "feat: add /context-refresh and /context-budget commands"
````

---

## Task 11: Register All Templates in governance.ts and Update Tests

**Files:**

- Modify: `src/templates/governance.ts:49-71` (add 2 skills to CORE_SKILLS)
- Modify: `src/templates/governance.ts:126-151` (add 2 commands to CORE_COMMANDS)
- Modify: `src/templates/governance.ts` (add BBG_SCRIPTS array if Phase 2 not applied, or extend it)
- Modify: `src/templates/governance.ts` (add LANGUAGE_BBG_SCRIPTS for conditional symbol maps)
- Modify: `src/templates/governance.ts:230-296` (add BBG Scripts + language scripts in buildGovernanceManifest)
- Modify: `src/templates/governance.ts:302-315` (export new arrays in GOVERNANCE_MANIFEST)
- Modify: `tests/unit/templates/governance.test.ts` (update all count assertions)

**IMPORTANT NOTE:** Do **not** assume fixed baseline totals (97/102/etc). Earlier phases may already have changed counts. Apply **incremental updates** relative to current assertions in the test file.

### Count changes for Phase 5 (incremental):

- CORE_SKILLS: **+2** (`"context-loading"`, `"session-memory"`)
- CORE_COMMANDS: **+2** (`"context-refresh"`, `"context-budget"`)
- Core BBG scripts: **+2** (`build-repo-map.js`, `context-schema.sql`)
- Language-specific BBG scripts: **+1 per detected language**
  - TypeScript: `build-symbol-map-ts.js`
  - Java: `build-symbol-map-java.py`
  - Go: `build-symbol-map-go.sh`
  - Rust: `build-symbol-map-rust.sh`
  - Python: `build-symbol-map-python.py`

Therefore:

- Minimal/core total increment: **+6**
- TS project increment: **+7** (core + TS symbol map)
- TS+Python project increment: **+8** (core + TS + Python symbol maps)

- [ ] **Step 1: Write the failing test — update governance.test.ts count assertions**

In `tests/unit/templates/governance.test.ts`, make these edits:

**Edit 1:** Increment the skills count assertion by **+2**.

Example: if current value is `39`, change it to `41`.

**Edit 2:** Increment the commands count assertion by **+2**.

Example: if current value is `24`, change it to `26`.

**Edit 3:** Add BBG scripts assertions after MCP tasks assertion (after line 98), and update totals **incrementally**:

```typescript
// After (keep existing MCP assertions, then add):
// MCP configs: 2
const mcpTasks = tasks.filter((t) => t.destination.startsWith("mcp-configs/"));
expect(mcpTasks).toHaveLength(2);

// BBG scripts (core): 2 (build-repo-map.js, context-schema.sql)
const bbgScriptTasks = tasks.filter((t) => t.destination.startsWith(".bbg/scripts/"));
expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/build-repo-map.js");
expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/context-schema.sql");

// Total: increment current core total assertion by +6 (2 skills + 2 commands + 2 core scripts)
// Example: 102 -> 108
```

**Edit 4:** Update TypeScript test — add symbol map assertion and update total **incrementally** (line 135-136):

After the existing TypeScript commands assertions (after the `expect(destinations).toContain("commands/ts-test.md");` line), add:

```typescript
// TypeScript symbol map script
expect(destinations).toContain(".bbg/scripts/build-symbol-map-ts.js");

// Total: increment current TypeScript total assertion by +7
// Example: 116 -> 123
```

Replace the old total assertion accordingly (do not hardcode legacy baselines).

**Edit 5:** Update TS+Python test — add symbol map assertions and update total **incrementally** (line 183-184):

After the Python assertions, add:

```typescript
// Language-specific symbol map scripts
expect(destinations).toContain(".bbg/scripts/build-symbol-map-ts.js");
expect(destinations).toContain(".bbg/scripts/build-symbol-map-python.py");
```

Replace the old total assertion:

```typescript
// Language-specific symbol map scripts
expect(destinations).toContain(".bbg/scripts/build-symbol-map-ts.js");
expect(destinations).toContain(".bbg/scripts/build-symbol-map-python.py");

// Total: increment current TS+Python total assertion by +8
// Example: 129 -> 137
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/unit/templates/governance.test.ts`
Expected: FAIL — counts don't match because governance.ts hasn't been updated yet.

- [ ] **Step 3: Update governance.ts — add context-loading and session-memory to CORE_SKILLS**

In `src/templates/governance.ts`, add the two new skills at the end of the CORE_SKILLS array:

```typescript
// Before:
  "autonomous-loops",
  "mcp-integration",
];

// After:
  "autonomous-loops",
  "mcp-integration",
  "context-loading",
  "session-memory",
];
```

- [ ] **Step 4: Add context-refresh and context-budget to CORE_COMMANDS**

In `src/templates/governance.ts`, add the two new commands at the end of the CORE_COMMANDS array:

```typescript
// Before:
  "setup-pm",
  "sync",
];

// After:
  "setup-pm",
  "sync",
  "context-refresh",
  "context-budget",
];
```

- [ ] **Step 5: Add BBG_SCRIPTS array (core scripts) after MCP_CONFIG_FILES**

In `src/templates/governance.ts`, add the BBG_SCRIPTS and LANGUAGE_BBG_SCRIPTS arrays. Insert after the `const MCP_CONFIG_FILES` line:

```typescript
// Before:
const MCP_CONFIG_FILES = ["mcp-servers.json", "README.md"];

// After:
const MCP_CONFIG_FILES = ["mcp-servers.json", "README.md"];

const BBG_SCRIPTS = ["build-repo-map.js", "context-schema.sql"];

const LANGUAGE_BBG_SCRIPTS: Record<string, string[]> = {
  typescript: ["build-symbol-map-ts.js"],
  java: ["build-symbol-map-java.py"],
  go: ["build-symbol-map-go.sh"],
  rust: ["build-symbol-map-rust.sh"],
  python: ["build-symbol-map-python.py"],
};
```

- [ ] **Step 6: Add BBG Scripts sections in buildGovernanceManifest**

In `src/templates/governance.ts`, add two new sections inside `buildGovernanceManifest()`. The core scripts go after the MCP Configs loop, and the language-specific scripts go inside the existing language loop. Insert before the `return mergePluginTemplates(tasks, plugins ?? []);` line:

```typescript
// Before:
// --- MCP Configs ---
for (const mcpFile of MCP_CONFIG_FILES) {
  tasks.push(copyTask(`mcp-configs/${mcpFile}`, `mcp-configs/${mcpFile}`));
}

return mergePluginTemplates(tasks, plugins ?? []);

// After:
// --- MCP Configs ---
for (const mcpFile of MCP_CONFIG_FILES) {
  tasks.push(copyTask(`mcp-configs/${mcpFile}`, `mcp-configs/${mcpFile}`));
}

// --- BBG Scripts (core — always generated) ---
for (const script of BBG_SCRIPTS) {
  tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
}

// --- BBG Scripts (language-specific — conditionally generated) ---
for (const lang of langs) {
  for (const script of LANGUAGE_BBG_SCRIPTS[lang] ?? []) {
    tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
  }
}

return mergePluginTemplates(tasks, plugins ?? []);
```

- [ ] **Step 7: Export new arrays in GOVERNANCE_MANIFEST**

In `src/templates/governance.ts`, add `bbgScripts` and `languageBbgScripts` to the GOVERNANCE_MANIFEST export:

```typescript
// Before:
export const GOVERNANCE_MANIFEST = {
  coreAgents: CORE_AGENTS,
  languageAgents: LANGUAGE_AGENTS,
  coreSkills: CORE_SKILLS,
  operationsSkills: OPERATIONS_SKILLS,
  languageSkills: LANGUAGE_SKILLS,
  commonRules: COMMON_RULES,
  languageRules: LANGUAGE_RULES,
  coreCommands: CORE_COMMANDS,
  languageCommands: LANGUAGE_COMMANDS,
  hookFiles: HOOK_FILES,
  contextHbsFiles: CONTEXT_HBS_FILES,
  mcpConfigFiles: MCP_CONFIG_FILES,
} as const;

// After:
export const GOVERNANCE_MANIFEST = {
  coreAgents: CORE_AGENTS,
  languageAgents: LANGUAGE_AGENTS,
  coreSkills: CORE_SKILLS,
  operationsSkills: OPERATIONS_SKILLS,
  languageSkills: LANGUAGE_SKILLS,
  commonRules: COMMON_RULES,
  languageRules: LANGUAGE_RULES,
  coreCommands: CORE_COMMANDS,
  languageCommands: LANGUAGE_COMMANDS,
  hookFiles: HOOK_FILES,
  bbgScripts: BBG_SCRIPTS,
  languageBbgScripts: LANGUAGE_BBG_SCRIPTS,
  contextHbsFiles: CONTEXT_HBS_FILES,
  mcpConfigFiles: MCP_CONFIG_FILES,
} as const;
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- tests/unit/templates/governance.test.ts`
Expected: ALL PASS — all count assertions match.

- [ ] **Step 9: Run full test suite and build**

Run: `npm test && npm run build`
Expected: ALL PASS, build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register context engineering templates in governance manifest"
```

---

## Task 12: Verify Full Integration

**Files:**

- Verify: All new files exist
- Run: Full test suite + build + typecheck

- [ ] **Step 1: Verify all new template files exist**

Run:

```bash
ls -la templates/generic/.bbg/scripts/build-repo-map.js
ls -la templates/generic/.bbg/scripts/context-schema.sql
ls -la templates/generic/.bbg/scripts/build-symbol-map-ts.js
ls -la templates/generic/.bbg/scripts/build-symbol-map-java.py
ls -la templates/generic/.bbg/scripts/build-symbol-map-go.sh
ls -la templates/generic/.bbg/scripts/build-symbol-map-rust.sh
ls -la templates/generic/.bbg/scripts/build-symbol-map-python.py
```

Expected: All 7 script files exist

- [ ] **Step 2: Verify all new governance content files exist**

Run:

```bash
ls -la skills/context-loading/SKILL.md
ls -la skills/session-memory/SKILL.md
ls -la commands/context-refresh.md
ls -la commands/context-budget.md
```

Expected: All 4 governance content files exist

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No TypeScript errors. The `self-checks.ts` file reads `GOVERNANCE_MANIFEST` — the new `bbgScripts` and `languageBbgScripts` properties are exported as `as const` and TypeScript is satisfied. The `.bbg/scripts/` files don't match any of the fast-glob patterns in `checkNoOrphanFiles` (`agents/*.md`, `skills/*/SKILL.md`, `rules/**/*.md`, `commands/*.md`) so they won't be flagged as orphans.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 6: Run governance cross-reference test**

Run: `npm test -- tests/unit/templates/governance.crossref.test.ts`
Expected: PASS — the new skills have `## Related` sections and commands have `## Related` sections. The cross-ref test checks that all governance docs have a `## Related` section and that all relative links point to existing files. Verify the links in the new files resolve correctly:

- `skills/context-loading/SKILL.md` links to `../../commands/context-refresh.md`, `../../commands/context-budget.md`, `../session-memory/SKILL.md`, `../strategic-compact/SKILL.md`, `../search-first/SKILL.md`
- `skills/session-memory/SKILL.md` links to `../../commands/context-refresh.md`, `../../commands/sessions.md`, `../../commands/checkpoint.md`, `../context-loading/SKILL.md`, `../strategic-compact/SKILL.md`
- `commands/context-refresh.md` links to `../skills/context-loading/SKILL.md`, `../skills/search-first/SKILL.md`, `context-budget.md`
- `commands/context-budget.md` links to `../skills/context-loading/SKILL.md`, `../skills/strategic-compact/SKILL.md`, `../skills/llm-cost-optimization/SKILL.md`, `context-refresh.md`, `model-route.md`

- [ ] **Step 7: Final commit (if any remaining changes)**

```bash
git add -A
git status
# Only commit if there are unstaged changes
git commit -m "chore: phase 5 context engineering — final verification"
```

---

## Summary

| Task | Files                                                        | What It Does                                             |
| ---- | ------------------------------------------------------------ | -------------------------------------------------------- |
| 1    | `templates/generic/.bbg/scripts/build-repo-map.js`           | File-level repo map with importance scoring (Node.js)    |
| 2    | `templates/generic/.bbg/scripts/context-schema.sql`          | SQLite DDL: 3 tables, 6 indexes, 1 view                  |
| 3    | `templates/generic/.bbg/scripts/build-symbol-map-ts.js`      | TypeScript symbol extraction via TS Compiler API         |
| 4    | `templates/generic/.bbg/scripts/build-symbol-map-java.py`    | Java symbol extraction via regex + import analysis       |
| 5    | `templates/generic/.bbg/scripts/build-symbol-map-go.sh`      | Go symbol extraction via `go doc` + `go list`            |
| 6    | `templates/generic/.bbg/scripts/build-symbol-map-rust.sh`    | Rust symbol extraction via pub regex + use deps          |
| 7    | `templates/generic/.bbg/scripts/build-symbol-map-python.py`  | Python symbol extraction via `ast` module                |
| 8    | `skills/context-loading/SKILL.md`                            | Priority-based context loading with budget tiers         |
| 9    | `skills/session-memory/SKILL.md`                             | Long-task decision persistence across sessions           |
| 10   | `commands/context-refresh.md` + `commands/context-budget.md` | Context management slash commands                        |
| 11   | `src/templates/governance.ts` + test                         | Register all new content (core + conditional)            |
| 12   | —                                                            | Full integration verification (typecheck + test + build) |

**Total new governance content:** 11 files (7 scripts + 2 skills + 2 commands)
**Total `src/` modifications:** 2 files (governance.ts, governance.test.ts)
**Count impact summary (incremental):** +6 core, +7 with TS, +8 with TS+Python
**Conditional generation:** 5 symbol-map scripts keyed to `hasTypeScript`, `hasJava`, `hasGo`, `hasRust`, `hasPython`
