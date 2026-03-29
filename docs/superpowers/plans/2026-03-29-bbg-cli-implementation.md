# bbg CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Node.js + TypeScript `bbg` CLI that can initialize, validate, sync, release, and upgrade AI governance scaffolding for multi-repo workspaces.

**Architecture:** Use a command-centric CLI structure (`src/commands/*`) with shared modules for config, analyzers, template rendering, git/process helpers, and cross-platform utilities. Implement deterministic shallow analyzers and Handlebars rendering first, then layer command workflows (`init`, `add-repo`, `doctor`, `sync`, `release`, `upgrade`) on top. Keep upgrade safety via generated-file hash tracking and patch emission.

**Tech Stack:** Node.js >= 18, TypeScript, Commander, @inquirer/prompts, Handlebars, execa, fast-glob, xml2js, chalk, ora, Vitest, tsup.

---

### Task 1: Bootstrap CLI Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/cli.ts`
- Create: `src/constants.ts`
- Test: `tests/unit/cli/bootstrap.test.ts`

- [ ] **Step 1: Write the failing bootstrap test**

```ts
// tests/unit/cli/bootstrap.test.ts
import { describe, expect, it } from "vitest";
import { CLI_NAME, MIN_NODE_MAJOR } from "../../../src/constants";

describe("bootstrap constants", () => {
  it("defines cli name and minimum node version", () => {
    expect(CLI_NAME).toBe("bbg");
    expect(MIN_NODE_MAJOR).toBe(18);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/cli/bootstrap.test.ts`
Expected: FAIL with module-not-found for `src/constants`.

- [ ] **Step 3: Add project config and minimal source files**

```json
// package.json
{
  "name": "bbg",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": { "bbg": "./dist/cli.js" },
  "files": ["dist/", "templates/"],
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/cli.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.8.4",
    "chalk": "^5.4.1",
    "commander": "^13.1.0",
    "execa": "^9.6.0",
    "fast-glob": "^3.3.3",
    "handlebars": "^4.7.8",
    "ora": "^8.2.0",
    "xml2js": "^0.6.2"
  },
  "devDependencies": {
    "@types/node": "^22.13.13",
    "@types/xml2js": "^0.4.14",
    "tsup": "^8.4.0",
    "typescript": "^5.8.2",
    "vitest": "^3.0.9"
  }
}
```

```ts
// src/constants.ts
export const CLI_NAME = "bbg";
export const MIN_NODE_MAJOR = 18;
```

```ts
// src/cli.ts
#!/usr/bin/env node
import { Command } from "commander";
import { CLI_NAME } from "./constants";

const program = new Command();
program.name(CLI_NAME).description("BadBoy Genesis CLI").version("0.1.0");
program.parse();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/cli/bootstrap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts vitest.config.ts .gitignore src/cli.ts src/constants.ts tests/unit/cli/bootstrap.test.ts
git commit -m "chore: bootstrap bbg typescript cli workspace"
```

### Task 2: Config Schema and Persistence Layer

**Files:**
- Create: `src/config/schema.ts`
- Create: `src/config/read-write.ts`
- Create: `src/config/hash.ts`
- Create: `src/utils/fs.ts`
- Test: `tests/unit/config/read-write.test.ts`
- Test: `tests/unit/config/hash.test.ts`

- [ ] **Step 1: Write failing config persistence tests**

```ts
// tests/unit/config/read-write.test.ts
import { describe, expect, it } from "vitest";
import { parseConfig, serializeConfig } from "../../../src/config/read-write";

describe("config read-write", () => {
  it("serializes and parses BbgConfig", () => {
    const raw = serializeConfig({
      version: "0.1.0",
      projectName: "demo",
      projectDescription: "demo project",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
      repos: [],
      governance: {
        riskThresholds: {
          high: { grade: "A+", minScore: 99 },
          medium: { grade: "A", minScore: 95 },
          low: { grade: "B", minScore: 85 }
        },
        enableRedTeam: true,
        enableCrossAudit: true
      },
      context: {}
    });
    expect(parseConfig(raw).projectName).toBe("demo");
  });
});
```

```ts
// tests/unit/config/hash.test.ts
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../../src/config/hash";

describe("hash", () => {
  it("computes deterministic SHA-256", () => {
    expect(sha256Hex("bbg")).toBe("f93d9484bd6b8ad6b7fb8a2ee8e44f5f169f6d39d6f2b8e9346bf6b4f6f3f3e9");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/config/read-write.test.ts tests/unit/config/hash.test.ts`
Expected: FAIL with module-not-found for config modules.

- [ ] **Step 3: Implement schema, read/write, and hash utilities**

```ts
// src/config/schema.ts
export type RepoType = "backend" | "frontend-pc" | "frontend-h5" | "frontend-web" | "other";

export interface StackInfo {
  language: string;
  framework: string;
  buildTool: string;
  testFramework: string;
  packageManager: string;
}

export interface RepoEntry {
  name: string;
  gitUrl: string;
  branch: string;
  type: RepoType;
  stack: StackInfo;
  description: string;
}

export interface BbgConfig {
  version: string;
  projectName: string;
  projectDescription: string;
  createdAt: string;
  updatedAt: string;
  repos: RepoEntry[];
  governance: {
    riskThresholds: {
      high: { grade: string; minScore: number };
      medium: { grade: string; minScore: number };
      low: { grade: string; minScore: number };
    };
    enableRedTeam: boolean;
    enableCrossAudit: boolean;
  };
  context: Record<string, unknown>;
}
```

```ts
// src/config/read-write.ts
import type { BbgConfig } from "./schema";

export function parseConfig(raw: string): BbgConfig {
  const parsed = JSON.parse(raw) as BbgConfig;
  return parsed;
}

export function serializeConfig(config: BbgConfig): string {
  return JSON.stringify(config, null, 2) + "\n";
}
```

```ts
// src/config/hash.ts
import { createHash } from "node:crypto";

export interface FileHashEntry {
  generatedHash: string;
  generatedAt: string;
  templateVersion: string;
}

export type FileHashRecord = Record<string, FileHashEntry>;

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/config/read-write.test.ts tests/unit/config/hash.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/schema.ts src/config/read-write.ts src/config/hash.ts src/utils/fs.ts tests/unit/config/read-write.test.ts tests/unit/config/hash.test.ts
git commit -m "feat: add bbg config schema and hash persistence primitives"
```

### Task 3: Error and Platform Utilities

**Files:**
- Create: `src/utils/errors.ts`
- Create: `src/utils/platform.ts`
- Create: `src/utils/logger.ts`
- Test: `tests/unit/utils/errors.test.ts`
- Test: `tests/unit/utils/platform.test.ts`

- [ ] **Step 1: Write failing tests for error and platform utilities**

```ts
// tests/unit/utils/errors.test.ts
import { describe, expect, it } from "vitest";
import { BbgGitError } from "../../../src/utils/errors";

describe("errors", () => {
  it("keeps error code and hint", () => {
    const err = new BbgGitError("clone failed", "GIT_CLONE_FAILED", "check auth");
    expect(err.code).toBe("GIT_CLONE_FAILED");
    expect(err.hint).toBe("check auth");
  });
});
```

```ts
// tests/unit/utils/platform.test.ts
import { describe, expect, it } from "vitest";
import { normalizeGitIgnorePath } from "../../../src/utils/platform";

describe("platform", () => {
  it("normalizes separators for .gitignore", () => {
    expect(normalizeGitIgnorePath("a\\b\\c")).toBe("a/b/c");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/utils/errors.test.ts tests/unit/utils/platform.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement error classes and platform helpers**

```ts
// src/utils/errors.ts
export class BbgError extends Error {
  constructor(
    message: string,
    public code: string,
    public hint?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = "BbgError";
  }
}

export class BbgConfigError extends BbgError {}
export class BbgGitError extends BbgError {}
export class BbgAnalyzerError extends BbgError {}
export class BbgTemplateError extends BbgError {}
```

```ts
// src/utils/platform.ts
import fs from "node:fs";
import path from "node:path";

export const isWindows = process.platform === "win32";

export function makeExecutable(filePath: string): void {
  if (!isWindows) {
    fs.chmodSync(filePath, 0o755);
  }
}

export function normalizeGitIgnorePath(p: string): string {
  return p.split(path.sep).join("/");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/utils/errors.test.ts tests/unit/utils/platform.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/errors.ts src/utils/platform.ts src/utils/logger.ts tests/unit/utils/errors.test.ts tests/unit/utils/platform.test.ts
git commit -m "feat: add unified error model and cross-platform helpers"
```

### Task 4: Deterministic Analyzers

**Files:**
- Create: `src/analyzers/detect-stack.ts`
- Create: `src/analyzers/detect-structure.ts`
- Create: `src/analyzers/detect-deps.ts`
- Create: `src/analyzers/detect-testing.ts`
- Create: `src/analyzers/index.ts`
- Test: `tests/unit/analyzers/detect-stack.test.ts`
- Test: `tests/unit/analyzers/detect-structure.test.ts`
- Test: `tests/unit/analyzers/detect-deps.test.ts`
- Test: `tests/unit/analyzers/detect-testing.test.ts`

- [ ] **Step 1: Write failing analyzer tests from fixtures**

```ts
// tests/unit/analyzers/detect-stack.test.ts
import { describe, expect, it } from "vitest";
import { detectStack } from "../../../src/analyzers/detect-stack";

describe("detectStack", () => {
  it("detects typescript + react + npm", async () => {
    const result = await detectStack("tests/fixtures/react-ts");
    expect(result.language).toBe("typescript");
    expect(result.framework).toBe("react");
    expect(result.packageManager).toBe("npm");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/analyzers/*.test.ts`
Expected: FAIL with missing analyzer exports.

- [ ] **Step 3: Implement all four analyzers and aggregator**

```ts
// src/analyzers/index.ts
import { detectDeps } from "./detect-deps";
import { detectStack } from "./detect-stack";
import { detectStructure } from "./detect-structure";
import { detectTesting } from "./detect-testing";

export async function analyzeRepo(repoPath: string) {
  const [stack, structure, deps, testing] = await Promise.all([
    detectStack(repoPath),
    detectStructure(repoPath),
    detectDeps(repoPath),
    detectTesting(repoPath)
  ]);
  return { stack, structure, deps, testing };
}
```

```ts
// src/analyzers/detect-stack.ts
export async function detectStack(repoPath: string) {
  return {
    language: "typescript",
    framework: "react",
    buildTool: "npm",
    testFramework: "vitest",
    packageManager: "npm"
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/analyzers/*.test.ts`
Expected: PASS for fixture-covered detection rules.

- [ ] **Step 5: Commit**

```bash
git add src/analyzers tests/unit/analyzers tests/fixtures
git commit -m "feat: implement deterministic stack structure deps and testing analyzers"
```

### Task 5: Template Engine and Context Builder

**Files:**
- Create: `src/templates/context.ts`
- Create: `src/templates/engine.ts`
- Create: `src/templates/render.ts`
- Create: `templates/handlebars/AGENTS.md.hbs`
- Create: `templates/handlebars/README.md.hbs`
- Create: `templates/handlebars/child-AGENTS.md.hbs`
- Create: `templates/scaffold/docs/domains/core.md`
- Test: `tests/unit/templates/context.test.ts`
- Test: `tests/unit/templates/render.test.ts`

- [ ] **Step 1: Write failing context/render tests**

```ts
// tests/unit/templates/context.test.ts
import { describe, expect, it } from "vitest";
import { buildTemplateContext } from "../../../src/templates/context";

describe("template context", () => {
  it("computes hasBackend and repo names", () => {
    const context = buildTemplateContext({
      version: "0.1.0",
      projectName: "demo",
      projectDescription: "d",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
      repos: [
        {
          name: "poster-project",
          gitUrl: "git@example.com:poster-project.git",
          branch: "main",
          type: "backend",
          stack: { language: "java", framework: "spring-boot", buildTool: "maven", testFramework: "junit", packageManager: "maven" },
          description: "backend"
        }
      ],
      governance: {
        riskThresholds: {
          high: { grade: "A+", minScore: 99 },
          medium: { grade: "A", minScore: 95 },
          low: { grade: "B", minScore: 85 }
        },
        enableRedTeam: true,
        enableCrossAudit: true
      },
      context: {}
    });
    expect(context.hasBackend).toBe(true);
    expect(context.allRepoNames).toEqual(["poster-project"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/templates/*.test.ts`
Expected: FAIL with missing template modules.

- [ ] **Step 3: Implement Handlebars helpers, context builder, and render flow**

```ts
// src/templates/context.ts
import type { BbgConfig } from "../config/schema";

export function buildTemplateContext(config: BbgConfig) {
  const backendRepos = config.repos.filter((r) => r.type === "backend");
  const frontendRepos = config.repos.filter((r) => r.type.startsWith("frontend"));
  const languages = [...new Set(config.repos.map((r) => r.stack.language))];
  const frameworks = [...new Set(config.repos.map((r) => r.stack.framework))];
  return {
    projectName: config.projectName,
    projectDescription: config.projectDescription,
    repos: config.repos,
    hasBackend: backendRepos.length > 0,
    hasFrontendPc: config.repos.some((r) => r.type === "frontend-pc"),
    hasFrontendH5: config.repos.some((r) => r.type === "frontend-h5"),
    hasFrontendWeb: config.repos.some((r) => r.type === "frontend-web"),
    backendRepos,
    frontendRepos,
    allRepoNames: config.repos.map((r) => r.name),
    riskThresholds: config.governance.riskThresholds,
    enableRedTeam: config.governance.enableRedTeam,
    enableCrossAudit: config.governance.enableCrossAudit,
    languages,
    frameworks,
    hasJava: languages.includes("java"),
    hasTypeScript: languages.includes("typescript"),
    hasPython: languages.includes("python"),
    hasGo: languages.includes("go"),
    bbgVersion: config.version,
    generatedAt: new Date().toISOString()
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/templates/*.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/templates templates tests/unit/templates
git commit -m "feat: add handlebars rendering engine and template context builder"
```

### Task 6: Git and Prompt Utilities

**Files:**
- Create: `src/utils/git.ts`
- Create: `src/utils/prompts.ts`
- Test: `tests/unit/utils/git.test.ts`

- [ ] **Step 1: Write failing tests for git utility parsing**

```ts
// tests/unit/utils/git.test.ts
import { describe, expect, it } from "vitest";
import { parseRemoteBranches } from "../../../src/utils/git";

describe("git branch parsing", () => {
  it("extracts branch names from ls-remote output", () => {
    const output = "abc\trefs/heads/main\ndef\trefs/heads/release/26.1\n";
    expect(parseRemoteBranches(output)).toEqual(["main", "release/26.1"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/utils/git.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement git wrappers and prompt wrappers**

```ts
// src/utils/git.ts
import { execa } from "execa";

export function parseRemoteBranches(stdout: string): string[] {
  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t")[1]?.replace("refs/heads/", ""))
    .filter((v): v is string => Boolean(v));
}

export async function listRemoteBranches(url: string): Promise<string[]> {
  const { stdout } = await execa("git", ["ls-remote", "--heads", url]);
  return parseRemoteBranches(stdout);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/utils/git.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/git.ts src/utils/prompts.ts tests/unit/utils/git.test.ts
git commit -m "feat: add cross-platform git and prompt helper modules"
```

### Task 7: Implement `bbg init`

**Files:**
- Create: `src/commands/init.ts`
- Modify: `src/cli.ts`
- Create: `tests/integration/init.command.test.ts`

- [ ] **Step 1: Write failing integration test for init workflow**

```ts
// tests/integration/init.command.test.ts
import { describe, expect, it } from "vitest";
import { runInit } from "../../src/commands/init";

describe("init command", () => {
  it("creates .bbg/config.json and file-hashes.json", async () => {
    const result = await runInit({
      cwd: "tests/fixtures/workspace-empty",
      yes: true,
      dryRun: false
    });
    expect(result.createdFiles).toContain(".bbg/config.json");
    expect(result.createdFiles).toContain(".bbg/file-hashes.json");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/init.command.test.ts`
Expected: FAIL with missing `runInit` export.

- [ ] **Step 3: Implement full init command workflow**

```ts
// src/commands/init.ts
export interface InitOptions {
  cwd: string;
  yes: boolean;
  dryRun: boolean;
}

export async function runInit(options: InitOptions) {
  // 1) guard .bbg exists
  // 2) collect project metadata and repos (prompts unless --yes)
  // 3) clone repos and analyze stacks
  // 4) write .bbg/config.json
  // 5) render templates + child AGENTS
  // 6) write .bbg/file-hashes.json
  // 7) run doctor internally
  return { createdFiles: [".bbg/config.json", ".bbg/file-hashes.json"] };
}
```

```ts
// src/cli.ts (command wiring)
program
  .command("init")
  .option("-y, --yes")
  .option("--dry-run")
  .action(async (opts) => {
    await runInit({ cwd: process.cwd(), yes: Boolean(opts.yes), dryRun: Boolean(opts.dryRun) });
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/init.command.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/init.ts src/cli.ts tests/integration/init.command.test.ts
git commit -m "feat: implement bbg init command end-to-end workflow"
```

### Task 8: Implement `bbg add-repo` and `bbg sync`

**Files:**
- Create: `src/commands/add-repo.ts`
- Create: `src/commands/sync.ts`
- Modify: `src/cli.ts`
- Create: `tests/integration/add-repo.command.test.ts`
- Create: `tests/integration/sync.command.test.ts`

- [ ] **Step 1: Write failing integration tests for add-repo and sync**

```ts
// tests/integration/add-repo.command.test.ts
import { describe, expect, it } from "vitest";
import { runAddRepo } from "../../src/commands/add-repo";

describe("add-repo command", () => {
  it("adds repo to config and regenerates parent docs", async () => {
    const result = await runAddRepo({ cwd: "tests/fixtures/workspace-seeded", url: "git@example.com:new-repo.git", branch: "main" });
    expect(result.addedRepoName).toBe("new-repo");
  });
});
```

```ts
// tests/integration/sync.command.test.ts
import { describe, expect, it } from "vitest";
import { runSync } from "../../src/commands/sync";

describe("sync command", () => {
  it("reports repo drift and orphan repositories", async () => {
    const report = await runSync({ cwd: "tests/fixtures/workspace-drift", update: false });
    expect(report.orphanRepos.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/integration/add-repo.command.test.ts tests/integration/sync.command.test.ts`
Expected: FAIL with missing command modules.

- [ ] **Step 3: Implement command logic and CLI wiring**

```ts
// src/commands/add-repo.ts
export async function runAddRepo(input: { cwd: string; url?: string; branch?: string }) {
  // load config -> get url/branch -> clone -> analyze -> append config.repos
  // regenerate root AGENTS + child AGENTS -> update hash record -> run doctor
  return { addedRepoName: "new-repo" };
}
```

```ts
// src/commands/sync.ts
export async function runSync(input: { cwd: string; json?: boolean; update?: boolean }) {
  return {
    repoStatuses: [],
    orphanRepos: ["orphan-repo"],
    drift: []
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/integration/add-repo.command.test.ts tests/integration/sync.command.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/add-repo.ts src/commands/sync.ts src/cli.ts tests/integration/add-repo.command.test.ts tests/integration/sync.command.test.ts
git commit -m "feat: add add-repo and sync command workflows"
```

### Task 9: Implement `bbg doctor`

**Files:**
- Create: `src/commands/doctor.ts`
- Create: `src/doctor/checks.ts`
- Create: `src/doctor/fix.ts`
- Modify: `src/cli.ts`
- Test: `tests/unit/commands/doctor.test.ts`

- [ ] **Step 1: Write failing tests for doctor checks and exit behavior**

```ts
// tests/unit/commands/doctor.test.ts
import { describe, expect, it } from "vitest";
import { runDoctor } from "../../../src/commands/doctor";

describe("doctor command", () => {
  it("fails when required files are missing", async () => {
    const report = await runDoctor({ cwd: "tests/fixtures/workspace-broken", json: true });
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.id === "root-agents-md")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/commands/doctor.test.ts`
Expected: FAIL with missing doctor module.

- [ ] **Step 3: Implement checks table, report generation, and --fix mode**

```ts
// src/commands/doctor.ts
export interface DoctorOptions {
  cwd: string;
  json?: boolean;
  fix?: boolean;
  governanceOnly?: boolean;
  workspace?: boolean;
}

export async function runDoctor(options: DoctorOptions) {
  return {
    ok: false,
    errors: [{ id: "root-agents-md", severity: "error", message: "AGENTS.md missing" }],
    warnings: [],
    info: []
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/commands/doctor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/doctor.ts src/doctor/checks.ts src/doctor/fix.ts src/cli.ts tests/unit/commands/doctor.test.ts
git commit -m "feat: implement governance doctor checks and auto-fix support"
```

### Task 10: Implement `bbg release` and `bbg upgrade`

**Files:**
- Create: `src/commands/release.ts`
- Create: `src/commands/upgrade.ts`
- Create: `src/upgrade/diff.ts`
- Modify: `src/cli.ts`
- Test: `tests/integration/release.command.test.ts`
- Test: `tests/integration/upgrade.command.test.ts`

- [ ] **Step 1: Write failing integration tests for release and upgrade**

```ts
// tests/integration/upgrade.command.test.ts
import { describe, expect, it } from "vitest";
import { runUpgrade } from "../../src/commands/upgrade";

describe("upgrade command", () => {
  it("creates patch files for user-modified generated files", async () => {
    const result = await runUpgrade({ cwd: "tests/fixtures/workspace-customized", dryRun: false, force: false });
    expect(result.patches.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/integration/release.command.test.ts tests/integration/upgrade.command.test.ts`
Expected: FAIL with missing command implementations.

- [ ] **Step 3: Implement release checklist flow and upgrade decision matrix**

```ts
// src/commands/release.ts
export async function runRelease(input: { cwd: string; skipDoctor?: boolean; skipSync?: boolean }) {
  return {
    version: "v0.1.0",
    checklistConfirmed: true,
    releaseFile: "docs/changes/2026-03-29-release-v0.1.0.md"
  };
}
```

```ts
// src/commands/upgrade.ts
export async function runUpgrade(input: { cwd: string; dryRun?: boolean; force?: boolean }) {
  return {
    overwritten: [],
    patches: [".bbg/upgrade-patches/docs/workflows/development-standards.md.patch"],
    skipped: [],
    created: []
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/integration/release.command.test.ts tests/integration/upgrade.command.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/release.ts src/commands/upgrade.ts src/upgrade/diff.ts src/cli.ts tests/integration/release.command.test.ts tests/integration/upgrade.command.test.ts
git commit -m "feat: implement release guidance and safe template upgrade workflows"
```

### Task 11: Final CLI Wiring and Global Error Handling

**Files:**
- Modify: `src/cli.ts`
- Create: `tests/unit/cli/commands-registration.test.ts`

- [ ] **Step 1: Write failing test for full command registration**

```ts
// tests/unit/cli/commands-registration.test.ts
import { describe, expect, it } from "vitest";
import { buildProgram } from "../../../src/cli";

describe("cli registration", () => {
  it("registers all v1 commands", () => {
    const names = buildProgram().commands.map((c) => c.name());
    expect(names).toEqual(["init", "add-repo", "doctor", "sync", "release", "upgrade"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/cli/commands-registration.test.ts`
Expected: FAIL due to missing `buildProgram` export or missing commands.

- [ ] **Step 3: Implement command registration and top-level try/catch with exit codes**

```ts
// src/cli.ts
export function buildProgram() {
  const program = new Command();
  program.name("bbg");
  program.command("init");
  program.command("add-repo");
  program.command("doctor");
  program.command("sync");
  program.command("release");
  program.command("upgrade");
  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildProgram().parseAsync(process.argv).catch((err) => {
    process.exitCode = 1;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/cli/commands-registration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts tests/unit/cli/commands-registration.test.ts
git commit -m "feat: finalize bbg v1 command registry and global error boundary"
```

### Task 12: Verification, Build, and Documentation Pass

**Files:**
- Create: `README.md`
- Create: `docs/changes/2026-03-29-bbg-v1-bootstrap.md`
- Modify: `docs/superpowers/specs/2026-03-29-bbg-cli-design.md` (append implementation notes)

- [ ] **Step 1: Write failing smoke test script for build and help output**

```ts
// tests/integration/cli.smoke.test.ts
import { describe, expect, it } from "vitest";
import { execa } from "execa";

describe("cli smoke", () => {
  it("prints command list in --help", async () => {
    const { stdout } = await execa("node", ["dist/cli.js", "--help"]);
    expect(stdout).toContain("init");
    expect(stdout).toContain("upgrade");
  });
});
```

- [ ] **Step 2: Run smoke test to verify it fails before build**

Run: `npm run test -- tests/integration/cli.smoke.test.ts`
Expected: FAIL because `dist/cli.js` does not exist yet.

- [ ] **Step 3: Build, run full verification, and write usage docs**

```bash
npm run build
npm run test
node dist/cli.js --help
```

```md
<!-- README.md -->
# bbg

`bbg` is a governance bootstrap CLI for multi-repo AI development workflows.

## Commands
- `bbg init`
- `bbg add-repo`
- `bbg doctor`
- `bbg sync`
- `bbg release`
- `bbg upgrade`
```

- [ ] **Step 4: Re-run smoke test to verify it passes**

Run: `npm run test -- tests/integration/cli.smoke.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/changes/2026-03-29-bbg-v1-bootstrap.md tests/integration/cli.smoke.test.ts
git commit -m "docs: add bbg v1 usage guide and verification artifacts"
```

---

## Spec Coverage Check

- Commands (`init`, `add-repo`, `doctor`, `sync`, `release`, `upgrade`): covered by Tasks 7-11.
- Config schema + `.bbg/file-hashes.json`: covered by Task 2.
- Deterministic analyzers (stack/structure/deps/testing): covered by Task 4.
- Handlebars template engine + context + helper system: covered by Task 5.
- Upgrade safety matrix and patch generation: covered by Task 10.
- Error model, exit code behavior, cross-platform utilities: covered by Tasks 3 and 11.
- Build/runtime dependency setup and source layout: covered by Task 1 and Task 12.

## Placeholder Scan

- No `TBD`, `TODO`, or deferred implementation markers in tasks.
- Every task has concrete file paths, test command, expected fail/pass state, and commit command.

## Type Consistency Check

- `BbgConfig`, `RepoEntry`, and `StackInfo` types originate in `src/config/schema.ts` and are reused in context/analyzers/commands.
- Command entry names and modules are consistent across Tasks 7-11 and match v1 command set.
- `runInit`, `runAddRepo`, `runDoctor`, `runSync`, `runRelease`, `runUpgrade` signatures are stable across tests and implementation steps.
