# Hermes K9 Cross-Project Candidate Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first central-Hermes intake layer so BBG can collect and normalize candidate objects from multiple projects without promoting them globally.

**Architecture:** K9 introduces a central intake ledger and governance workflows that ingest project-local candidate snapshots as reviewable records. It extends the Hermes schema/docs/commands/skills/manifest coverage, but stops before K10 verification/promotion decisions. K9 remains evidence-first and non-promotional: intake records are normalized and queryable, not automatically elevated to global skills/rules.

**Tech Stack:** TypeScript, Vitest, SQLite schema templates, Markdown governance assets, existing Hermes K6/K7/K8 scaffolding

---

## File Structure

### New files

- `commands/hermes-intake.md` — command contract for importing candidate snapshots from multiple projects
- `commands/hermes-intake-review.md` — command contract for reviewing normalized intake records and conflicts
- `skills/hermes-intake/SKILL.md` — workflow for project-to-central candidate intake and normalization
- `templates/generic/docs/wiki/processes/hermes-intake.md` — process doc for K9 cross-project intake lifecycle

### Modified files

- `templates/generic/.bbg/scripts/hermes-schema.sql` — add K9 intake tables for source projects, intake runs, and normalized candidate rows
- `templates/generic/.bbg/knowledge/README.md` — document K9 intake boundaries (collect/normalize only, no promotion)
- `commands/hermes-candidates.md` — clarify that local candidates can be prepared for central intake
- `commands/hermes-query.md` — clarify intake records are not canonical memory in K9
- `skills/hermes-memory-router/SKILL.md` — keep canonical-over-candidate and intake-as-noncanonical boundary explicit
- `templates/generic/docs/wiki/processes/hermes-memory-routing.md` — note that intake records are separate from local routing layers
- `src/templates/governance.ts` — register K9 commands/skill/process doc
- `src/doctor/self-checks.ts` — rely on expanded manifest groups for K9 assets (change only if needed)
- `tests/unit/templates/governance.test.ts` — assert K9 asset registration and updated totals
- `tests/unit/templates/governance.crossref.test.ts` — ensure new command/skill/process links resolve
- `tests/unit/doctor/self-checks.test.ts` — add K9 missing-path checks under existing Hermes check IDs
- `tests/unit/templates/hermes-assets.test.ts` — lock K9 intake schema + non-promotion boundaries

### Existing files to inspect while implementing

- `docs/superpowers/specs/2026-04-07-hermes-completion-design.md` — K9 objective and K10 separation
- `templates/generic/.bbg/scripts/hermes-schema.sql` — existing local Hermes schema to extend
- `commands/hermes-candidates.md` — local candidate review handoff pattern
- `commands/hermes-query.md` — local routing boundary that must not be replaced by intake records
- `skills/hermes-memory-router/SKILL.md` — canonical-over-candidate rules that must remain unchanged
- `templates/generic/docs/wiki/processes/hermes-memory-routing.md` — retrieval order guardrails

---

## Task 1: Add K9 cross-project intake schema tables

**Files:**

- Modify: `templates/generic/.bbg/scripts/hermes-schema.sql`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write the failing K9 schema test first**

Append this test to `tests/unit/templates/hermes-assets.test.ts`:

```ts
it("adds K9 intake schema without introducing promotion states", async () => {
  const schema = await readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8");
  const normalized = schema.replace(/\s+/g, " ").toLowerCase();

  expect(normalized).toContain("create table if not exists hermes_source_projects");
  expect(normalized).toContain("create table if not exists hermes_candidate_intake_runs");
  expect(normalized).toContain("create table if not exists hermes_intake_candidates");
  expect(normalized).toContain(
    "normalized_status text not null check (normalized_status in ('pending_review', 'duplicate', 'conflict', 'accepted_local_only', 'rejected'))",
  );
  expect(normalized).not.toContain("promoted_global");
  expect(normalized).not.toContain("verified_global");
});
```

- [ ] **Step 2: Run focused schema test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "adds K9 intake schema without introducing promotion states"`

Expected: FAIL because K9 intake tables do not exist yet.

- [ ] **Step 3: Add K9 intake tables to `hermes-schema.sql`**

Append these table/index definitions near existing Hermes candidate tables:

```sql
CREATE TABLE IF NOT EXISTS hermes_source_projects (
  source_project_id  TEXT PRIMARY KEY,
  source_project_ref TEXT NOT NULL,
  source_kind        TEXT NOT NULL CHECK (source_kind IN ('bbg-local', 'bbg-remote')),
  first_seen_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hermes_candidate_intake_runs (
  intake_run_id      TEXT PRIMARY KEY,
  source_project_id  TEXT NOT NULL,
  imported_at        TEXT NOT NULL DEFAULT (datetime('now')),
  imported_count     INTEGER NOT NULL DEFAULT 0,
  rejected_count     INTEGER NOT NULL DEFAULT 0,
  conflict_count     INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (source_project_id) REFERENCES hermes_source_projects(source_project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hermes_intake_candidates (
  intake_candidate_id TEXT PRIMARY KEY,
  intake_run_id       TEXT NOT NULL,
  source_candidate_id TEXT NOT NULL,
  source_run_id       TEXT,
  candidate_type      TEXT NOT NULL CHECK (candidate_type IN ('wiki', 'skill', 'rule', 'workflow', 'eval', 'memory')),
  draft_kind          TEXT CHECK (draft_kind IN ('wiki', 'process', 'skill', 'rule')),
  normalized_hash     TEXT NOT NULL,
  normalized_status   TEXT NOT NULL CHECK (normalized_status IN ('pending_review', 'duplicate', 'conflict', 'accepted_local_only', 'rejected')),
  conflict_reason     TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (intake_run_id) REFERENCES hermes_candidate_intake_runs(intake_run_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hermes_candidate_intake_runs_source_project_id ON hermes_candidate_intake_runs(source_project_id);
CREATE INDEX IF NOT EXISTS idx_hermes_intake_candidates_intake_run_id ON hermes_intake_candidates(intake_run_id);
CREATE INDEX IF NOT EXISTS idx_hermes_intake_candidates_normalized_status ON hermes_intake_candidates(normalized_status);
CREATE INDEX IF NOT EXISTS idx_hermes_intake_candidates_normalized_hash ON hermes_intake_candidates(normalized_hash);
```

- [ ] **Step 4: Run focused schema test to verify it passes**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "adds K9 intake schema without introducing promotion states"`

Expected: PASS.

- [ ] **Step 5: Commit Task 1 changes**

```bash
git add templates/generic/.bbg/scripts/hermes-schema.sql tests/unit/templates/hermes-assets.test.ts
git commit -m "feat: add Hermes cross-project intake schema"
```

---

## Task 2: Add K9 intake commands, skill, and process docs

**Files:**

- Create: `commands/hermes-intake.md`
- Create: `commands/hermes-intake-review.md`
- Create: `skills/hermes-intake/SKILL.md`
- Create: `templates/generic/docs/wiki/processes/hermes-intake.md`
- Modify: `commands/hermes-candidates.md`
- Modify: `commands/hermes-query.md`
- Modify: `skills/hermes-memory-router/SKILL.md`
- Modify: `templates/generic/docs/wiki/processes/hermes-memory-routing.md`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write failing K9 content test first**

Append this test to `tests/unit/templates/hermes-assets.test.ts`:

```ts
it("documents K9 intake as collect-and-normalize without global promotion", async () => {
  const [intakeCmd, intakeReviewCmd, intakeSkill, intakeProcess, queryCmd] = await Promise.all([
    readFile(join(packageRoot, "commands/hermes-intake.md"), "utf8"),
    readFile(join(packageRoot, "commands/hermes-intake-review.md"), "utf8"),
    readFile(join(packageRoot, "skills/hermes-intake/SKILL.md"), "utf8"),
    readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-intake.md"), "utf8"),
    readFile(join(packageRoot, "commands/hermes-query.md"), "utf8"),
  ]);
  const normalizedProcess = intakeProcess.replace(/\s+/g, " ").toLowerCase();
  const normalizedQuery = queryCmd.replace(/\s+/g, " ").toLowerCase();

  expect(intakeCmd).toContain("collect and normalize candidate objects from multiple projects");
  expect(intakeReviewCmd).toContain("review normalized intake candidates for duplicates and conflicts");
  expect(intakeSkill).toContain("intake records remain non-canonical until K10 verification");
  expect(normalizedProcess).toContain("k9 collects and normalizes cross-project candidates");
  expect(normalizedProcess).toContain("global promotion is out of scope in k9");
  expect(normalizedQuery).toContain("intake records are not a canonical memory layer");
});
```

- [ ] **Step 2: Run focused K9 content test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K9 intake as collect-and-normalize without global promotion"`

Expected: FAIL because K9 assets do not exist yet.

- [ ] **Step 3: Create `commands/hermes-intake.md`**

Create with this content:

```md
# /hermes-intake

## Description

Collect and normalize candidate objects from multiple projects into central Hermes intake records.

## Usage
```

/hermes-intake --source <project_ref>
/hermes-intake --source <project_ref> --limit 100
/hermes-intake --source <project_ref> --dry-run

```

## Process

1. Select source projects that expose candidate snapshots.
2. Import candidate objects into intake runs.
3. Normalize candidate identity/hash fields for cross-project comparison.
4. Mark duplicates/conflicts for review without promoting any record.

## Rules

- Intake is collect-and-normalize only
- Imported candidates remain non-canonical in K9
- Promotion decisions are deferred to K10

## Related

- [Hermes Intake Review Command](./hermes-intake-review.md)
- [Hermes Candidates Command](./hermes-candidates.md)
- [Hermes Intake Skill](../skills/hermes-intake/SKILL.md)
```

- [ ] **Step 4: Create `commands/hermes-intake-review.md`**

Create with this content:

```md
# /hermes-intake-review

## Description

Review normalized intake candidates for duplicates and conflicts before any verification/promotion step.

## Usage
```

/hermes-intake-review
/hermes-intake-review --status conflict
/hermes-intake-review --status pending_review

```

## Process

1. Inspect intake candidates grouped by normalized hash.
2. Review duplicate/conflict decisions and evidence links.
3. Keep accepted records in reviewable intake state.
4. Hand off verified promotion candidates to K10 workflows later.

## Rules

- K9 review does not promote globally
- Conflict resolution must preserve provenance
- Verification/promotion remains out of scope for this command

## Related

- [Hermes Intake Command](./hermes-intake.md)
- [Hermes Intake Skill](../skills/hermes-intake/SKILL.md)
```

- [ ] **Step 5: Create `skills/hermes-intake/SKILL.md`**

Create with this content:

```md
---
name: hermes-intake
category: hermes
description: Use when collecting and normalizing candidate objects across projects.
---

# Hermes Intake

## Workflow

1. Select source projects and import candidate snapshots
2. Normalize imported candidates by stable hash and type
3. Flag duplicates/conflicts for review
4. Keep intake records reviewable and non-canonical

## Rules

- Intake records remain non-canonical until K10 verification
- Do not auto-promote intake records in K9
- Preserve source project and candidate provenance

## Related

- [Hermes Intake Command](../../commands/hermes-intake.md)
- [Hermes Intake Review Command](../../commands/hermes-intake-review.md)
- [Hermes Memory Router Skill](../hermes-memory-router/SKILL.md)
```

- [ ] **Step 6: Create `templates/generic/docs/wiki/processes/hermes-intake.md`**

Create with this content:

```md
---
title: Hermes Intake
type: process
status: active
sources:
  - .bbg/scripts/hermes-schema.sql
last_updated: 2026-04-08
tags:
  - hermes
  - intake
  - cross-project
related:
  - docs/wiki/processes/hermes-memory-routing.md
  - docs/wiki/processes/knowledge-trust-model.md
---

# Hermes Intake

## Scope

K9 collects and normalizes cross-project candidates.

## Intake Steps

1. Import candidate snapshots from source projects.
2. Normalize records into intake candidates using stable hashes.
3. Mark duplicates/conflicts for review.
4. Keep intake records non-canonical pending K10 verification.

## Guardrails

- Global promotion is out of scope in K9.
- Intake records are reviewable, not canonical memory.
- Verification/promotion workflows start in K10.
```

- [ ] **Step 7: Update existing K8/K7 docs for K9 boundaries**

In `commands/hermes-candidates.md`, add a focus bullet:

```md
- cross-project intake readiness for strong local candidates
```

In `commands/hermes-query.md`, append under Rules:

```md
- Intake records are not a canonical memory layer in K9
```

In `skills/hermes-memory-router/SKILL.md`, append under Rules:

```md
- Cross-project intake records remain outside canonical routing until verified in later phases
```

In `templates/generic/docs/wiki/processes/hermes-memory-routing.md`, append under Guardrails:

```md
- K9 intake records are not a canonical routing layer until later-phase verification.
```

- [ ] **Step 8: Run focused K9 content test + crossref test**

Run:

```bash
npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K9 intake as collect-and-normalize without global promotion"
npx vitest run tests/unit/templates/governance.crossref.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 2 changes**

```bash
git add commands/hermes-intake.md commands/hermes-intake-review.md commands/hermes-candidates.md commands/hermes-query.md skills/hermes-intake/SKILL.md skills/hermes-memory-router/SKILL.md templates/generic/docs/wiki/processes/hermes-intake.md templates/generic/docs/wiki/processes/hermes-memory-routing.md tests/unit/templates/hermes-assets.test.ts
git commit -m "feat: add Hermes cross-project intake workflows"
```

---

## Task 3: Register K9 assets in governance manifest

**Files:**

- Modify: `src/templates/governance.ts`
- Modify: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Add failing governance assertions first**

Add destination assertions:

```ts
expect(destinations).toContain("commands/hermes-intake.md");
expect(destinations).toContain("commands/hermes-intake-review.md");
expect(destinations).toContain("skills/hermes-intake/SKILL.md");
expect(destinations).toContain("docs/wiki/processes/hermes-intake.md");
```

Update totals by `+4` from post-K7B counts.

- [ ] **Step 2: Run governance test to verify it fails**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: FAIL until manifest is updated.

- [ ] **Step 3: Update Hermes manifest arrays**

In `src/templates/governance.ts`, add:

```ts
// HERMES_SKILLS add
"hermes-intake";

// HERMES_COMMANDS add
"hermes-intake";
"hermes-intake-review";

// HERMES_DOC_FILES add
"docs/wiki/processes/hermes-intake.md";
```

- [ ] **Step 4: Run governance test to verify pass**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 3 changes**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register Hermes intake governance assets"
```

---

## Task 4: Extend self-check coverage for K9 intake assets

**Files:**

- Modify: `tests/unit/doctor/self-checks.test.ts`
- Modify: `src/doctor/self-checks.ts` only if required

- [ ] **Step 1: Add missing-path tests first**

Add tests:

```ts
commands/hermes-intake.md -> self-hermes-commands-exist
commands/hermes-intake-review.md -> self-hermes-commands-exist
skills/hermes-intake/SKILL.md -> self-hermes-skills-exist
docs/wiki/processes/hermes-intake.md -> self-hermes-docs-exist
```

Assertions: `result.ok === false`, `check.passed === false`, message includes missing path.

- [ ] **Step 2: Run self-check suite**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: PASS after manifest registration; may already pass if manifest-driven setup captures it.

- [ ] **Step 3: Keep manifest-driven approach**

No new self-check IDs.

- [ ] **Step 4: Commit Task 4 changes**

```bash
git add tests/unit/doctor/self-checks.test.ts src/doctor/self-checks.ts
git commit -m "test: cover Hermes intake governance assets"
```

---

## Task 5: Document K9 boundaries in knowledge README

**Files:**

- Modify: `templates/generic/.bbg/knowledge/README.md`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Add failing README boundary test first**

Add:

```ts
it("documents K9 intake boundaries in knowledge README", async () => {
  const readme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
  const normalized = readme.replace(/\s+/g, " ").toLowerCase();

  expect(normalized).toContain("k9 collects and normalizes cross-project candidates");
  expect(normalized).toContain("intake records remain non-canonical until k10 verification");
  expect(normalized).toContain("global promotion remains out of scope in k9");
});
```

- [ ] **Step 2: Run focused README test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K9 intake boundaries in knowledge README"`

Expected: FAIL until README is updated.

- [ ] **Step 3: Update README with K9 paragraph**

Append under Hermes responsibilities:

```md
In K9, Hermes collects and normalizes cross-project candidates into intake records. Intake records remain non-canonical until K10 verification, and global promotion remains out of scope in K9.
```

- [ ] **Step 4: Run focused README test to verify pass**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K9 intake boundaries in knowledge README"`

Expected: PASS.

- [ ] **Step 5: Commit Task 5 changes**

```bash
git add templates/generic/.bbg/knowledge/README.md tests/unit/templates/hermes-assets.test.ts
git commit -m "docs: clarify Hermes intake boundaries"
```

---

## Task 6: Final K9 verification

**Files:**

- Modify if needed: any K9-touched files for verification fixes

- [ ] **Step 1: Run targeted suites**

Run:

```bash
npx vitest run tests/unit/templates/hermes-assets.test.ts tests/unit/templates/governance.test.ts tests/unit/templates/governance.crossref.test.ts tests/unit/doctor/self-checks.test.ts
```

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

- [ ] **Step 5: Commit verification-only fixes if needed**

```bash
git add .
git commit -m "test: verify Hermes intake integration"
```

Only if verification reveals follow-up fixes beyond Tasks 1-5.

---

## K9 Scope Guardrails

Do **not** include in K9:

- global verification/promotion engine logic (K10)
- meta-learning optimization loops (K11)
- automatic global skill/rule/template writes
- embeddings/ranking/vector retrieval

K9 is complete once cross-project candidate intake is structurally captured, normalized, governed, and test-verified as non-canonical input for later K10 verification.
