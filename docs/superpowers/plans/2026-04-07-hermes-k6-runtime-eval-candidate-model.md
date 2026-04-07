# Hermes K6 Runtime / Eval / Candidate Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first Hermes completion phase by introducing structured runtime, evaluation, artifact, and candidate data models that generated projects can use as the substrate for later distillation and promotion workflows.

**Architecture:** Extend the existing knowledge metadata layer instead of inventing a parallel storage system. K6 adds Hermes-specific config, SQL schema, starter docs, and governance assets so local Hermes can record execution runs, evaluations, artifacts, and candidate objects without yet attempting automatic skill promotion or cross-project aggregation.

**Tech Stack:** TypeScript, Vitest, SQLite schema templates, JSON config validation, Markdown governance assets, existing runtime and knowledge-layer scaffolding

---

## File Structure

### New files

- `commands/hermes-log.md` — command for inspecting recent Hermes run and evaluation records
- `commands/hermes-candidates.md` — command for reviewing local Hermes candidate objects
- `skills/hermes-runtime/SKILL.md` — workflow for recording and inspecting Hermes runtime events
- `skills/hermes-evaluation/SKILL.md` — workflow for evaluating runs and deciding whether they merit candidate creation
- `templates/generic/.bbg/scripts/hermes-schema.sql` — Hermes SQL schema for runs, artifacts, evaluations, candidates, and evidence links
- `templates/generic/docs/wiki/processes/hermes-runtime.md` — process page describing how local Hermes records execution and candidate formation

### Modified files

- `src/config/schema.ts` — extend `KnowledgeConfig` with Hermes-related runtime switches and file roots
- `src/config/read-write.ts` — validate new Hermes config properties and path safety
- `src/templates/governance.ts` — register K6 Hermes commands, skills, SQL schema, and process doc
- `src/doctor/self-checks.ts` — include Hermes K6 assets in orphan detection and existence checks
- `templates/generic/.bbg/knowledge/README.md` — explain Hermes runtime/evaluation/candidate metadata responsibilities
- `templates/generic/.bbg/scripts/knowledge-schema.sql` — add a short note pointing to the new Hermes schema companion file
- `tests/unit/config/read-write.test.ts` — cover Hermes config round-tripping and invalid-path rejection
- `tests/unit/templates/governance.test.ts` — assert K6 Hermes assets and updated totals
- `tests/unit/templates/governance.crossref.test.ts` — validate new related links
- `tests/unit/doctor/self-checks.test.ts` — cover K6 Hermes self-check IDs

### Existing files to inspect while implementing

- `docs/superpowers/specs/2026-04-07-hermes-completion-design.md` — approved Hermes design and K6 scope
- `src/runtime/schema.ts` — existing runtime config pattern to mirror for K6 defaults
- `tests/unit/runtime/schema.test.ts` — examples of focused schema/default tests
- `templates/generic/.bbg/scripts/knowledge-schema.sql` — current trust-oriented knowledge schema that K6 should complement rather than replace
- `templates/generic/docs/wiki/processes/knowledge-compilation.md` — style reference for process docs in the knowledge layer

---

## Task 1: Extend config schema for local Hermes settings

**Files:**

- Modify: `src/config/schema.ts`
- Modify: `src/config/read-write.ts`
- Test: `tests/unit/config/read-write.test.ts`

- [ ] **Step 1: Write the failing config test for Hermes round-trip support**

Add this test near the existing knowledge config coverage in `tests/unit/config/read-write.test.ts`:

```ts
it("round-trips config with Hermes knowledge settings", () => {
  const configWithHermes: BbgConfig = {
    ...sampleConfigWithKnowledge,
    knowledge: {
      ...sampleConfigWithKnowledge.knowledge,
      hermes: {
        enabled: true,
        runsRoot: ".bbg/hermes/runs",
        evaluationsRoot: ".bbg/hermes/evaluations",
        candidatesRoot: ".bbg/hermes/candidates",
      },
    },
  };

  const raw = serializeConfig(configWithHermes);

  expect(parseConfig(raw)).toEqual(configWithHermes);
});
```

- [ ] **Step 2: Run the config test to verify it fails**

Run: `npx vitest run tests/unit/config/read-write.test.ts -t "round-trips config with Hermes knowledge settings"`

Expected: FAIL because `KnowledgeConfig` does not yet allow a `hermes` object.

- [ ] **Step 3: Add a failing invalid-path test for Hermes roots**

Add this test to `tests/unit/config/read-write.test.ts`:

```ts
it("throws ConfigValidationError for Hermes paths outside allowed roots", () => {
  const invalidShape = JSON.stringify({
    ...sampleConfigWithKnowledge,
    knowledge: {
      ...sampleConfigWithKnowledge.knowledge,
      hermes: {
        enabled: true,
        runsRoot: "../runs",
        evaluationsRoot: "/tmp/evals",
        candidatesRoot: ".bbg/hermes/candidates",
      },
    },
  });

  expect(() => parseConfig(invalidShape)).toThrow(ConfigValidationError);
});
```

- [ ] **Step 4: Run the invalid-path test to verify it fails**

Run: `npx vitest run tests/unit/config/read-write.test.ts -t "throws ConfigValidationError for Hermes paths outside allowed roots"`

Expected: FAIL because the Hermes config shape is still unknown.

- [ ] **Step 5: Add Hermes config types to `src/config/schema.ts`**

Update `src/config/schema.ts` so `KnowledgeConfig` includes a nested Hermes config:

```ts
export interface HermesRuntimeConfig {
  enabled?: boolean;
  runsRoot?: string;
  evaluationsRoot?: string;
  candidatesRoot?: string;
}

export interface KnowledgeConfig {
  enabled?: boolean;
  databaseFile?: string;
  sourceRoot?: string;
  wikiRoot?: string;
  hermes?: HermesRuntimeConfig;
}
```

- [ ] **Step 6: Add Hermes config validation to `src/config/read-write.ts`**

Add this helper near `isKnowledgeConfig`:

```ts
function isHermesRuntimeConfig(value: unknown): value is NonNullable<NonNullable<BbgConfig["knowledge"]>["hermes"]> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.enabled === undefined || typeof value.enabled === "boolean") &&
    (value.runsRoot === undefined || (isString(value.runsRoot) && isValidWorkspaceRelativePath(value.runsRoot))) &&
    (value.evaluationsRoot === undefined ||
      (isString(value.evaluationsRoot) && isValidWorkspaceRelativePath(value.evaluationsRoot))) &&
    (value.candidatesRoot === undefined ||
      (isString(value.candidatesRoot) && isValidWorkspaceRelativePath(value.candidatesRoot)))
  );
}
```

Then extend `isKnowledgeConfig` like this:

```ts
function isKnowledgeConfig(value: unknown): value is NonNullable<BbgConfig["knowledge"]> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.enabled === undefined || typeof value.enabled === "boolean") &&
    (value.databaseFile === undefined ||
      (isString(value.databaseFile) && isValidRuntimeRelativePath(value.databaseFile))) &&
    (value.sourceRoot === undefined ||
      (isString(value.sourceRoot) && isValidWorkspaceRelativePath(value.sourceRoot))) &&
    (value.wikiRoot === undefined || (isString(value.wikiRoot) && isValidWorkspaceRelativePath(value.wikiRoot))) &&
    (value.hermes === undefined || isHermesRuntimeConfig(value.hermes))
  );
}
```

- [ ] **Step 7: Run the config tests to verify they pass**

Run: `npx vitest run tests/unit/config/read-write.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the config schema work**

```bash
git add src/config/schema.ts src/config/read-write.ts tests/unit/config/read-write.test.ts
git commit -m "feat: add Hermes runtime config settings"
```

---

## Task 2: Add Hermes runtime SQL schema and knowledge-layer guidance

**Files:**

- Create: `templates/generic/.bbg/scripts/hermes-schema.sql`
- Modify: `templates/generic/.bbg/scripts/knowledge-schema.sql`
- Modify: `templates/generic/.bbg/knowledge/README.md`

- [ ] **Step 1: Write the Hermes SQL schema file**

Create `templates/generic/.bbg/scripts/hermes-schema.sql` with this content:

```sql
-- hermes-schema.sql -- Local Hermes runtime / evaluation / candidate schema

CREATE TABLE IF NOT EXISTS hermes_runs (
  run_id            TEXT PRIMARY KEY,
  task_type         TEXT NOT NULL,
  task_ref          TEXT,
  project_scope     TEXT NOT NULL DEFAULT 'local',
  agent_used        TEXT,
  skill_used        TEXT,
  workflow_used     TEXT,
  input_ref         TEXT,
  status            TEXT NOT NULL,
  error_kind        TEXT,
  started_at        TEXT NOT NULL,
  ended_at          TEXT
);

CREATE TABLE IF NOT EXISTS hermes_run_artifacts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id            TEXT NOT NULL,
  artifact_type     TEXT NOT NULL,
  artifact_ref      TEXT NOT NULL,
  content_hash      TEXT,
  provenance_kind   TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES hermes_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hermes_evaluations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id            TEXT NOT NULL,
  correctness       TEXT NOT NULL,
  quality           TEXT NOT NULL,
  reproducibility   TEXT NOT NULL,
  regression_risk   TEXT NOT NULL,
  reuse_potential   TEXT NOT NULL,
  confidence        TEXT NOT NULL,
  evaluated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES hermes_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hermes_candidates (
  candidate_id      TEXT PRIMARY KEY,
  source_run_id     TEXT NOT NULL,
  candidate_type    TEXT NOT NULL,
  proposed_target   TEXT,
  rationale         TEXT,
  confidence        TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at       TEXT,
  FOREIGN KEY (source_run_id) REFERENCES hermes_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hermes_candidate_evidence (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id      TEXT NOT NULL,
  evidence_kind     TEXT NOT NULL,
  evidence_ref      TEXT NOT NULL,
  linked_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (candidate_id) REFERENCES hermes_candidates(candidate_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hermes_runs_status ON hermes_runs(status);
CREATE INDEX IF NOT EXISTS idx_hermes_evaluations_run_id ON hermes_evaluations(run_id);
CREATE INDEX IF NOT EXISTS idx_hermes_candidates_status ON hermes_candidates(status);
CREATE INDEX IF NOT EXISTS idx_hermes_candidates_type ON hermes_candidates(candidate_type);
CREATE INDEX IF NOT EXISTS idx_hermes_candidate_evidence_candidate_id ON hermes_candidate_evidence(candidate_id);
```

- [ ] **Step 2: Add a note to `knowledge-schema.sql` pointing to Hermes schema**

Append this comment block to `templates/generic/.bbg/scripts/knowledge-schema.sql`:

```sql
-- Hermes runtime, evaluation, and candidate records live in `hermes-schema.sql`.
-- Keep that schema separate from canonical knowledge and trust metadata so
-- operational learning records can evolve without overloading wiki/trust tables.
```

- [ ] **Step 3: Extend the knowledge README for Hermes responsibilities**

Append this section to `templates/generic/.bbg/knowledge/README.md`:

```md
## Hermes Runtime Responsibilities

Hermes runtime metadata complements the canonical knowledge database by recording:

- execution runs
- run artifacts
- structured evaluations
- candidate objects
- candidate evidence links

These records are the raw learning substrate for later distillation and promotion
workflows. They do not replace trusted wiki pages or promotion decisions.
```

- [ ] **Step 4: Review scope of the schema files**

Check that:

- `knowledge-schema.sql` still owns canonical knowledge and trust metadata
- `hermes-schema.sql` owns runtime, evaluation, artifact, and candidate records
- no cross-project aggregation tables were added
- no automatic skill-promotion tables were added

- [ ] **Step 5: Commit the schema and README guidance**

```bash
git add templates/generic/.bbg/scripts/hermes-schema.sql templates/generic/.bbg/scripts/knowledge-schema.sql templates/generic/.bbg/knowledge/README.md
git commit -m "feat: add Hermes runtime data schema"
```

---

## Task 3: Add Hermes commands, skills, and process documentation

**Files:**

- Create: `commands/hermes-log.md`
- Create: `commands/hermes-candidates.md`
- Create: `skills/hermes-runtime/SKILL.md`
- Create: `skills/hermes-evaluation/SKILL.md`
- Create: `templates/generic/docs/wiki/processes/hermes-runtime.md`
- Test: `tests/unit/templates/governance.crossref.test.ts`

- [ ] **Step 1: Create `commands/hermes-log.md`**

Write this file:

```md
# /hermes-log

## Description

Inspect recent Hermes runtime and evaluation records so teams can understand how local learning inputs are being captured before distillation and promotion.

## Focus

- recent runs
- recent evaluations
- linked artifacts
- unresolved failed runs worth reviewing

## Related

- [Hermes Runtime Skill](../skills/hermes-runtime/SKILL.md)
- [Hermes Candidates Command](./hermes-candidates.md)
```

- [ ] **Step 2: Create `commands/hermes-candidates.md`**

Write this file:

```md
# /hermes-candidates

## Description

Review local Hermes candidate objects before they are refined into canonical project knowledge or promoted into higher-scope assets.

## Focus

- pending candidates
- candidate evidence links
- low-confidence candidates
- rejected or superseded candidate history

## Related

- [Hermes Evaluation Skill](../skills/hermes-evaluation/SKILL.md)
- [Hermes Log Command](./hermes-log.md)
- [Wiki Promote Command](./wiki-promote.md)
```

- [ ] **Step 3: Create `skills/hermes-runtime/SKILL.md`**

Write this file:

```md
---
name: hermes-runtime
category: hermes
description: Use when inspecting or reasoning about local Hermes execution records, artifacts, and run history.
---

# Hermes Runtime

## Workflow

1. Review recent Hermes run records
2. Inspect linked artifacts for important runs
3. Separate successful, failed, and review-worthy runs
4. Surface runs that likely deserve evaluation or follow-up

## Rules

- Treat Hermes runtime records as operational memory, not canonical knowledge
- Prefer linking artifacts and run records over copying raw command output into wiki pages
- Escalate to evaluation before proposing candidate promotion

## Related

- [Hermes Log Command](../../commands/hermes-log.md)
- [Hermes Evaluation Skill](../hermes-evaluation/SKILL.md)
```

- [ ] **Step 4: Create `skills/hermes-evaluation/SKILL.md`**

Write this file:

```md
---
name: hermes-evaluation
category: hermes
description: Use when scoring Hermes runs for correctness, quality, reproducibility, and candidate-worthiness.
---

# Hermes Evaluation

## Workflow

1. Review the run record and linked artifacts
2. Score correctness, quality, reproducibility, regression risk, and reuse potential
3. Decide whether the run should produce a candidate object
4. Record the evaluation outcome and rationale

## Rules

- Do not create a candidate from a run that lacks enough evidence to evaluate
- Distinguish local usefulness from higher-scope reusability
- Prefer explicit rationale over implicit scoring assumptions

## Related

- [Hermes Candidates Command](../../commands/hermes-candidates.md)
- [Hermes Runtime Skill](../hermes-runtime/SKILL.md)
```

- [ ] **Step 5: Create `templates/generic/docs/wiki/processes/hermes-runtime.md`**

Write this file:

```md
---
title: Hermes Runtime
type: process
status: active
sources:
  - .bbg/scripts/hermes-schema.sql
last_updated: 2026-04-07
tags:
  - hermes
  - runtime
  - evaluation
related:
  - docs/wiki/processes/knowledge-trust-model.md
---

# Hermes Runtime

## Run Capture

Hermes records task execution, agent usage, workflow usage, and linked artifacts as structured runtime memory.

## Evaluation

Runs can be scored for correctness, quality, reproducibility, regression risk, and reuse potential before they become candidate knowledge.

## Candidate Formation

High-value or repeated runs may produce candidate objects that can later be refined into canonical local knowledge.
```

- [ ] **Step 6: Run cross-reference validation**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the Hermes commands and skills**

```bash
git add commands/hermes-log.md commands/hermes-candidates.md skills/hermes-runtime/SKILL.md skills/hermes-evaluation/SKILL.md templates/generic/docs/wiki/processes/hermes-runtime.md
git commit -m "feat: add Hermes runtime and evaluation workflows"
```

---

## Task 4: Register K6 Hermes assets in the governance manifest

**Files:**

- Modify: `src/templates/governance.ts`
- Test: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Add failing governance expectations first**

In `tests/unit/templates/governance.test.ts`, add these assertions in the minimal-config test:

```ts
expect(destinations).toContain("commands/hermes-log.md");
expect(destinations).toContain("commands/hermes-candidates.md");
expect(destinations).toContain("skills/hermes-runtime/SKILL.md");
expect(destinations).toContain("skills/hermes-evaluation/SKILL.md");
expect(destinations).toContain("docs/wiki/processes/hermes-runtime.md");
expect(destinations).toContain(".bbg/scripts/hermes-schema.sql");
```

Update totals by `+6` in each scenario:

```ts
expect(tasks).toHaveLength(179);
expect(tasks).toHaveLength(194);
expect(tasks).toHaveLength(214);
expect(tasks).toHaveLength(199);
```

- [ ] **Step 2: Run the governance test to verify it fails**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: FAIL because K6 Hermes assets are not registered yet.

- [ ] **Step 3: Add manifest constants in `src/templates/governance.ts`**

Add these constants near the other command/skill/script groupings:

```ts
const HERMES_SKILLS = ["hermes-runtime", "hermes-evaluation"];

const HERMES_COMMANDS = ["hermes-log", "hermes-candidates"];

const HERMES_DOC_FILES = ["docs/wiki/processes/hermes-runtime.md"];

const HERMES_SCRIPTS = ["hermes-schema.sql"];
```

- [ ] **Step 4: Register the K6 assets in the manifest build loops**

Update the command and skill loops like this:

```ts
  for (const skill of [
    ...CORE_SKILLS,
    ...OPERATIONS_SKILLS,
    ...WIKI_SKILLS,
    ...WIKI_COMPILATION_SKILLS,
    ...WIKI_TRUST_SKILLS,
    ...HERMES_SKILLS,
  ]) {
```

```ts
  for (const cmd of [
    ...CORE_COMMANDS,
    ...WIKI_COMMANDS,
    ...WIKI_COMPILATION_COMMANDS,
    ...WIKI_TRUST_COMMANDS,
    ...HERMES_COMMANDS,
  ]) {
```

Add copy loops for docs and scripts:

```ts
for (const script of HERMES_SCRIPTS) {
  tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
}

for (const wikiFile of HERMES_DOC_FILES) {
  tasks.push(copyTask(`generic/${wikiFile}`, wikiFile));
}
```

- [ ] **Step 5: Export the new categories in `GOVERNANCE_MANIFEST`**

Add these entries:

```ts
  hermesSkills: HERMES_SKILLS,
  hermesCommands: HERMES_COMMANDS,
  hermesDocFiles: HERMES_DOC_FILES,
  hermesScripts: HERMES_SCRIPTS,
```

- [ ] **Step 6: Run the governance test to verify it passes**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the manifest registration**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register Hermes runtime governance assets"
```

---

## Task 5: Extend self-check coverage for K6 Hermes assets

**Files:**

- Modify: `src/doctor/self-checks.ts`
- Modify: `tests/unit/doctor/self-checks.test.ts`

- [ ] **Step 1: Add a failing self-check test first**

Extend `createMinimalGovernance()` in `tests/unit/doctor/self-checks.test.ts` with these writes:

```ts
await writeTextFile(join(root, "skills", "hermes-runtime", "SKILL.md"), "# Hermes Runtime\n\n## Related\n");
await writeTextFile(join(root, "skills", "hermes-evaluation", "SKILL.md"), "# Hermes Evaluation\n\n## Related\n");
await writeTextFile(join(root, "commands", "hermes-log.md"), "# /hermes-log\n\n## Related\n");
await writeTextFile(join(root, "commands", "hermes-candidates.md"), "# /hermes-candidates\n\n## Related\n");
await writeTextFile(join(root, "docs", "wiki", "processes", "hermes-runtime.md"), "# Hermes Runtime\n");
await writeTextFile(
  join(root, ".bbg", "scripts", "hermes-schema.sql"),
  "CREATE TABLE IF NOT EXISTS hermes_runs (run_id TEXT PRIMARY KEY);\n",
);
```

Then add this test:

```ts
it("detects missing Hermes runtime assets", async () => {
  const root = await makeTempDir();

  const result = await runSelfChecks(root);

  expect(result.checks.find((c) => c.id === "self-hermes-skills-exist")?.passed).toBe(false);
  expect(result.checks.find((c) => c.id === "self-hermes-commands-exist")?.passed).toBe(false);
  expect(result.checks.find((c) => c.id === "self-hermes-docs-exist")?.passed).toBe(false);
  expect(result.checks.find((c) => c.id === "self-hermes-scripts-exist")?.passed).toBe(false);
});
```

- [ ] **Step 2: Run the self-check test to verify it fails**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts -t "detects missing Hermes runtime assets"`

Expected: FAIL because these self-check IDs do not exist yet.

- [ ] **Step 3: Add Hermes assets to orphan detection in `src/doctor/self-checks.ts`**

Add these loops inside `checkNoOrphanFiles()`:

```ts
for (const skill of GOVERNANCE_MANIFEST.hermesSkills) {
  allManifestPaths.add(`skills/${skill}/SKILL.md`);
}
for (const cmd of GOVERNANCE_MANIFEST.hermesCommands) {
  allManifestPaths.add(`commands/${cmd}.md`);
}
for (const file of GOVERNANCE_MANIFEST.hermesDocFiles) {
  allManifestPaths.add(file);
}
for (const script of GOVERNANCE_MANIFEST.hermesScripts) {
  allManifestPaths.add(`.bbg/scripts/${script}`);
}
```

- [ ] **Step 4: Add dedicated Hermes self-checks in `runSelfChecks()`**

Add these blocks:

```ts
checks.push(
  await checkFilesExist(
    packageRoot,
    "self-hermes-skills-exist",
    "Hermes skill",
    GOVERNANCE_MANIFEST.hermesSkills.map((skill) => `skills/${skill}/SKILL.md`),
  ),
);

checks.push(
  await checkFilesExist(
    packageRoot,
    "self-hermes-commands-exist",
    "Hermes command",
    GOVERNANCE_MANIFEST.hermesCommands.map((cmd) => `commands/${cmd}.md`),
  ),
);

checks.push(
  await checkFilesExist(packageRoot, "self-hermes-docs-exist", "Hermes doc", GOVERNANCE_MANIFEST.hermesDocFiles),
);

checks.push(
  await checkFilesExist(
    packageRoot,
    "self-hermes-scripts-exist",
    "Hermes script",
    GOVERNANCE_MANIFEST.hermesScripts.map((script) => `.bbg/scripts/${script}`),
  ),
);
```

- [ ] **Step 5: Add pass-path assertions to the existing fixture-based self-check test**

Inside the `passes when all expected agent files exist` test, add:

```ts
const hermesSkillsCheck = result.checks.find((c) => c.id === "self-hermes-skills-exist");
const hermesCommandsCheck = result.checks.find((c) => c.id === "self-hermes-commands-exist");
const hermesDocsCheck = result.checks.find((c) => c.id === "self-hermes-docs-exist");
const hermesScriptsCheck = result.checks.find((c) => c.id === "self-hermes-scripts-exist");

expect(hermesSkillsCheck).toBeDefined();
expect(hermesSkillsCheck!.passed).toBe(true);
expect(hermesCommandsCheck).toBeDefined();
expect(hermesCommandsCheck!.passed).toBe(true);
expect(hermesDocsCheck).toBeDefined();
expect(hermesDocsCheck!.passed).toBe(true);
expect(hermesScriptsCheck).toBeDefined();
expect(hermesScriptsCheck!.passed).toBe(true);
```

- [ ] **Step 6: Run the self-check suite to verify it passes**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the self-check support**

```bash
git add src/doctor/self-checks.ts tests/unit/doctor/self-checks.test.ts
git commit -m "test: add self-check coverage for Hermes runtime assets"
```

---

## Task 6: Final K6 verification

**Files:**

- Modify if needed: any K6-touched file required to resolve verification issues

- [ ] **Step 1: Run targeted suites**

Run: `npx vitest run tests/unit/config/read-write.test.ts tests/unit/templates/governance.test.ts tests/unit/templates/governance.crossref.test.ts tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Run full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit any final verification fixes if needed**

```bash
git add .
git commit -m "test: verify Hermes runtime integration"
```

Only create this commit if verification required follow-up edits beyond the earlier K6 commits.

---

## K6 Scope Guardrails

Do **not** include any of the following in K6:

- cross-project aggregation tables
- automatic skill promotion
- global registry publishing
- memory routing heuristics beyond minimum local queryability scaffolding
- vector search or embeddings
- autonomous self-editing loops

K6 is complete once local Hermes runtime, evaluation, artifact, and candidate data models exist as governed assets, are configurable and path-safe, and are fully integrated into manifest, self-check, and test coverage.
