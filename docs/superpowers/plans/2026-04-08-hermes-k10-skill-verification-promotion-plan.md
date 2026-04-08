# Hermes K10 Skill Verification and Promotion Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a governed K10 verification and promotion layer that can verify intake/draft candidates and produce promotion decisions for BBG-global assets with explicit evidence trails.

**Architecture:** K10 builds on K9 intake records by introducing verification runs and promotion decision records in schema plus governance workflows for reviewable promotion outcomes. Promotion remains evidence-first and policy-gated: K10 can mark candidates verified/promotable and record decision artifacts, but does not introduce K11 meta-learning or opaque autonomous self-editing.

**Tech Stack:** TypeScript, Vitest, SQLite schema templates, Markdown governance assets, existing Hermes K6-K9 scaffolding

---

## File Structure

### New files

- `commands/hermes-verify.md` — command contract for verifying intake candidates with explicit scoring/evidence checks
- `commands/hermes-promote.md` — command contract for recording promotion decisions for verified candidates
- `skills/hermes-verification/SKILL.md` — workflow for verification criteria, evidence checks, and confidence gating
- `skills/hermes-promotion/SKILL.md` — workflow for promotion decision recording and global asset handoff boundaries
- `templates/generic/docs/wiki/processes/hermes-verification-promotion.md` — process doc for K10 verify→promote lifecycle

### Modified files

- `templates/generic/.bbg/scripts/hermes-schema.sql` — add K10 verification and promotion tables linked to intake candidates
- `templates/generic/.bbg/knowledge/README.md` — document K10 verification/promotion boundaries and K11 separation
- `commands/hermes-intake-review.md` — handoff from intake review into K10 verification
- `commands/hermes-query.md` — clarify verified/promoted records are separate from local routing layer until explicitly published
- `skills/hermes-intake/SKILL.md` — add K10 handoff boundary
- `skills/hermes-memory-router/SKILL.md` — maintain canonical routing boundary despite promotion records
- `templates/generic/docs/wiki/processes/hermes-intake.md` — handoff step to K10 verification
- `templates/generic/docs/wiki/processes/hermes-memory-routing.md` — clarify K10 records do not bypass canonical routing order
- `src/templates/governance.ts` — register K10 commands/skills/process doc
- `src/doctor/self-checks.ts` — keep manifest-driven Hermes checks (change only if needed)
- `tests/unit/templates/governance.test.ts` — assert K10 asset registration and updated totals
- `tests/unit/templates/governance.crossref.test.ts` — validate related links for K10 assets
- `tests/unit/doctor/self-checks.test.ts` — add missing-path checks for K10 assets
- `tests/unit/templates/hermes-assets.test.ts` — lock K10 verification/promotion schema and boundary semantics

### Existing files to inspect while implementing

- `docs/superpowers/specs/2026-04-07-hermes-completion-design.md` — K10 scope and K11 separation
- `templates/generic/.bbg/scripts/hermes-schema.sql` — current K9 intake structures
- `commands/hermes-intake.md` and `commands/hermes-intake-review.md` — K9 handoff context
- `skills/hermes-intake/SKILL.md` — intake workflow boundaries
- `templates/generic/docs/wiki/processes/hermes-intake.md` — K9 process baseline
- `templates/generic/docs/wiki/processes/knowledge-trust-model.md` — trust and promotion guardrail reference

---

## Task 1: Add K10 verification/promotion schema tables

**Files:**

- Modify: `templates/generic/.bbg/scripts/hermes-schema.sql`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write failing K10 schema test first**

Append this test to `tests/unit/templates/hermes-assets.test.ts`:

```ts
it("adds K10 verification and promotion schema without introducing meta-learning automation", async () => {
  const schema = await readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8");
  const normalized = schema.replace(/\s+/g, " ").toLowerCase();

  expect(normalized).toContain("create table if not exists hermes_verification_runs");
  expect(normalized).toContain("create table if not exists hermes_verification_results");
  expect(normalized).toContain("create table if not exists hermes_promotion_decisions");
  expect(normalized).toContain(
    "decision_status text not null check (decision_status in ('approved', 'rejected', 'deferred'))",
  );
  expect(normalized).not.toContain("auto_promote");
  expect(normalized).not.toContain("meta_learning_score");
});
```

- [ ] **Step 2: Run focused K10 schema test to verify RED**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "adds K10 verification and promotion schema without introducing meta-learning automation"`

Expected: FAIL because K10 tables are not yet present.

- [ ] **Step 3: Add K10 schema tables**

Append to `templates/generic/.bbg/scripts/hermes-schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS hermes_verification_runs (
  verification_run_id TEXT PRIMARY KEY,
  intake_run_id       TEXT NOT NULL,
  started_at          TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at         TEXT,
  verifier_kind       TEXT NOT NULL CHECK (verifier_kind IN ('rule-based', 'human-reviewed', 'hybrid')),
  FOREIGN KEY (intake_run_id) REFERENCES hermes_candidate_intake_runs(intake_run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hermes_verification_results (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  verification_run_id TEXT NOT NULL,
  intake_candidate_id TEXT NOT NULL,
  correctness         TEXT NOT NULL CHECK (correctness IN ('fail', 'partial', 'pass')),
  reproducibility     TEXT NOT NULL CHECK (reproducibility IN ('low', 'medium', 'high')),
  reuse_potential     TEXT NOT NULL CHECK (reuse_potential IN ('low', 'medium', 'high')),
  confidence          TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  verification_note   TEXT,
  verified_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (verification_run_id, intake_candidate_id),
  FOREIGN KEY (verification_run_id) REFERENCES hermes_verification_runs(verification_run_id) ON DELETE CASCADE,
  FOREIGN KEY (intake_candidate_id) REFERENCES hermes_intake_candidates(intake_candidate_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hermes_promotion_decisions (
  promotion_decision_id TEXT PRIMARY KEY,
  intake_candidate_id   TEXT NOT NULL,
  verification_run_id   TEXT NOT NULL,
  decision_status       TEXT NOT NULL CHECK (decision_status IN ('approved', 'rejected', 'deferred')),
  target_scope          TEXT NOT NULL CHECK (target_scope IN ('bbg-global-skill', 'bbg-global-rule', 'bbg-global-workflow')),
  target_ref            TEXT,
  decision_rationale    TEXT,
  decided_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (intake_candidate_id) REFERENCES hermes_intake_candidates(intake_candidate_id) ON DELETE CASCADE,
  FOREIGN KEY (verification_run_id) REFERENCES hermes_verification_runs(verification_run_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hermes_verification_runs_intake_run_id ON hermes_verification_runs(intake_run_id);
CREATE INDEX IF NOT EXISTS idx_hermes_verification_results_verification_run_id ON hermes_verification_results(verification_run_id);
CREATE INDEX IF NOT EXISTS idx_hermes_verification_results_intake_candidate_id ON hermes_verification_results(intake_candidate_id);
CREATE INDEX IF NOT EXISTS idx_hermes_promotion_decisions_intake_candidate_id ON hermes_promotion_decisions(intake_candidate_id);
CREATE INDEX IF NOT EXISTS idx_hermes_promotion_decisions_verification_run_id ON hermes_promotion_decisions(verification_run_id);
CREATE INDEX IF NOT EXISTS idx_hermes_promotion_decisions_status ON hermes_promotion_decisions(decision_status);
```

- [ ] **Step 4: Run focused schema test to verify GREEN**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "adds K10 verification and promotion schema without introducing meta-learning automation"`

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add templates/generic/.bbg/scripts/hermes-schema.sql tests/unit/templates/hermes-assets.test.ts
git commit -m "feat: add Hermes verification and promotion schema"
```

---

## Task 2: Add K10 verification/promotion commands, skills, and process docs

**Files:**

- Create: `commands/hermes-verify.md`
- Create: `commands/hermes-promote.md`
- Create: `skills/hermes-verification/SKILL.md`
- Create: `skills/hermes-promotion/SKILL.md`
- Create: `templates/generic/docs/wiki/processes/hermes-verification-promotion.md`
- Modify: `commands/hermes-intake-review.md`
- Modify: `commands/hermes-query.md`
- Modify: `skills/hermes-intake/SKILL.md`
- Modify: `skills/hermes-memory-router/SKILL.md`
- Modify: `templates/generic/docs/wiki/processes/hermes-intake.md`
- Modify: `templates/generic/docs/wiki/processes/hermes-memory-routing.md`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Add failing K10 content test first**

Append test:

```ts
it("documents K10 verification and promotion as evidence-gated and K11-separate", async () => {
  const [verifyCmd, promoteCmd, verifySkill, promoteSkill, processDoc, intakeReviewCmd] = await Promise.all([
    readFile(join(packageRoot, "commands/hermes-verify.md"), "utf8"),
    readFile(join(packageRoot, "commands/hermes-promote.md"), "utf8"),
    readFile(join(packageRoot, "skills/hermes-verification/SKILL.md"), "utf8"),
    readFile(join(packageRoot, "skills/hermes-promotion/SKILL.md"), "utf8"),
    readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-verification-promotion.md"), "utf8"),
    readFile(join(packageRoot, "commands/hermes-intake-review.md"), "utf8"),
  ]);
  const normalizedProcess = processDoc.replace(/\s+/g, " ").toLowerCase();

  expect(verifyCmd).toContain("verify intake candidates with explicit evidence checks");
  expect(promoteCmd).toContain("record promotion decisions for verified candidates");
  expect(verifySkill).toContain("verification must be evidence-gated");
  expect(promoteSkill).toContain("promotion decisions must reference verification results");
  expect(normalizedProcess).toContain("k10 verifies candidates before promotion decisions");
  expect(normalizedProcess).toContain("k11 meta-learning remains out of scope");
  expect(intakeReviewCmd).toContain("handoff verified candidates to /hermes-verify");
});
```

- [ ] **Step 2: Run focused K10 content test and verify RED**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K10 verification and promotion as evidence-gated and K11-separate"`

Expected: FAIL.

- [ ] **Step 3: Create new K10 assets with planned content**

Create `commands/hermes-verify.md` with:

```md
# /hermes-verify

## Description

Verify intake candidates with explicit evidence checks before any promotion decision is recorded.

## Usage
```

/hermes-verify --run <intake_run_id>
/hermes-verify --candidate <intake_candidate_id>

```

## Rules

- Verification must be evidence-gated
- Verification results are required before promotion decisions
- K10 does not introduce meta-learning optimization

## Related

- [Hermes Intake Review Command](./hermes-intake-review.md)
- [Hermes Promote Command](./hermes-promote.md)
- [Hermes Verification Skill](../skills/hermes-verification/SKILL.md)
```

Create `commands/hermes-promote.md` with:

```md
# /hermes-promote

## Description

Record promotion decisions for verified candidates into BBG-global target scopes.

## Usage
```

/hermes-promote --candidate <intake_candidate_id> --status approved --target bbg-global-skill
/hermes-promote --candidate <intake_candidate_id> --status rejected

```

## Rules

- Promotion decisions must reference verification results
- K10 records promotion decisions; it does not auto-edit global assets
- Deferred decisions remain reviewable for later passes

## Related

- [Hermes Verify Command](./hermes-verify.md)
- [Hermes Promotion Skill](../skills/hermes-promotion/SKILL.md)
```

Create `skills/hermes-verification/SKILL.md` with:

```md
---
name: hermes-verification
category: hermes
description: Use when verifying intake candidates with explicit evidence criteria before promotion.
---

# Hermes Verification

## Rules

- Verification must be evidence-gated
- Record correctness, reproducibility, reuse potential, and confidence
- Verification output must be reviewable and auditable
```

Create `skills/hermes-promotion/SKILL.md` with:

```md
---
name: hermes-promotion
category: hermes
description: Use when recording promotion decisions for verified intake candidates.
---

# Hermes Promotion

## Rules

- Promotion decisions must reference verification results
- Approved/rejected/deferred outcomes must include rationale
- K10 promotion records do not include K11 meta-learning
```

Create `templates/generic/docs/wiki/processes/hermes-verification-promotion.md` with:

```md
---
title: Hermes Verification and Promotion
type: process
status: active
sources:
  - .bbg/scripts/hermes-schema.sql
last_updated: 2026-04-08
tags:
  - hermes
  - verification
  - promotion
related:
  - docs/wiki/processes/hermes-intake.md
  - docs/wiki/processes/knowledge-trust-model.md
---

# Hermes Verification and Promotion

## Scope

K10 verifies candidates before promotion decisions.

## Guardrails

- Verification is evidence-gated and auditable.
- Promotion decisions are recorded, not auto-applied.
- K11 meta-learning remains out of scope.
```

- [ ] **Step 4: Update K9/K8 handoff docs**

In `commands/hermes-intake-review.md`, append:

```md
Handoff verified candidates to /hermes-verify for K10 verification workflows.
```

In `commands/hermes-query.md`, append rules bullet:

```md
- Verification/promotion records do not bypass canonical local routing layers
```

In `skills/hermes-intake/SKILL.md`, append rule:

```md
- Verification and promotion decisions are deferred to K10 workflows
```

In `skills/hermes-memory-router/SKILL.md`, append rule:

```md
- K10 verification/promotion records are not canonical routing layers by default
```

In `templates/generic/docs/wiki/processes/hermes-intake.md`, append guardrail:

```md
- Verified candidate handoff begins in K10, not K9 intake.
```

In `templates/generic/docs/wiki/processes/hermes-memory-routing.md`, append guardrail:

```md
- Verification/promotion records do not override canonical-first local routing.
```

- [ ] **Step 5: Run focused K10 content + crossref tests**

Run:

```bash
npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K10 verification and promotion as evidence-gated and K11-separate"
npx vitest run tests/unit/templates/governance.crossref.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add commands/hermes-verify.md commands/hermes-promote.md commands/hermes-intake-review.md commands/hermes-query.md skills/hermes-verification/SKILL.md skills/hermes-promotion/SKILL.md skills/hermes-intake/SKILL.md skills/hermes-memory-router/SKILL.md templates/generic/docs/wiki/processes/hermes-verification-promotion.md templates/generic/docs/wiki/processes/hermes-intake.md templates/generic/docs/wiki/processes/hermes-memory-routing.md tests/unit/templates/hermes-assets.test.ts
git commit -m "feat: add Hermes verification and promotion workflows"
```

---

## Task 3: Register K10 assets in governance manifest

**Files:**

- Modify: `src/templates/governance.ts`
- Modify: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Add failing assertions first**

Add destination assertions:

```ts
expect(destinations).toContain("commands/hermes-verify.md");
expect(destinations).toContain("commands/hermes-promote.md");
expect(destinations).toContain("skills/hermes-verification/SKILL.md");
expect(destinations).toContain("skills/hermes-promotion/SKILL.md");
expect(destinations).toContain("docs/wiki/processes/hermes-verification-promotion.md");
```

Update totals by `+5` from post-K9 counts.

- [ ] **Step 2: Run governance test and verify RED**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: FAIL.

- [ ] **Step 3: Update manifest arrays**

In `src/templates/governance.ts` add:

```ts
// HERMES_SKILLS
"hermes-verification",
"hermes-promotion",

// HERMES_COMMANDS
"hermes-verify",
"hermes-promote",

// HERMES_DOC_FILES
"docs/wiki/processes/hermes-verification-promotion.md",
```

- [ ] **Step 4: Run governance test and verify GREEN**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register Hermes verification and promotion assets"
```

---

## Task 4: Extend self-check coverage for K10 assets

**Files:**

- Modify: `tests/unit/doctor/self-checks.test.ts`
- Modify: `src/doctor/self-checks.ts` only if needed

- [ ] **Step 1: Add missing-path tests first**

Add tests:

```ts
commands/hermes-verify.md -> self-hermes-commands-exist
commands/hermes-promote.md -> self-hermes-commands-exist
skills/hermes-verification/SKILL.md -> self-hermes-skills-exist
skills/hermes-promotion/SKILL.md -> self-hermes-skills-exist
docs/wiki/processes/hermes-verification-promotion.md -> self-hermes-docs-exist
```

Assertions: `result.ok === false`, `check.passed === false`, message includes missing path.

- [ ] **Step 2: Run self-check suite**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: PASS after manifest updates.

- [ ] **Step 3: Keep manifest-driven self-check behavior**

No new self-check IDs.

- [ ] **Step 4: Commit Task 4**

```bash
git add tests/unit/doctor/self-checks.test.ts src/doctor/self-checks.ts
git commit -m "test: cover Hermes verification and promotion governance assets"
```

---

## Task 5: Document K10 boundaries in knowledge README

**Files:**

- Modify: `templates/generic/.bbg/knowledge/README.md`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Add failing README boundary test first**

Add:

```ts
it("documents K10 verification/promotion boundaries in knowledge README", async () => {
  const readme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
  const normalized = readme.replace(/\s+/g, " ").toLowerCase();

  expect(normalized).toContain("k10 verifies candidates before promotion decisions");
  expect(normalized).toContain("promotion decisions remain evidence-gated and auditable");
  expect(normalized).toContain("k11 meta-learning remains out of scope in k10");
});
```

- [ ] **Step 2: Run focused README test and verify RED**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K10 verification/promotion boundaries in knowledge README"`

Expected: FAIL.

- [ ] **Step 3: Update README with K10 paragraph**

Append:

```md
In K10, Hermes verifies candidates before promotion decisions. Promotion decisions remain evidence-gated and auditable, and K11 meta-learning remains out of scope in K10.
```

- [ ] **Step 4: Run focused README test and verify GREEN**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K10 verification/promotion boundaries in knowledge README"`

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```bash
git add templates/generic/.bbg/knowledge/README.md tests/unit/templates/hermes-assets.test.ts
git commit -m "docs: clarify Hermes verification and promotion boundaries"
```

---

## Task 6: Final K10 verification

**Files:**

- Modify if needed: any K10-touched file for verification fixes

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
git commit -m "test: verify Hermes verification and promotion integration"
```

Only if verification finds issues beyond Tasks 1-5.

---

## K10 Scope Guardrails

Do **not** include in K10:

- K11 meta-learning logic or scoring loops
- opaque auto-promotion without evidence trails
- automatic editing of global assets without review boundaries
- embeddings/ranking/vector retrieval additions

K10 is complete once verification and promotion decision records are structurally captured, governed, and test-verified with explicit evidence boundaries, while keeping K11 out of scope.
