# Hermes K7A Local Distillation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first local Hermes distillation phase so generated projects can turn evaluated Hermes candidates into governed local wiki/process drafts without attempting global promotion or memory routing.

**Architecture:** Extend the existing K6 Hermes runtime schema and knowledge-layer governance assets rather than inventing a separate pipeline. K7A adds local-only draft lifecycle fields, draft-oriented commands and skills, and process documentation that connects Hermes candidates to wiki/process refinement while keeping canonical wiki promotion as a distinct review step.

**Tech Stack:** TypeScript, Vitest, SQLite schema templates, Markdown governance assets, existing knowledge-layer and Hermes scaffolding

---

## File Structure

### New files

- `commands/hermes-distill.md` — command for selecting evaluated Hermes candidates and preparing local draft outputs
- `commands/hermes-refine.md` — command for reviewing local draft wiki/process outputs before canonical promotion
- `skills/hermes-distillation/SKILL.md` — workflow for turning Hermes candidates into local draft knowledge
- `templates/generic/docs/wiki/processes/hermes-distillation.md` — process page describing the local distillation pipeline

### Modified files

- `templates/generic/.bbg/scripts/hermes-schema.sql` — extend candidate records with K7A local-distillation fields only
- `templates/generic/.bbg/knowledge/README.md` — document local draft responsibilities and the canonical-review boundary
- `commands/hermes-candidates.md` — point candidate review toward local draft generation instead of only inspection
- `skills/hermes-runtime/SKILL.md` — route suitable candidates toward distillation
- `skills/hermes-evaluation/SKILL.md` — clarify that evaluation feeds local draft creation, not direct promotion
- `src/templates/governance.ts` — register K7A commands, skill, and process doc
- `src/doctor/self-checks.ts` — include K7A assets in existence checks and orphan detection
- `tests/unit/templates/governance.test.ts` — assert K7A governance assets and updated totals
- `tests/unit/templates/governance.crossref.test.ts` — validate related-link coverage for new assets
- `tests/unit/doctor/self-checks.test.ts` — cover K7A self-check IDs
- `tests/unit/templates/hermes-assets.test.ts` — lock K7A local-only draft semantics into the template assets

### Existing files to inspect while implementing

- `docs/superpowers/specs/2026-04-07-hermes-completion-design.md` — approved Hermes architecture and K7/K8/K9 ordering
- `docs/superpowers/plans/2026-04-07-hermes-k6-runtime-eval-candidate-model.md` — K6 implementation pattern to mirror
- `templates/generic/.bbg/scripts/knowledge-schema.sql` — existing knowledge candidate update schema to align with, not replace
- `templates/generic/docs/wiki/processes/knowledge-compilation.md` — canonical wiki/process update workflow reference
- `templates/generic/docs/wiki/processes/knowledge-trust-model.md` — trust and promotion boundary reference
- `commands/wiki-promote.md` — canonical promotion remains a separate step after K7A local drafts
- `skills/wiki-distillation/SKILL.md` — style and governance boundary for wiki promotion workflows

---

## Task 1: Extend Hermes candidate schema for local draft distillation

**Files:**

- Modify: `templates/generic/.bbg/scripts/hermes-schema.sql`
- Test: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write the failing schema test for K7A local draft fields**

Add this test block to `tests/unit/templates/hermes-assets.test.ts`:

```ts
it("keeps Hermes distillation local-only and draft-oriented for K7A", async () => {
  const schema = await readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8");

  expect(schema).toContain("draft_kind       TEXT CHECK (draft_kind IN ('wiki', 'process'))");
  expect(schema).toContain("draft_path       TEXT");
  expect(schema).toContain("distilled_at     TEXT");
  expect(schema).toContain("CHECK (status IN ('pending', 'distilled', 'local_only', 'rejected', 'superseded'))");
  expect(schema).not.toContain("org_level");
  expect(schema).not.toContain("global_bbg");
});
```

- [ ] **Step 2: Run the new schema test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "keeps Hermes distillation local-only and draft-oriented for K7A"`

Expected: FAIL because `hermes_candidates` does not yet include draft fields or the `distilled` local lifecycle state.

- [ ] **Step 3: Extend `hermes_candidates` with K7A local draft fields**

Update the `CREATE TABLE IF NOT EXISTS hermes_candidates` block in `templates/generic/.bbg/scripts/hermes-schema.sql` to this form:

```sql
CREATE TABLE IF NOT EXISTS hermes_candidates (
  candidate_id      TEXT PRIMARY KEY,
  source_run_id     TEXT NOT NULL,
  candidate_type    TEXT NOT NULL CHECK (candidate_type IN ('wiki', 'skill', 'rule', 'workflow', 'eval', 'memory')),
  proposed_target   TEXT,
  draft_kind        TEXT CHECK (draft_kind IN ('wiki', 'process')),
  draft_path        TEXT,
  rationale         TEXT,
  confidence        TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'distilled', 'local_only', 'rejected', 'superseded')),
  distilled_at      TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at       TEXT,
  FOREIGN KEY (source_run_id) REFERENCES hermes_runs(run_id) ON DELETE CASCADE
);
```

- [ ] **Step 4: Run the schema test to verify it passes**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "keeps Hermes distillation local-only and draft-oriented for K7A"`

Expected: PASS.

- [ ] **Step 5: Commit the schema change**

```bash
git add templates/generic/.bbg/scripts/hermes-schema.sql tests/unit/templates/hermes-assets.test.ts
git commit -m "feat: add Hermes local distillation candidate fields"
```

---

## Task 2: Add K7A Hermes commands, skill, and process documentation

**Files:**

- Create: `commands/hermes-distill.md`
- Create: `commands/hermes-refine.md`
- Create: `skills/hermes-distillation/SKILL.md`
- Create: `templates/generic/docs/wiki/processes/hermes-distillation.md`
- Modify: `commands/hermes-candidates.md`
- Modify: `skills/hermes-runtime/SKILL.md`
- Modify: `skills/hermes-evaluation/SKILL.md`
- Test: `tests/unit/templates/governance.crossref.test.ts`
- Test: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write the failing asset-content test first**

Append this test to `tests/unit/templates/hermes-assets.test.ts`:

```ts
it("documents K7A distillation as local draft creation before canonical promotion", async () => {
  const [distillCommand, refineCommand, distillationSkill, distillationProcess, candidatesCommand] = await Promise.all([
    readFile(join(packageRoot, "commands/hermes-distill.md"), "utf8"),
    readFile(join(packageRoot, "commands/hermes-refine.md"), "utf8"),
    readFile(join(packageRoot, "skills/hermes-distillation/SKILL.md"), "utf8"),
    readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-distillation.md"), "utf8"),
    readFile(join(packageRoot, "commands/hermes-candidates.md"), "utf8"),
  ]);

  expect(distillCommand).toContain("distilled into local wiki or process drafts");
  expect(refineCommand).toContain("before canonical wiki promotion");
  expect(distillationSkill).toContain("Create local draft outputs, not canonical edits");
  expect(distillationProcess).toContain("Canonical wiki promotion remains a separate review step");
  expect(candidatesCommand).toContain("distill strong local candidates into draft wiki/process outputs");
});
```

- [ ] **Step 2: Run the focused asset-content test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K7A distillation as local draft creation before canonical promotion"`

Expected: FAIL because the new K7A governance assets do not exist yet.

- [ ] **Step 3: Create `commands/hermes-distill.md`**

Create `commands/hermes-distill.md` with this content:

```md
# /hermes-distill

## Description

Select evaluated Hermes candidates that are ready to be distilled into local wiki or process drafts.

## Usage
```

/hermes-distill
/hermes-distill --candidate <candidate_id>
/hermes-distill --type wiki
/hermes-distill --status pending

```

## Process

1. Review evaluated Hermes candidates with enough evidence to refine locally.
2. Choose whether the draft belongs in a wiki page or process page.
3. Prepare the local draft path and rationale before changing any canonical page.
4. Mark the candidate as distilled only after the draft output is linked.

## Focus

- evaluated local candidates
- wiki draft targets
- process draft targets
- evidence-backed local distillation

## Related

- [Hermes Candidates Command](./hermes-candidates.md)
- [Hermes Refine Command](./hermes-refine.md)
- [Hermes Distillation Skill](../skills/hermes-distillation/SKILL.md)
```

- [ ] **Step 4: Create `commands/hermes-refine.md`**

Create `commands/hermes-refine.md` with this content:

```md
# /hermes-refine

## Description

Review local Hermes wiki/process drafts before canonical wiki promotion or local-only retention.

## Usage
```

/hermes-refine
/hermes-refine --candidate <candidate_id>
/hermes-refine --draft <draft_path>

```

## Process

1. Review the local draft and its linked Hermes evidence.
2. Check whether the draft is stable enough to keep, revise, reject, or hand off for canonical promotion.
3. Keep canonical wiki promotion separate from this local refinement step.
4. Record the review outcome in the candidate lifecycle.

## Focus

- local draft quality
- evidence alignment
- keep-local vs reject decisions
- pre-promotion review

## Related

- [Hermes Distill Command](./hermes-distill.md)
- [Wiki Promote Command](./wiki-promote.md)
- [Hermes Distillation Skill](../skills/hermes-distillation/SKILL.md)
```

- [ ] **Step 5: Create `skills/hermes-distillation/SKILL.md`**

Create `skills/hermes-distillation/SKILL.md` with this content:

```md
---
name: hermes-distillation
category: hermes
description: Use when converting evaluated Hermes candidates into local wiki or process drafts.
---

# Hermes Distillation

## Workflow

1. Select a local Hermes candidate with completed evaluation and usable evidence
2. Choose a local draft target in wiki or process space
3. Create or update the draft output without editing canonical pages directly
4. Link the draft back to the candidate and mark the candidate distilled
5. Hand off to refinement or wiki promotion when the draft is ready

## Rules

- Create local draft outputs, not canonical edits
- Distill only candidates with explicit evidence and rationale
- Prefer wiki/process drafts in K7A; do not generate global assets here
- Keep promotion decisions separate from draft creation

## Related

- [Hermes Distill Command](../../commands/hermes-distill.md)
- [Hermes Refine Command](../../commands/hermes-refine.md)
- [Wiki Distillation Skill](../wiki-distillation/SKILL.md)
```

- [ ] **Step 6: Create `templates/generic/docs/wiki/processes/hermes-distillation.md`**

Create `templates/generic/docs/wiki/processes/hermes-distillation.md` with this content:

```md
---
title: Hermes Distillation
type: process
status: active
sources:
  - .bbg/scripts/hermes-schema.sql
last_updated: 2026-04-07
tags:
  - hermes
  - distillation
  - local-learning
related:
  - docs/wiki/processes/hermes-runtime.md
  - docs/wiki/processes/knowledge-compilation.md
---

# Hermes Distillation

## Inputs

- Hermes candidates with completed evaluation
- linked run artifacts and candidate evidence
- proposed local wiki or process targets

## Distillation Steps

1. Select an evaluated local candidate with enough evidence to refine.
2. Choose a local wiki or process draft destination.
3. Create or update the draft output while preserving links back to the candidate evidence.
4. Mark the candidate distilled once the draft output exists and is reviewable.
5. Send the draft through local refinement before any canonical wiki promotion.

## Guardrails

- Distillation creates local drafts, not final canonical pages.
- Canonical wiki promotion remains a separate review step.
- K7A covers wiki/process drafts only.
- Cross-project promotion is out of scope.
```

- [ ] **Step 7: Update `commands/hermes-candidates.md` for distillation handoff**

Replace the description/process tail in `commands/hermes-candidates.md` so it reads:

```md
## Description

Review local Hermes candidate objects before they are distilled into draft wiki/process outputs or resolved as local-only, rejected, or superseded.
```

And replace step 5 in `## Process` with:

```md
5. **Prepare local distillation** - Distill strong local candidates into draft wiki/process outputs before any canonical promotion review.
```

- [ ] **Step 8: Update `skills/hermes-runtime/SKILL.md` and `skills/hermes-evaluation/SKILL.md`**

Add this rule to `skills/hermes-runtime/SKILL.md` under `## Rules`:

```md
- Route evaluated, evidence-backed candidates toward local distillation rather than direct promotion
```

Add this rule to `skills/hermes-evaluation/SKILL.md` under `## Rules`:

```md
- Successful local candidates should feed draft distillation before canonical promotion review
```

- [ ] **Step 9: Run the focused asset-content test to verify it passes**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K7A distillation as local draft creation before canonical promotion"`

Expected: PASS.

- [ ] **Step 10: Run cross-reference validation**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`

Expected: PASS.

- [ ] **Step 11: Commit the K7A governance docs and skills**

```bash
git add commands/hermes-distill.md commands/hermes-refine.md commands/hermes-candidates.md skills/hermes-distillation/SKILL.md skills/hermes-runtime/SKILL.md skills/hermes-evaluation/SKILL.md templates/generic/docs/wiki/processes/hermes-distillation.md tests/unit/templates/hermes-assets.test.ts
git commit -m "feat: add Hermes local distillation workflows"
```

---

## Task 3: Register K7A distillation assets in the governance manifest

**Files:**

- Modify: `src/templates/governance.ts`
- Test: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Add failing governance expectations first**

In the minimal-config test in `tests/unit/templates/governance.test.ts`, add these assertions:

```ts
expect(destinations).toContain("commands/hermes-distill.md");
expect(destinations).toContain("commands/hermes-refine.md");
expect(destinations).toContain("skills/hermes-distillation/SKILL.md");
expect(destinations).toContain("docs/wiki/processes/hermes-distillation.md");
```

Update the task totals by `+4` in every scenario already counting Hermes K6 assets:

```ts
expect(tasks).toHaveLength(183);
expect(tasks).toHaveLength(198);
expect(tasks).toHaveLength(218);
expect(tasks).toHaveLength(203);
```

- [ ] **Step 2: Run the governance test to verify it fails**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: FAIL because K7A distillation assets are not registered yet.

- [ ] **Step 3: Extend the Hermes asset groups in `src/templates/governance.ts`**

Change the Hermes constants to these values:

```ts
const HERMES_SKILLS = ["hermes-runtime", "hermes-evaluation", "hermes-distillation"];

const HERMES_COMMANDS = ["hermes-log", "hermes-candidates", "hermes-distill", "hermes-refine"];

const HERMES_DOC_FILES = ["docs/wiki/processes/hermes-runtime.md", "docs/wiki/processes/hermes-distillation.md"];
```

No new script group is needed in this task beyond the schema field changes from Task 1.

- [ ] **Step 4: Run the governance test to verify it passes**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the manifest registration**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register Hermes distillation governance assets"
```

---

## Task 4: Extend self-check coverage for K7A distillation assets

**Files:**

- Modify: `src/doctor/self-checks.ts`
- Modify: `tests/unit/doctor/self-checks.test.ts`

- [ ] **Step 1: Add failing self-check assertions first**

In `tests/unit/doctor/self-checks.test.ts`, extend the passing fixture expectations with:

```ts
expect(getCheck(result, "self-hermes-skills-exist").message).not.toContain("missing");
expect(getCheck(result, "self-hermes-commands-exist").message).not.toContain("missing");
expect(getCheck(result, "self-hermes-docs-exist").message).not.toContain("missing");
```

Then add these targeted tests:

```ts
it("fails the Hermes command check for a missing K7A distillation command", async () => {
  const root = await makeTempDir();
  await createMinimalGovernance(root);

  const missingPath = "commands/hermes-distill.md";
  await rm(join(root, missingPath));

  const result = await runSelfChecks(root);
  const check = getCheck(result, "self-hermes-commands-exist");

  expect(result.ok).toBe(false);
  expect(check.passed).toBe(false);
  expect(check.message).toContain(missingPath);
});

it("fails the Hermes skill check for a missing K7A distillation skill", async () => {
  const root = await makeTempDir();
  await createMinimalGovernance(root);

  const missingPath = "skills/hermes-distillation/SKILL.md";
  await rm(join(root, missingPath));

  const result = await runSelfChecks(root);
  const check = getCheck(result, "self-hermes-skills-exist");

  expect(result.ok).toBe(false);
  expect(check.passed).toBe(false);
  expect(check.message).toContain(missingPath);
});

it("fails the Hermes doc check for a missing K7A distillation process doc", async () => {
  const root = await makeTempDir();
  await createMinimalGovernance(root);

  const missingPath = "docs/wiki/processes/hermes-distillation.md";
  await rm(join(root, missingPath));

  const result = await runSelfChecks(root);
  const check = getCheck(result, "self-hermes-docs-exist");

  expect(result.ok).toBe(false);
  expect(check.passed).toBe(false);
  expect(check.message).toContain(missingPath);
});
```

- [ ] **Step 2: Run the self-check suite to verify it fails**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: FAIL because the manifest fixture and Hermes asset groups do not yet include the K7A files.

- [ ] **Step 3: Update Hermes asset coverage in `src/doctor/self-checks.ts`**

No new self-check IDs are needed. Keep using:

```ts
"self-hermes-skills-exist";
"self-hermes-commands-exist";
"self-hermes-docs-exist";
```

The implementation change should be limited to whatever the new `GOVERNANCE_MANIFEST.hermes*` groups include after Task 3. Do not add separate K7A-specific check IDs.

- [ ] **Step 4: Update the passing fixture expectations in `tests/unit/doctor/self-checks.test.ts`**

Inside `createMinimalGovernance(root)`, do not hardcode the new files individually. Continue relying on the manifest-driven `requiredPaths` array so the fixture automatically picks up:

```ts
commands / hermes - distill.md;
commands / hermes - refine.md;
skills / hermes - distillation / SKILL.md;
docs / wiki / processes / hermes - distillation.md;
```

Keep the fixture generic and only expand the targeted missing-path tests.

- [ ] **Step 5: Run the self-check suite to verify it passes**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the self-check coverage**

```bash
git add src/doctor/self-checks.ts tests/unit/doctor/self-checks.test.ts
git commit -m "test: cover Hermes distillation governance assets"
```

---

## Task 5: Document K7A boundaries in knowledge metadata guidance

**Files:**

- Modify: `templates/generic/.bbg/knowledge/README.md`
- Test: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write the failing README-boundary test first**

Append this test to `tests/unit/templates/hermes-assets.test.ts`:

```ts
it("documents K7A as local draft distillation before canonical wiki promotion", async () => {
  const knowledgeReadme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
  const normalized = knowledgeReadme.replace(/\s+/g, " ");

  expect(normalized).toContain("local wiki or process drafts");
  expect(normalized).toContain("canonical wiki promotion remains a separate review step");
  expect(normalized).not.toContain("automatic global promotion");
});
```

- [ ] **Step 2: Run the README-boundary test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K7A as local draft distillation before canonical wiki promotion"`

Expected: FAIL because the README does not yet explain K7A local draft semantics.

- [ ] **Step 3: Extend the Hermes section in `templates/generic/.bbg/knowledge/README.md`**

Append this paragraph to the end of the `## Hermes Runtime Responsibilities` section:

```md
In K7A, Hermes candidates may be distilled into local wiki or process drafts that remain reviewable project-local artifacts. Canonical wiki promotion remains a separate review step, so draft distillation should not bypass trust and maintenance workflows.
```

- [ ] **Step 4: Run the README-boundary test to verify it passes**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K7A as local draft distillation before canonical wiki promotion"`

Expected: PASS.

- [ ] **Step 5: Commit the README guidance**

```bash
git add templates/generic/.bbg/knowledge/README.md tests/unit/templates/hermes-assets.test.ts
git commit -m "docs: clarify Hermes local distillation boundaries"
```

---

## Task 6: Final K7A verification

**Files:**

- Modify if needed: any K7A-touched file required to resolve verification issues

- [ ] **Step 1: Run the targeted K7A suites**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts tests/unit/templates/governance.test.ts tests/unit/templates/governance.crossref.test.ts tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit any final verification fixes if needed**

```bash
git add .
git commit -m "test: verify Hermes local distillation integration"
```

Only create this commit if verification requires follow-up edits beyond the earlier K7A commits.

---

## K7A Scope Guardrails

Do **not** include any of the following in K7A:

- automatic canonical wiki edits from Hermes candidates
- local skill or rule generation
- local memory routing or retrieval precedence logic
- org-level or BBG-global promotion states
- cross-project candidate aggregation
- embeddings, vector retrieval, or ranking heuristics

K7A is complete once evaluated Hermes candidates can be governed as local wiki/process draft outputs, the draft boundary is clearly separated from canonical promotion, and the resulting governance assets are integrated into manifest, self-check, and test coverage.
