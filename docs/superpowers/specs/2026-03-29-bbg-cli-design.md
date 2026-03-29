# bbg (BadBoy Genesis) CLI Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Author:** AI + User collaborative design

## Overview

bbg is a CLI tool that initializes and maintains AI development workflow governance for multi-repo projects. It extracts the governance patterns established in the mxbc-posters project into a reusable, parameterized scaffold that any team can adopt.

**Core value proposition:** Teams get a complete AI-aware governance structure (AGENTS.md, workflow docs, review policies, doctor scripts, git hooks, task templates) in minutes instead of weeks, with ongoing sync and doctor capabilities.

**Non-goals:**
- Deep semantic analysis of business domains — bbg does shallow deterministic analysis; AI agents fill in domain-specific content via `<!-- AI-FILL -->` markers
- Runtime enforcement — bbg generates governance assets; enforcement is done by AI agents, git hooks, and CI
- Replacing existing CI/CD systems — bbg complements, not replaces

---

## 1. Project Structure & Configuration Model

### 1.1 Directory Layout

```
my-project/                      # user's multi-repo workspace root
  .bbg/
    config.json                  # primary config (BbgConfig schema)
    file-hashes.json             # SHA-256 hashes of generated files (for upgrade diffing)
    templates/                   # user-customized template overrides (optional)
  docs/
    system-architecture-and-ai-workflow.md
    architecture/
    domains/
    workflows/
    security/
    tasks/
    changes/
    handoffs/
    reports/
    environments/
    cleanup/
    superpowers/
      specs/
  scripts/
    doctor.py
    sync_versions.py
    ...
  .githooks/
    pre-commit
    pre-push
  AGENTS.md
  README.md
  sub-project-a/                 # cloned sub-project
    AGENTS.md                    # child AGENTS.md
  sub-project-b/
    AGENTS.md
```

### 1.2 BbgConfig Schema

```typescript
interface BbgConfig {
  // Core metadata
  version: string;               // bbg version that generated this config
  projectName: string;           // human-readable project name
  projectDescription: string;    // one-line description
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601

  // Sub-project registry
  repos: RepoEntry[];

  // Governance settings
  governance: {
    riskThresholds: {
      high:   { grade: string; minScore: number };  // default: A+, 99
      medium: { grade: string; minScore: number };  // default: A, 95
      low:    { grade: string; minScore: number };  // default: B, 85
    };
    enableRedTeam: boolean;       // default: true
    enableCrossAudit: boolean;    // default: true
  };

  // Template rendering context (computed + user-supplied)
  context: Record<string, unknown>;
}

interface RepoEntry {
  name: string;                  // directory name (= last segment of git URL)
  gitUrl: string;                // remote git URL
  branch: string;                // checked-out branch
  type: "backend" | "frontend-pc" | "frontend-h5" | "frontend-web" | "other";
  stack: StackInfo;              // auto-detected by analyzers
  description: string;           // user-provided one-liner
}

interface StackInfo {
  language: string;              // "java", "typescript", "python", etc.
  framework: string;             // "spring-boot", "vue3", "react", "next", etc.
  buildTool: string;             // "maven", "gradle", "npm", "pnpm", "yarn", etc.
  testFramework: string;         // "junit", "vitest", "jest", "pytest", etc.
  packageManager: string;        // "npm", "pnpm", "yarn", "maven", "gradle", etc.
}
```

### 1.3 `.bbg/file-hashes.json` Schema

Tracks SHA-256 hashes of every generated file at generation time, enabling `bbg upgrade` to detect user modifications.

```typescript
interface FileHashRecord {
  [relativePath: string]: {
    generatedHash: string;       // SHA-256 at generation time
    generatedAt: string;         // ISO 8601
    templateVersion: string;     // bbg version that generated this file
  };
}
```

---

## 2. Command Detailed Design

### 2.1 `bbg init`

**Purpose:** Initialize a new governed multi-repo workspace from scratch.

**Flow:**

1. Check current directory is empty or has no `.bbg/` — error if `.bbg/` exists (suggest `bbg upgrade`)
2. Prompt: project name (text input)
3. Prompt: project description (text input)
4. Prompt: "Add a sub-project repository?" (confirm)
5. For each repo (loop until user declines to add more):
   a. Prompt: git URL (text input, validated as parseable git URL)
   b. Run `git ls-remote --heads <url>` to list remote branches
   c. Prompt: select branch (single-select from remote branch list)
   d. Run `git clone --branch <branch> --single-branch <url>` into workspace
   e. Run analyzers on cloned repo to detect stack info
   f. Display detected stack info, prompt user to confirm or override
   g. Prompt: repo type (single-select: backend / frontend-pc / frontend-h5 / frontend-web / other)
   h. Prompt: one-line description (text input)
6. Prompt: governance risk thresholds — show defaults, allow override per level
7. Prompt: enable red-team testing? (confirm, default yes)
8. Prompt: enable cross-audit? (confirm, default yes)
9. Assemble BbgConfig, write `.bbg/config.json`
10. Build TemplateContext from config + analyzer results
11. Render all templates (GENERIC copied verbatim, TEMPLATE rendered via Handlebars)
12. Generate child AGENTS.md for each sub-project
13. Compute and store file hashes in `.bbg/file-hashes.json`
14. Initialize root `.gitignore` (ignore sub-project directories)
15. Run `bbg doctor` internally to validate the generated structure
16. Print summary: files created, repos cloned, doctor results

**Flags:**
- `--yes` / `-y`: Accept all defaults (non-interactive fast path)
- `--dry-run`: Show what would be created without writing anything

### 2.2 `bbg add-repo`

**Purpose:** Add a new sub-project repository to an existing governed workspace.

**Flow:**

1. Verify `.bbg/config.json` exists — error if not (suggest `bbg init`)
2. Prompt: git URL
3. `git ls-remote --heads <url>` to list branches
4. Prompt: select branch
5. Clone into workspace
6. Run analyzers
7. Prompt: confirm/override stack, type, description
8. Append to `config.repos[]`
9. Generate child AGENTS.md for new repo
10. Update root AGENTS.md's sub-project coordination section
11. Update `.bbg/file-hashes.json`
12. Run `bbg doctor` to validate

**Flags:**
- `--url <url>`: Skip git URL prompt
- `--branch <branch>`: Skip branch selection (must be valid remote branch)

### 2.3 `bbg doctor`

**Purpose:** Validate the governance structure is intact and consistent.

**Checks (ordered by severity):**

| Check ID | Description | Severity |
|----------|-------------|----------|
| `config-exists` | `.bbg/config.json` exists and is valid JSON | error |
| `config-schema` | Config conforms to BbgConfig schema | error |
| `root-agents-md` | Root `AGENTS.md` exists | error |
| `root-readme` | Root `README.md` exists | error |
| `child-agents-md` | Each registered repo has `AGENTS.md` | error |
| `repo-dirs-exist` | Each registered repo directory exists | error |
| `workflow-docs` | All expected workflow docs exist | warning |
| `task-templates` | Task/change/handoff templates exist | warning |
| `scripts-exist` | Expected scripts exist and are executable | warning |
| `githooks-exist` | `.githooks/` has pre-commit and pre-push | warning |
| `gitignore-repos` | Root `.gitignore` ignores all registered repos | warning |
| `hash-integrity` | Generated files match stored hashes (detect drift) | info |
| `ai-fill-markers` | Count remaining `<!-- AI-FILL -->` markers | info |

**Output:** Structured report with pass/fail/warn per check, final summary, exit code.

**Exit codes:**
- `0`: All checks pass (warnings and info are acceptable)
- `1`: One or more error-severity checks failed

**Flags:**
- `--json`: Output as JSON instead of human-readable
- `--fix`: Auto-fix what can be fixed (e.g., create missing files from templates, fix `.gitignore`)
- `--governance-only`: Skip repo-existence checks, only validate governance files
- `--workspace`: Include repo-existence and hash-integrity checks

### 2.4 `bbg sync`

**Purpose:** Synchronize sub-project state and detect drift.

**Flow:**

1. For each registered repo:
   a. Check directory exists
   b. Check current branch matches config
   c. `git fetch` + check ahead/behind
   d. Report status
2. Check for repos in workspace that are NOT registered in config (orphan detection)
3. Re-run analyzers on all repos, compare with stored stack info
4. Report any drift (stack changes, missing repos, branch mismatches)
5. Optionally update config with detected changes (prompt user)

**Flags:**
- `--json`: Output as JSON
- `--update`: Auto-update config with detected changes (no prompts)

### 2.5 `bbg release`

**Purpose:** Guide the user through a governed release process.

**Flow:**

1. Run `bbg doctor` — refuse to proceed if errors exist
2. Run `bbg sync` — report any drift, require acknowledgment
3. Display release checklist (rendered from `docs/workflows/release-checklist.md`)
4. For each checklist item, prompt user to confirm completion
5. Prompt: release version / tag name
6. Prompt: release notes (text input or open editor)
7. Generate release record in `docs/changes/YYYY-MM-DD-release-<version>.md`
8. Print summary of what was released and governance status

**Flags:**
- `--skip-doctor`: Skip doctor check (with warning)
- `--skip-sync`: Skip sync check (with warning)

**Note:** bbg does NOT run `git tag` or `git push` in sub-projects — it generates the governance artifacts and checklist. Actual release mechanics are project-specific.

### 2.6 `bbg upgrade`

**Purpose:** Upgrade governance assets when bbg itself is updated to a new version.

**Strategy (3-way merge approach):**

For each file tracked in `.bbg/file-hashes.json`:

1. Compute current file hash
2. Compare with stored generated hash
3. Decision matrix:

| Current hash == stored hash | Action |
|---|---|
| Yes (user hasn't modified) | Overwrite with new template output |
| No (user has modified) | **Do not overwrite.** Generate `.bbg/upgrade-patches/<path>.patch` showing the diff between old generated and new generated. User reviews and applies manually. |
| File deleted by user | Skip (respect user's deletion) |
| New file in new bbg version | Generate as new file |

4. Update `.bbg/config.json` version field
5. Update `.bbg/file-hashes.json` for all overwritten files
6. Print summary: overwritten, patched, skipped, new

**Flags:**
- `--dry-run`: Show what would change without writing
- `--force`: Overwrite all files regardless of user modifications (with confirmation prompt)

---

## 3. Analyzers & Template Engine

### 3.1 Analyzer Architecture

Four deterministic analyzers run on each sub-project to detect stack information:

```
sub-project/
  ├─ pom.xml / build.gradle      → detect-stack, detect-deps, detect-testing
  ├─ package.json                 → detect-stack, detect-deps, detect-testing
  ├─ src/ / app/ / pages/         → detect-structure
  ├─ tsconfig.json / vite.config  → detect-stack
  └─ __tests__ / test/            → detect-testing
```

#### 3.1.1 `detect-stack`

Detects language, framework, and build tool.

**Detection rules (priority order):**

| Marker file | Language | Framework | Build tool |
|---|---|---|---|
| `pom.xml` | java | (inspect pom for spring-boot-starter) | maven |
| `build.gradle` / `build.gradle.kts` | java/kotlin | (inspect for spring plugin) | gradle |
| `package.json` + `tsconfig.json` | typescript | (inspect deps for vue/react/next/nuxt) | (inspect for npm/pnpm/yarn lock file) |
| `package.json` without `tsconfig.json` | javascript | (same dep inspection) | (same lock inspection) |
| `requirements.txt` / `pyproject.toml` / `setup.py` | python | (inspect for django/flask/fastapi) | pip/poetry/setuptools |
| `go.mod` | go | (inspect for gin/echo/fiber) | go |

**Lock file to package manager mapping:**
- `pnpm-lock.yaml` → pnpm
- `yarn.lock` → yarn
- `package-lock.json` → npm
- No lock file → npm (default)

#### 3.1.2 `detect-structure`

Detects project directory structure patterns.

**Output:** Array of recognized structure patterns:
- `has-src-main-java` (Maven/Gradle standard layout)
- `has-src-components` (frontend component directory)
- `has-pages-or-views` (page-based routing)
- `has-api-or-controllers` (API layer)
- `has-store-or-state` (state management)
- `has-public-or-static` (static assets)
- `has-docker` (Dockerfile or docker-compose)
- `has-ci` (.github/workflows, .gitlab-ci.yml, Jenkinsfile)

This is a shallow presence check (glob for directory/file existence), NOT deep AST analysis.

#### 3.1.3 `detect-deps`

Extracts key dependency names (not versions) for governance context.

**For npm-based projects:** Reads `package.json` dependencies + devDependencies keys.
**For Maven:** Parses `pom.xml` for `<artifactId>` values (xml2js).
**For Gradle:** Regex extraction of `implementation`/`testImplementation` declarations.
**For Python:** Reads `requirements.txt` lines or `pyproject.toml` `[project.dependencies]`.

**Output:** `string[]` of dependency names — used by templates to conditionally include governance sections (e.g., if `axios` is present, include API client testing notes).

#### 3.1.4 `detect-testing`

Detects test framework and test directory structure.

**Detection rules:**

| Marker | Test framework |
|---|---|
| `vitest` in devDeps | vitest |
| `jest` in devDeps | jest |
| `@testing-library/*` in devDeps | testing-library (supplement) |
| `junit` / `junit-jupiter` in Maven/Gradle deps | junit |
| `pytest` in Python deps | pytest |
| `testing` in Go imports | go-test |
| `src/test/` exists | (java standard test dir) |
| `__tests__/` or `*.test.*` or `*.spec.*` exists | (js/ts test convention) |

**Output:** `{ framework: string; hasTestDir: boolean; testPattern: string }`

### 3.2 Template Engine

**Engine:** Handlebars

**Template resolution order (highest priority first):**
1. `.bbg/templates/<path>.hbs` — user overrides
2. Built-in templates bundled with bbg package

**TemplateContext interface:**

```typescript
interface TemplateContext {
  // From BbgConfig
  projectName: string;
  projectDescription: string;
  repos: RepoEntry[];            // full repo entries with stack info

  // Computed helpers
  hasBackend: boolean;            // any repo.type === "backend"
  hasFrontendPc: boolean;
  hasFrontendH5: boolean;
  hasFrontendWeb: boolean;
  backendRepos: RepoEntry[];      // filtered
  frontendRepos: RepoEntry[];     // filtered
  allRepoNames: string[];         // for .gitignore, AGENTS.md lists

  // Governance
  riskThresholds: BbgConfig["governance"]["riskThresholds"];
  enableRedTeam: boolean;
  enableCrossAudit: boolean;

  // Stack aggregates (union across all repos)
  languages: string[];            // unique languages across all repos
  frameworks: string[];           // unique frameworks
  hasJava: boolean;
  hasTypeScript: boolean;
  hasPython: boolean;
  hasGo: boolean;

  // Metadata
  bbgVersion: string;
  generatedAt: string;            // ISO 8601
}
```

**Custom Handlebars helpers:**

| Helper | Description | Example |
|---|---|---|
| `{{#if-eq a b}}` | Equality check | `{{#if-eq repo.type "backend"}}...{{/if-eq}}` |
| `{{#if-includes arr val}}` | Array contains | `{{#if-includes languages "java"}}...{{/if-includes}}` |
| `{{join arr sep}}` | Join array | `{{join allRepoNames ", "}}` |
| `{{date format}}` | Current date | `{{date "YYYY-MM-DD"}}` |
| `{{risk-table thresholds}}` | Render risk threshold table | `{{risk-table riskThresholds}}` |
| `{{indent n text}}` | Indent text block | `{{indent 2 someBlock}}` |

---

## 4. Template Inventory & Classification

### 4.1 GENERIC Files (Copied Verbatim)

These files are project-independent and copied as-is without template rendering:

| # | File | Source reference |
|---|---|---|
| 1 | `docs/workflows/code-review-policy.md` | mxbc-posters verbatim |
| 2 | `docs/workflows/cross-audit-policy.md` | mxbc-posters verbatim |
| 3 | `docs/workflows/harness-engineering-playbook.md` | mxbc-posters verbatim |
| 4 | `docs/workflows/ai-task-prompt-template.md` | mxbc-posters verbatim |
| 5 | `docs/workflows/requirement-template.md` | mxbc-posters verbatim |
| 6 | `docs/security/backend-red-team-playbook.md` | mxbc-posters verbatim |
| 7 | `docs/workflows/regression-checklist.md` | mxbc-posters verbatim |
| 8 | `docs/tasks/TEMPLATE.md` | mxbc-posters verbatim |
| 9 | `docs/changes/TEMPLATE.md` | mxbc-posters verbatim |
| 10 | `docs/handoffs/TEMPLATE.md` | mxbc-posters verbatim |
| 11 | `docs/reports/cross-audit-report-TEMPLATE.md` | mxbc-posters verbatim |
| 12 | `docs/reports/red-team-report-TEMPLATE.md` | mxbc-posters verbatim |
| 13 | `docs/cleanup/secrets-and-config-governance.md` | mxbc-posters verbatim |
| 14 | `docs/environments/env-overview.md` | mxbc-posters verbatim |

### 4.2 TEMPLATE Files (Handlebars-Rendered)

These files are `.hbs` templates that get rendered with TemplateContext:

| # | Output path | Key template variables |
|---|---|---|
| 1 | `AGENTS.md` | `projectName`, `repos`, `riskThresholds`, `enableRedTeam`, `enableCrossAudit`, `allRepoNames` |
| 2 | `README.md` | `projectName`, `projectDescription`, `repos`, `riskThresholds` |
| 3 | `docs/system-architecture-and-ai-workflow.md` | `projectName`, `repos`, `languages`, `frameworks` |
| 4 | `docs/workflows/development-standards.md` | `projectName`, `repos`, `hasBackend`, `hasFrontendPc`, `hasFrontendH5` |
| 5 | `docs/workflows/release-checklist.md` | `repos`, `allRepoNames` |
| 6 | `docs/architecture/order-lifecycle.md` | `hasBackend`, `backendRepos` (conditional inclusion) |
| 7 | `docs/domains/` (multiple domain stubs) | `hasBackend`, `hasFrontendH5`, etc. (conditional sections) |
| 8 | `scripts/doctor.py` | `allRepoNames`, `repos` (check targets) |
| 9 | `scripts/sync_versions.py` | `repos` (sync targets) |
| 10 | `.githooks/pre-commit` | `allRepoNames` (ignore paths) |
| 11 | `.githooks/pre-push` | `allRepoNames` (ignore paths) |
| 12 | `<repo>/AGENTS.md` (child, per repo) | `repo.name`, `repo.type`, `repo.stack`, `repo.description`, `projectName` |

### 4.3 SCAFFOLD Files (AI-FILL Markers)

Some generated files contain `<!-- AI-FILL -->` markers where content requires domain-specific knowledge that bbg cannot determine:

```markdown
## Business Domains

<!-- AI-FILL: List the core business domains for this project.
     Examples: order, payment, product, user, inventory.
     For each domain, briefly describe its responsibility and key entities. -->
```

**Marker format:** `<!-- AI-FILL: <instruction for AI agent> -->`

These markers are:
- Counted by `bbg doctor` (as info-level, not errors)
- Preserved during `bbg upgrade` (not overwritten if user has filled them in)
- Intended to be completed by AI agents during the first development session

### 4.4 Upgrade File Handling Summary

| File category | On `bbg upgrade` |
|---|---|
| GENERIC (verbatim) | Always overwrite (no user customization expected) |
| TEMPLATE (rendered) | 3-way merge: overwrite if unmodified, generate patch if modified |
| SCAFFOLD (AI-FILL) | Never overwrite if file has been modified (user/AI has filled content) |
| User-created files | Never touched |

---

## 5. Dependencies & Build Plan

### 5.1 Runtime Dependencies

| Package | Purpose | Justification |
|---|---|---|
| `commander` | CLI framework | Mature, zero-dep, excellent TypeScript support |
| `@inquirer/prompts` | Interactive prompts | Modern ESM-native rewrite of Inquirer.js |
| `handlebars` | Template rendering | Logic-less templates, precompilation, custom helpers |
| `chalk` | Terminal colors | Universal terminal color support |
| `ora` | Spinners | Progress indication for git/analysis operations |
| `fast-glob` | File pattern matching | Cross-platform, fast, used by analyzers |
| `xml2js` | XML parsing | Parse Maven `pom.xml` for dependency detection |
| `execa` | Child process execution | Cross-platform process spawning (git commands) |

### 5.2 Dev Dependencies

| Package | Purpose |
|---|---|
| `typescript` | Type checking and compilation |
| `tsup` | Build/bundle (esbuild-based, fast) |
| `vitest` | Testing |
| `@types/node` | Node.js type definitions |
| `@types/xml2js` | xml2js type definitions |

### 5.3 Build Configuration

**Module system:** ESM (`"type": "module"` in package.json)
**Target:** Node.js >= 18 (LTS baseline)
**Entry point:** `src/cli.ts` → `dist/cli.js`
**Binary name:** `bbg` (via package.json `"bin"` field)

**tsup config:**
```typescript
{
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node18",
  clean: true,
  dts: true,
  shims: true,        // import.meta.url shim for CJS compat edge cases
  splitting: false,    // single entry, no code splitting needed
}
```

**package.json key fields:**
```json
{
  "name": "bbg",
  "type": "module",
  "bin": { "bbg": "./dist/cli.js" },
  "files": ["dist/", "templates/"],
  "engines": { "node": ">=18" }
}
```

Templates are bundled in the `templates/` directory at the package root, shipped alongside the `dist/` directory.

### 5.4 Source Structure

```
bbg/
  src/
    cli.ts                       # entry point, commander setup
    commands/
      init.ts                    # bbg init command
      add-repo.ts                # bbg add-repo command
      doctor.ts                  # bbg doctor command
      sync.ts                    # bbg sync command
      release.ts                 # bbg release command
      upgrade.ts                 # bbg upgrade command
    analyzers/
      detect-stack.ts
      detect-structure.ts
      detect-deps.ts
      detect-testing.ts
      index.ts                   # aggregator: run all analyzers
    templates/
      engine.ts                  # Handlebars setup, helper registration
      context.ts                 # TemplateContext builder
      render.ts                  # render all templates to output
    config/
      schema.ts                  # BbgConfig, RepoEntry, StackInfo types
      read-write.ts              # load/save .bbg/config.json
      hash.ts                    # file hash computation and tracking
    utils/
      git.ts                     # git operations (clone, ls-remote, fetch)
      fs.ts                      # cross-platform file operations
      prompts.ts                 # reusable prompt wrappers
      logger.ts                  # chalk-based structured logging
      errors.ts                  # error types and handler
      platform.ts                # cross-platform path/shell utilities
  templates/
    generic/                     # GENERIC files (copied verbatim)
    handlebars/                  # .hbs template files
    scaffold/                    # files with AI-FILL markers
  tests/
    unit/
      analyzers/
      templates/
      config/
      commands/
    integration/
    fixtures/                    # sample project fixtures for testing
  docs/
    superpowers/
      specs/
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  package.json
```

---

## 6. Error Handling, Cross-Platform & Boundary Constraints

### 6.1 Error Handling Architecture

**3-tier error model:**

| Tier | Error type | Handling |
|---|---|---|
| **Operational** | Git clone fails, network timeout, file permission denied | Retry hint + clear message. Non-zero exit code. |
| **Configuration** | Invalid config, missing required fields, schema violation | Specific field-level error message. Suggest `bbg doctor --fix`. |
| **Programming** | Unexpected null, type assertion failure | Stack trace to stderr. "This is a bug, please report" message. |

**Error class hierarchy:**

```typescript
class BbgError extends Error {
  constructor(
    message: string,
    public code: string,           // e.g., "GIT_CLONE_FAILED"
    public hint?: string,          // e.g., "Check your network connection"
    public cause?: Error,
  ) { super(message); }
}

class BbgConfigError extends BbgError { }
class BbgGitError extends BbgError { }
class BbgAnalyzerError extends BbgError { }
class BbgTemplateError extends BbgError { }
```

**Global error handler** in `cli.ts` catches all unhandled errors, formats them via chalk, and exits with appropriate code.

### 6.2 Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | General error / doctor check failed |
| `2` | Configuration error |
| `3` | Git operation failed |
| `4` | Template rendering error |
| `130` | User interrupted (Ctrl+C) |

### 6.3 Cross-Platform Compatibility (macOS + Windows)

**Critical because the user works on both macOS and Windows.**

| Concern | Solution |
|---|---|
| Path separators | Always use `path.join()` / `path.resolve()`. Never hardcode `/` or `\`. Use `path.posix.join()` only for git URLs and `.gitignore` entries. |
| Line endings | Write files with `\n` (LF). Add `.gitattributes` with `* text=auto` to generated projects. |
| Shell execution | Use `execa` which handles cross-platform shell differences. Never use `child_process.exec` with shell-specific syntax. |
| File permissions | Git hooks: on POSIX, `chmod +x` after generation. On Windows, git handles executable bit via config. Detect platform and skip `chmod` on Windows. |
| Temp directories | Use `os.tmpdir()` for any temporary files. |
| Home directory | Use `os.homedir()` — never hardcode `~`. |
| Path length | Windows MAX_PATH is 260 chars. Keep generated paths reasonably short. Warn if a generated path exceeds 200 chars. |
| Console encoding | Use chalk (auto-detects terminal capabilities). Avoid raw ANSI codes. |
| Git binary | Assume `git` is on PATH. Verify with `git --version` in init and provide clear error if missing. |

**Platform utility module (`src/utils/platform.ts`):**

```typescript
export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";
export const isLinux = process.platform === "linux";

export function makeExecutable(filePath: string): void {
  if (!isWindows) {
    fs.chmodSync(filePath, 0o755);
  }
}

export function normalizeGitIgnorePath(p: string): string {
  // .gitignore always uses forward slashes
  return p.split(path.sep).join("/");
}
```

### 6.4 Idempotency Guarantees

| Command | Idempotency behavior |
|---|---|
| `bbg init` | Refuses if `.bbg/` exists. Clean error, suggests `bbg upgrade`. |
| `bbg add-repo` | Refuses if repo name already registered. Clean error. |
| `bbg doctor` | Pure read-only (unless `--fix`). Always safe to re-run. |
| `bbg doctor --fix` | Fixes are idempotent (re-running produces same result). |
| `bbg sync` | Read-only unless `--update`. Re-running is safe. |
| `bbg release` | Generates new timestamped file each run (intentionally NOT idempotent). |
| `bbg upgrade` | Safe to re-run: unchanged files stay unchanged, patches regenerated. |

### 6.5 Boundary Constraints

**What bbg does NOT do:**
- Run tests or build sub-projects
- Push to remote repositories
- Create git tags or releases
- Modify sub-project source code (only generates child AGENTS.md at sub-project root)
- Analyze business domain semantics (that's for AI agents via AI-FILL markers)
- Enforce governance at runtime (that's for git hooks and CI)
- Manage CI/CD pipelines (it generates governance docs, not pipeline configs)

**What bbg DOES do:**
- Clone and register sub-project repositories
- Detect stack information via deterministic shallow analysis
- Generate and maintain governance documentation
- Validate governance structure integrity
- Track file modifications for safe upgrades
- Guide release process with checklists

### 6.6 Security Constraints

- Never store credentials in `.bbg/config.json`
- Git clone uses whatever auth the user has configured (SSH keys, credential helper)
- No network calls except `git ls-remote`, `git clone`, `git fetch`
- No telemetry, no phone-home
- Generated files never contain secrets (only structure and documentation)

---

## Appendix A: Relationship to mxbc-posters

bbg is a generalization of the governance patterns in mxbc-posters. The mapping:

| mxbc-posters asset | bbg treatment |
|---|---|
| Root `AGENTS.md` | TEMPLATE: `AGENTS.md.hbs` |
| Root `README.md` | TEMPLATE: `README.md.hbs` |
| `docs/workflows/code-review-policy.md` | GENERIC: copied verbatim |
| `docs/workflows/development-standards.md` | TEMPLATE: parameterized for repo list |
| `docs/security/backend-red-team-playbook.md` | GENERIC: copied verbatim |
| `scripts/doctor.py` | TEMPLATE: parameterized for repo names |
| `.githooks/pre-commit` | TEMPLATE: parameterized for ignore paths |
| `poster-admin-web/AGENTS.md` | TEMPLATE: `child-AGENTS.md.hbs` (per repo) |
| `docs/domains/order.md` (domain-specific) | SCAFFOLD: stub with AI-FILL markers |

## Appendix B: AI-FILL Marker Examples

```markdown
## Core Business Domains

<!-- AI-FILL: Identify and describe the core business domains for {{projectName}}.
     For each domain, provide:
     - Domain name
     - Responsibility summary (1-2 sentences)
     - Key entities
     - Risk level (high/medium/low)
     Example: "Order - Manages the full order lifecycle from creation to fulfillment.
     Key entities: Order, OrderItem, OrderStatus. Risk: High." -->

## State Machines

<!-- AI-FILL: Document any state machines in the backend.
     For each state machine:
     - Entity name
     - States (list)
     - Transitions (from → to, with trigger)
     - Invariants and constraints -->
```

## Appendix C: Doctor Check Implementation Notes

The `bbg doctor` command is modeled after `scripts/doctor.py` from mxbc-posters but implemented in TypeScript for consistency with the rest of bbg. Key differences:

- Checks are data-driven from `BbgConfig` (not hardcoded paths)
- Hash integrity check uses `.bbg/file-hashes.json`
- AI-FILL marker count is informational, not a failure
- Output format supports both human-readable (default) and JSON (`--json`)
- `--fix` mode can regenerate missing GENERIC/TEMPLATE files
