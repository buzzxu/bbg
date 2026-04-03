# BBG Harness Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve BBG from a governance scaffold generator into a project-local executable harness with telemetry, evals, policy enforcement, context packaging, and runtime-backed core workflow commands.

**Architecture:** Keep BBG's current generation-first architecture, but add a second layer: a local harness runtime stored under `.bbg/` and implemented in shared `src/runtime/`, `src/evals/`, `src/policy/`, and `src/context/` modules. Phase 1 intentionally stays project-local and file-backed, avoiding any hosted control plane; every new command should read and write a stable result schema so later telemetry export and organization-wide aggregation can be added without redesign.

**Tech Stack:** TypeScript (strict, ESM), Commander, vitest, existing `src/utils/fs.ts` helpers, existing template/governance generation pipeline, JSON/JSONL state files under `.bbg/`

---

## Research Inputs Driving This Plan

The plan below is based on the current BBG codebase plus the following external implementation signals:

- Anthropic, **Building effective agents**: prefer simple composable workflows, explicit routing, parallelization, orchestrator-workers, evaluator-optimizer.
- Anthropic, **Effective harnesses for long-running agents**: initializer artifacts, feature lists, progress files, clean session handoff, explicit self-verification.
- Anthropic, **Effective context engineering for AI agents**: context is finite, use just-in-time retrieval, compaction, structured note-taking, and sub-agent boundaries.
- OpenAI Developers, **Testing Agent Skills Systematically with Evals**: store execution traces, score deterministic checks first, then add rubric grading.
- LangSmith, **Evaluation concepts**: split offline evals and online evals; datasets/experiments for offline, runs/threads for online.
- Promptfoo, **Red team architecture**: separate attack generation, target interface, evaluation engine, and reporting.
- OpenTelemetry, **What is OpenTelemetry**: standardize around traces, metrics, logs, and semantic conventions rather than inventing incompatible telemetry shapes.
- Inngest, **Your Agent Needs a Harness, Not a Framework**: durable execution, retryable steps, singleton concurrency, auditable event history, orchestration separated from the agent loop.

These sources all point in the same direction: BBG should add a shared local runtime substrate first, then layer telemetry, evals, policy, and context management on top of that substrate.

---

## Scope Check

This is a program-level plan covering several closely related subsystems. To keep implementation incremental, the work is decomposed into one shared substrate task followed by five product tracks:

1. Runtime state plane and result schema
2. Executable workflow commands (`quality-gate`, `checkpoint`, `verify`, `sessions`)
3. Eval and benchmark subsystem
4. Policy and guardrail engine
5. Context engineering and harness audit feedback

This is still one coherent plan because every later track depends on the same `.bbg/` state model and shared command result schema.

---

## File Structure

### New files to create

| File                                             | Responsibility                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `src/runtime/schema.ts`                          | Shared runtime record types for runs, steps, events, sessions, checkpoints, and command results |
| `src/runtime/paths.ts`                           | Centralized `.bbg/` runtime path helpers                                                        |
| `src/runtime/store.ts`                           | Read/write helpers for runtime JSON and JSONL state                                             |
| `src/runtime/telemetry.ts`                       | Trace/metric/log event recording using BBG's local schema                                       |
| `src/runtime/checkpoints.ts`                     | Create and load checkpoint files                                                                |
| `src/runtime/sessions.ts`                        | Session history management and resume metadata                                                  |
| `src/runtime/quality-gate.ts`                    | Shared execution logic for build/test/typecheck/lint/security checks                            |
| `src/commands/quality-gate.ts`                   | Executable CLI command for the quality gate                                                     |
| `src/commands/checkpoint.ts`                     | Executable CLI command for saving baselines                                                     |
| `src/commands/verify.ts`                         | Executable CLI command for regression comparison                                                |
| `src/commands/sessions.ts`                       | Executable CLI command for session history and resume info                                      |
| `src/evals/schema.ts`                            | Eval dataset, experiment, and grader result types                                               |
| `src/evals/datasets.ts`                          | Read/write dataset and benchmark case files                                                     |
| `src/evals/runner.ts`                            | Offline eval runner over stored prompts/tasks and command traces                                |
| `src/evals/graders.ts`                           | Deterministic graders first, rubric grader hooks second                                         |
| `src/commands/eval.ts`                           | Executable CLI command for offline eval runs                                                    |
| `src/policy/schema.ts`                           | Policy config types for approvals, protected paths, blocked actions                             |
| `src/policy/engine.ts`                           | Policy decision engine used by commands and audits                                              |
| `src/policy/defaults.ts`                         | Default project-local policy packs by risk level                                                |
| `src/context/repo-map.ts`                        | Repo map generation using analyzer output and lightweight file structure summaries              |
| `src/context/task-bundles.ts`                    | Task-specific context bundle generation for target projects                                     |
| `src/commands/harness-audit.ts`                  | Executable CLI command for auditing local harness quality and coverage                          |
| `src/commands/model-route.ts`                    | Executable CLI command for model routing using heuristics plus telemetry feedback               |
| `tests/unit/runtime/schema.test.ts`              | Runtime schema shape tests                                                                      |
| `tests/unit/runtime/store.test.ts`               | Runtime file store tests                                                                        |
| `tests/unit/runtime/quality-gate.test.ts`        | Shared quality gate execution tests                                                             |
| `tests/unit/evals/datasets.test.ts`              | Eval dataset file tests                                                                         |
| `tests/unit/evals/runner.test.ts`                | Eval runner tests                                                                               |
| `tests/unit/policy/engine.test.ts`               | Policy engine decision tests                                                                    |
| `tests/unit/context/repo-map.test.ts`            | Repo map generation tests                                                                       |
| `tests/integration/quality-gate.command.test.ts` | End-to-end gate command tests                                                                   |
| `tests/integration/checkpoint.command.test.ts`   | End-to-end checkpoint tests                                                                     |
| `tests/integration/verify.command.test.ts`       | End-to-end regression comparison tests                                                          |
| `tests/integration/sessions.command.test.ts`     | End-to-end session storage tests                                                                |
| `tests/integration/eval.command.test.ts`         | End-to-end eval execution tests                                                                 |

### Existing files to modify

| File                                           | Change                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/config/schema.ts`                         | Add optional `runtime` config block for telemetry, eval, policy, and context settings                                           |
| `src/config/read-write.ts`                     | Parse and validate the new runtime config block while preserving backward compatibility                                         |
| `src/templates/context.ts`                     | Expose runtime settings to generated templates                                                                                  |
| `src/commands/init-prompts.ts`                 | Collect minimal runtime defaults during init without making init noisy                                                          |
| `src/commands/init.ts`                         | Write initial runtime-aware config defaults and seed `.bbg/` runtime directories/files                                          |
| `src/commands/doctor.ts`                       | Surface runtime validation checks and reuse new runtime helpers                                                                 |
| `src/doctor/checks.ts`                         | Add checks for checkpoints, sessions, runtime schema, and command result history                                                |
| `src/commands/sync.ts`                         | Persist repo analysis snapshots for repo map and later context bundles                                                          |
| `src/cli.ts`                                   | Register executable commands for `quality-gate`, `checkpoint`, `verify`, `sessions`, `eval`, `harness-audit`, and `model-route` |
| `src/templates/governance.ts`                  | No new generated markdown commands needed for phase 1, but cross-reference tests must continue to pass                          |
| `tests/unit/cli/commands-registration.test.ts` | Assert new executable CLI commands are registered                                                                               |
| `tests/unit/config/read-write.test.ts`         | Cover parsing of the runtime config block                                                                                       |
| `tests/integration/init.command.test.ts`       | Assert init seeds runtime-aware config and state files                                                                          |
| `tests/unit/commands/doctor.test.ts`           | Cover new runtime checks                                                                                                        |

---

## Runtime Data Model

All later features should use one shared local state plane under `.bbg/`:

```text
.bbg/
  config.json
  file-hashes.json
  checkpoints/
    <name>.json
  sessions/
    history.json
  runs/
    <run-id>.json
  events/
    <date>.jsonl
  evals/
    datasets/
      *.json
    experiments/
      *.json
  analysis/
    repos/<repo>.json
  context/
    repo-map.json
    bundles/<task-id>.json
```

Core TypeScript shape:

```ts
export interface BbgRuntimeConfig {
  telemetry: {
    enabled: boolean;
    backend: "local-jsonl";
    maxRunFiles: number;
    maxSessionHistory: number;
  };
  evaluation: {
    enabled: boolean;
    datasetsDir: string;
    experimentsDir: string;
  };
  policy: {
    enabled: boolean;
    approvalMode: "off" | "prompt" | "strict";
    protectedPaths: string[];
    blockedCommands: string[];
  };
  context: {
    enabled: boolean;
    repoMap: boolean;
    taskBundles: boolean;
    compaction: boolean;
  };
}

export interface BbgRunRecord {
  runId: string;
  command: string;
  startedAt: string;
  endedAt: string;
  status: "passed" | "failed" | "cancelled";
  sessionId?: string;
  durationMs: number;
  checks: Array<{ key: string; status: "pass" | "fail" | "skip"; detail: string }>;
  artifacts: string[];
}

export interface BbgCheckpointRecord {
  checkpointId: string;
  name: string;
  createdAt: string;
  build: { passed: boolean };
  tests: { passed: number; failed: number; skipped: number };
  typecheck: { errors: number };
  lint?: { passed: boolean };
  fileHashes: Record<string, string>;
}

export interface BbgSessionRecord {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  summary: string;
  modifiedFiles: string[];
  lastCommand?: string;
}
```

Design constraint: keep this local state format JSON-first and human-readable. Do not add a database in phase 1.

---

## Task 1: Add the Shared Runtime State Plane

**Files:**

- Create: `src/runtime/schema.ts`
- Create: `src/runtime/paths.ts`
- Create: `src/runtime/store.ts`
- Create: `src/runtime/telemetry.ts`
- Modify: `src/config/schema.ts`
- Modify: `src/config/read-write.ts`
- Modify: `src/commands/init.ts`
- Modify: `src/commands/init-prompts.ts`
- Test: `tests/unit/runtime/schema.test.ts`
- Test: `tests/unit/runtime/store.test.ts`
- Test: `tests/unit/config/read-write.test.ts`
- Test: `tests/integration/init.command.test.ts`

- [ ] **Step 1: Write failing config/runtime tests**

Add test cases asserting that config parsing accepts the new optional runtime block and that init creates the new state roots.

```ts
expect(parsed.runtime?.telemetry.backend).toBe("local-jsonl");
expect(parsed.runtime?.policy.approvalMode).toBe("prompt");
expect(await exists(join(cwd, ".bbg", "sessions", "history.json"))).toBe(true);
expect(await exists(join(cwd, ".bbg", "events"))).toBe(true);
```

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `npm test -- tests/unit/config/read-write.test.ts tests/integration/init.command.test.ts`

Expected: failures on missing `runtime` parsing and missing `.bbg/sessions` or `.bbg/events` state.

- [ ] **Step 3: Implement the runtime schema and store helpers**

Add runtime types and a minimal local store API.

```ts
export function runtimePath(cwd: string, ...parts: string[]): string {
  return join(cwd, ".bbg", ...parts);
}

export async function appendJsonlEvent(cwd: string, dateKey: string, event: unknown): Promise<string> {
  const filePath = runtimePath(cwd, "events", `${dateKey}.jsonl`);
  await appendTextFile(filePath, `${JSON.stringify(event)}\n`);
  return filePath;
}
```

- [ ] **Step 4: Seed runtime defaults during init**

Extend init config defaults with:

```ts
runtime: {
  telemetry: { enabled: true, backend: "local-jsonl", maxRunFiles: 200, maxSessionHistory: 20 },
  evaluation: { enabled: true, datasetsDir: ".bbg/evals/datasets", experimentsDir: ".bbg/evals/experiments" },
  policy: { enabled: true, approvalMode: "prompt", protectedPaths: [".git/", ".bbg/", "node_modules/"], blockedCommands: ["rm -rf /", "git push --force"] },
  context: { enabled: true, repoMap: true, taskBundles: true, compaction: true },
},
```

Also create these initial files on `runInit`:

```text
.bbg/sessions/history.json
.bbg/context/repo-map.json
```

- [ ] **Step 5: Re-run targeted tests**

Run: `npm test -- tests/unit/runtime/schema.test.ts tests/unit/runtime/store.test.ts tests/unit/config/read-write.test.ts tests/integration/init.command.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config/schema.ts src/config/read-write.ts src/commands/init.ts src/commands/init-prompts.ts src/runtime tests
git commit -m "feat: add local harness runtime state plane"
```

---

## Task 2: Implement Runtime-Backed Quality Commands

**Files:**

- Create: `src/runtime/checkpoints.ts`
- Create: `src/runtime/sessions.ts`
- Create: `src/runtime/quality-gate.ts`
- Create: `src/commands/quality-gate.ts`
- Create: `src/commands/checkpoint.ts`
- Create: `src/commands/verify.ts`
- Create: `src/commands/sessions.ts`
- Modify: `src/cli.ts`
- Test: `tests/unit/runtime/quality-gate.test.ts`
- Test: `tests/integration/quality-gate.command.test.ts`
- Test: `tests/integration/checkpoint.command.test.ts`
- Test: `tests/integration/verify.command.test.ts`
- Test: `tests/integration/sessions.command.test.ts`
- Test: `tests/unit/cli/commands-registration.test.ts`

- [ ] **Step 1: Write failing command registration and integration tests**

Register new CLI commands and write integration tests that expect output records to be created under `.bbg/`.

```ts
expect(latestInstance?.command.mock.calls.map(([name]) => name)).toContain("quality-gate");
expect(result.checks.find((c) => c.key === "build")?.status).toBe("pass");
expect(await exists(join(cwd, ".bbg", "checkpoints", "pre-migration.json"))).toBe(true);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/unit/cli/commands-registration.test.ts tests/integration/quality-gate.command.test.ts tests/integration/checkpoint.command.test.ts tests/integration/verify.command.test.ts tests/integration/sessions.command.test.ts`

Expected: failures because commands are not yet registered or implemented.

- [ ] **Step 3: Implement a shared command result executor**

`src/runtime/quality-gate.ts` should return one stable result shape regardless of caller.

```ts
export interface QualityGateResult {
  runId: string;
  status: "passed" | "failed";
  checks: Array<{
    key: "build" | "typecheck" | "tests" | "lint" | "security";
    status: "pass" | "fail" | "skip";
    detail: string;
  }>;
  artifacts: string[];
}
```

Use existing scripts where possible:

- `npm run build`
- `npm run typecheck`
- `npm test`
- `npm run lint`

Security in phase 1 should be lightweight and file-based:

- scan tracked text files for known secret patterns
- optionally run `npm audit --json` only when `package-lock.json` exists and command succeeds predictably

- [ ] **Step 4: Implement checkpoint, verify, and sessions on top of the shared runtime**

Behavior requirements:

- `checkpoint` runs build/test/typecheck, snapshots file hashes, stores `.bbg/checkpoints/<name>.json`
- `verify` compares current build/test/typecheck/lint against a checkpoint
- `sessions` reads and compares `.bbg/sessions/history.json`
- every command appends a run record and telemetry event

Minimal session history shape:

```ts
export interface SessionHistoryFile {
  sessions: BbgSessionRecord[];
}
```

- [ ] **Step 5: Wire commands into the CLI**

Add registrations after `upgrade` or grouped by runtime commands:

```ts
program.command("quality-gate");
program.command("checkpoint");
program.command("verify");
program.command("sessions");
```

- [ ] **Step 6: Run targeted tests**

Run: `npm test -- tests/unit/runtime/quality-gate.test.ts tests/unit/cli/commands-registration.test.ts tests/integration/quality-gate.command.test.ts tests/integration/checkpoint.command.test.ts tests/integration/verify.command.test.ts tests/integration/sessions.command.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/runtime src/commands src/cli.ts tests
git commit -m "feat: add executable harness quality commands"
```

---

## Task 3: Add Eval Datasets and Offline Harness Experiments

**Files:**

- Create: `src/evals/schema.ts`
- Create: `src/evals/datasets.ts`
- Create: `src/evals/graders.ts`
- Create: `src/evals/runner.ts`
- Create: `src/commands/eval.ts`
- Modify: `src/cli.ts`
- Test: `tests/unit/evals/datasets.test.ts`
- Test: `tests/unit/evals/runner.test.ts`
- Test: `tests/integration/eval.command.test.ts`

- [ ] **Step 1: Write failing eval tests**

Model the first offline eval set around deterministic harness checks rather than LLM judging.

```ts
expect(dataset.cases[0].kind).toBe("command-trace");
expect(result.summary.totalCases).toBe(3);
expect(result.summary.failedCases).toBe(1);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/unit/evals/datasets.test.ts tests/unit/evals/runner.test.ts tests/integration/eval.command.test.ts`

Expected: failures because the eval subsystem does not exist.

- [ ] **Step 3: Implement dataset and experiment shapes**

Keep phase 1 datasets simple and repo-local:

```ts
export interface EvalCase {
  id: string;
  description: string;
  command: string;
  expectedChecks: Array<{ key: string; status: "pass" | "fail" | "skip" }>;
}

export interface EvalDataset {
  datasetId: string;
  createdAt: string;
  cases: EvalCase[];
}

export interface EvalExperiment {
  experimentId: string;
  datasetId: string;
  createdAt: string;
  summary: { totalCases: number; passedCases: number; failedCases: number };
}
```

- [ ] **Step 4: Implement deterministic graders first**

Start with graders that score BBG command results and traces:

- command exited successfully
- expected checks were present
- expected artifacts were created
- no forbidden policy violations occurred

Rubric or LLM-as-judge hooks can be added later behind an interface:

```ts
export interface EvalGrader {
  key: string;
  grade(result: BbgRunRecord, testCase: EvalCase): EvalGrade;
}
```

- [ ] **Step 5: Add the `bbg eval` CLI command**

Support initial submodes:

- `bbg eval init`
- `bbg eval run --dataset <id>`
- `bbg eval report --experiment <id>`

Phase 1 `init` should seed a starter dataset that validates `quality-gate`, `checkpoint`, and `verify`.

- [ ] **Step 6: Run targeted tests**

Run: `npm test -- tests/unit/evals/datasets.test.ts tests/unit/evals/runner.test.ts tests/integration/eval.command.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/evals src/commands/eval.ts src/cli.ts tests
git commit -m "feat: add offline harness eval datasets and experiments"
```

---

## Task 4: Add a Local Policy Engine for Guardrails

**Files:**

- Create: `src/policy/schema.ts`
- Create: `src/policy/defaults.ts`
- Create: `src/policy/engine.ts`
- Modify: `src/commands/quality-gate.ts`
- Modify: `src/commands/checkpoint.ts`
- Modify: `src/commands/verify.ts`
- Modify: `src/commands/harness-audit.ts`
- Test: `tests/unit/policy/engine.test.ts`
- Test: `tests/integration/quality-gate.command.test.ts`

- [ ] **Step 1: Write failing policy engine tests**

```ts
expect(decision.allowed).toBe(false);
expect(decision.reason).toContain("protected path");
expect(decision.requiredApproval).toBe(true);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/unit/policy/engine.test.ts tests/integration/quality-gate.command.test.ts`

Expected: failures because policy evaluation is not available.

- [ ] **Step 3: Implement local policy decisions**

Policy checks should stay deterministic and file-backed in phase 1.

```ts
export interface PolicyDecision {
  allowed: boolean;
  requiredApproval: boolean;
  reason: string;
}

export function evaluateAction(
  policy: BbgRuntimeConfig["policy"],
  action: { kind: string; target?: string; command?: string },
): PolicyDecision {
  // block exact banned commands
  // require approval for protected paths
  // allow all other actions by default
}
```

- [ ] **Step 4: Enforce policy in runtime-backed commands**

Phase 1 enforcement rules:

- quality-gate and verify may read anything inside the repo but must not write outside `.bbg/`
- checkpoint must not overwrite an existing checkpoint unless name collision is resolved explicitly
- future command runners can call the same engine before shell execution

- [ ] **Step 5: Re-run tests**

Run: `npm test -- tests/unit/policy/engine.test.ts tests/integration/quality-gate.command.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/policy src/commands tests
git commit -m "feat: add local policy engine for harness guardrails"
```

---

## Task 5: Add Context Engineering Artifacts

**Files:**

- Create: `src/context/repo-map.ts`
- Create: `src/context/task-bundles.ts`
- Modify: `src/commands/sync.ts`
- Modify: `src/commands/sessions.ts`
- Test: `tests/unit/context/repo-map.test.ts`
- Test: `tests/integration/sync.command.test.ts`

- [ ] **Step 1: Write failing repo map tests**

```ts
expect(repoMap.repos[0].name).toBe("repo-a");
expect(repoMap.repos[0].language).toBe("typescript");
expect(bundle.files.length).toBeGreaterThan(0);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/unit/context/repo-map.test.ts tests/integration/sync.command.test.ts`

Expected: failures because no repo map or task bundle generation exists.

- [ ] **Step 3: Persist repo analysis snapshots during sync**

When `runSync` already calls `analyzeRepo`, also persist a stable analysis snapshot under `.bbg/analysis/repos/<repo>.json`.

```ts
export interface RepoAnalysisSnapshot {
  repoName: string;
  analyzedAt: string;
  stack: StackInfo;
  testing: { framework: string; hasTestDir: boolean; testPattern: string };
}
```

- [ ] **Step 4: Generate `repo-map.json` and task bundles**

`repo-map.json` should summarize:

- repo name
- repo type
- language/framework
- build/test/lint commands
- notable paths (`srcDir`, tests dir if detected)

`task-bundles.ts` should produce a compact JSON file that future agents can consume:

```ts
export interface TaskBundle {
  taskId: string;
  createdAt: string;
  query: string;
  relevantRepos: string[];
  suggestedCommands: string[];
  relevantFiles: string[];
}
```

- [ ] **Step 5: Re-run tests**

Run: `npm test -- tests/unit/context/repo-map.test.ts tests/integration/sync.command.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/context src/commands/sync.ts tests
git commit -m "feat: add repo maps and task bundles for harness context"
```

---

## Task 6: Implement Harness Audit and Telemetry-Guided Model Routing

**Files:**

- Create: `src/commands/harness-audit.ts`
- Create: `src/commands/model-route.ts`
- Modify: `src/cli.ts`
- Modify: `src/runtime/telemetry.ts`
- Modify: `src/doctor/checks.ts`
- Test: `tests/unit/cli/commands-registration.test.ts`
- Test: `tests/unit/commands/doctor.test.ts`
- Test: `tests/integration/eval.command.test.ts`

- [ ] **Step 1: Write failing audit and routing tests**

```ts
expect(report.coverage.missingExecutableCommands).toContain("quality-gate");
expect(route.recommendedModelClass).toBe("balanced");
expect(route.reason).toContain("context");
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/unit/cli/commands-registration.test.ts tests/unit/commands/doctor.test.ts tests/integration/eval.command.test.ts`

Expected: failures because audit/routing commands are not executable yet.

- [ ] **Step 3: Implement `bbg harness-audit` against real runtime state**

Audit categories for phase 1:

- generated markdown command exists but CLI command missing
- runtime command exists but no telemetry events found after use
- policy enabled but protected path list empty
- eval enabled but no datasets seeded
- repo map enabled but no repo-map file present

- [ ] **Step 4: Implement `bbg model-route` using heuristics plus local telemetry feedback**

Phase 1 route inputs:

- task complexity: simple / moderate / complex
- context size need: small / medium / large
- precision need: low / medium / high
- prior success by route class from local run history

Phase 1 output:

```ts
export interface ModelRouteRecommendation {
  recommendedModelClass: "fast" | "balanced" | "premium";
  confidence: number;
  reason: string;
}
```

Do not hardwire vendor names into the stored schema; keep the recommendation class generic so target tool templates can map it to actual models later.

- [ ] **Step 5: Re-run tests**

Run: `npm test -- tests/unit/cli/commands-registration.test.ts tests/unit/commands/doctor.test.ts tests/integration/eval.command.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/commands src/runtime/telemetry.ts src/doctor/checks.ts tests
git commit -m "feat: add harness audit and telemetry-guided model routing"
```

---

## Verification Matrix

After every task, run the narrow test set first, then the full repo verification before moving to the next task.

### Narrow verification per task

- Task 1: `npm test -- tests/unit/runtime/schema.test.ts tests/unit/runtime/store.test.ts tests/unit/config/read-write.test.ts tests/integration/init.command.test.ts`
- Task 2: `npm test -- tests/unit/runtime/quality-gate.test.ts tests/unit/cli/commands-registration.test.ts tests/integration/quality-gate.command.test.ts tests/integration/checkpoint.command.test.ts tests/integration/verify.command.test.ts tests/integration/sessions.command.test.ts`
- Task 3: `npm test -- tests/unit/evals/datasets.test.ts tests/unit/evals/runner.test.ts tests/integration/eval.command.test.ts`
- Task 4: `npm test -- tests/unit/policy/engine.test.ts tests/integration/quality-gate.command.test.ts`
- Task 5: `npm test -- tests/unit/context/repo-map.test.ts tests/integration/sync.command.test.ts`
- Task 6: `npm test -- tests/unit/cli/commands-registration.test.ts tests/unit/commands/doctor.test.ts tests/integration/eval.command.test.ts`

### Full verification after each completed task

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: all commands pass.

---

## Delivery Order Recommendation

If only one milestone is executed in the near term, implement Tasks 1 and 2 first. Those two tasks convert BBG from a pure scaffold generator into a runtime-backed harness foundation. Without them, evals, policy, context engineering, and audit remain mostly declarative.

Recommended milestone grouping:

1. **Milestone A:** Tasks 1-2
2. **Milestone B:** Tasks 3-4
3. **Milestone C:** Tasks 5-6

This order keeps the codebase incremental, testable, and useful after each milestone.

---

## Self-Review

### Spec coverage

- Telemetry gap: covered by Task 1 and Task 6
- Benchmark/eval gap: covered by Task 3
- Policy/guardrail gap: covered by Task 4
- Context engineering gap: covered by Task 5
- Runtime orchestration gap for core commands: covered by Task 2
- Harness self-audit and routing feedback: covered by Task 6

### Placeholder scan

- No `TBD` or `TODO` placeholders remain
- All new modules have exact file paths
- Every phase includes concrete verification commands

### Type consistency

- Shared runtime types are defined once in `src/runtime/schema.ts`
- Config additions are centralized in `BbgRuntimeConfig`
- Command outputs flow through `BbgRunRecord` and command-specific result shapes

---

Plan complete and saved to `docs/superpowers/plans/2026-04-02-bbg-harness-platform-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
