# Hermes K7B Local Skill/Rule Draft Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend local Hermes distillation so evaluated candidates can produce local skill/rule draft outputs (in addition to wiki/process drafts) while keeping canonical promotion separate.

**Architecture:** K7B extends the existing K7A candidate/distillation scaffold by widening draft target kinds and documenting a draft-only generation workflow for local skills/rules. The implementation remains declarative in governance assets and schema constraints: candidate objects can point to skill/rule draft outputs, but no automatic promotion to canonical/global assets is introduced.

**Tech Stack:** TypeScript, Vitest, SQLite schema templates, Markdown governance assets, existing Hermes K7A/K8 commands and skills

---

## File Structure

### New files

- `commands/hermes-draft-skill.md` — command contract for creating and reviewing local skill drafts from evaluated Hermes candidates
- `commands/hermes-draft-rule.md` — command contract for creating and reviewing local rule drafts from evaluated Hermes candidates
- `skills/hermes-skill-drafting/SKILL.md` — workflow for local skill draft generation and review handoff
- `skills/hermes-rule-drafting/SKILL.md` — workflow for local rule draft generation and review handoff
- `templates/generic/docs/wiki/processes/hermes-skill-rule-drafting.md` — process doc for K7B skill/rule draft lifecycle

### Modified files

- `templates/generic/.bbg/scripts/hermes-schema.sql` — extend `draft_kind` values to include `skill` and `rule` for K7B
- `templates/generic/.bbg/knowledge/README.md` — document K7B local skill/rule draft boundaries and non-promotion guardrail
- `commands/hermes-distill.md` — include skill/rule draft target path in local distillation handoff
- `commands/hermes-candidates.md` — clarify K7B candidate scope includes skill/rule draft readiness
- `skills/hermes-distillation/SKILL.md` — route qualified candidates toward skill/rule draft workflows in K7B
- `templates/generic/docs/wiki/processes/hermes-distillation.md` — update K7 boundary language to include K7B skill/rule drafts
- `src/templates/governance.ts` — register K7B commands/skills/process doc
- `src/doctor/self-checks.ts` — rely on manifest-driven Hermes groups for K7B assets (change only if needed)
- `tests/unit/templates/governance.test.ts` — assert K7B governance assets and updated totals
- `tests/unit/templates/governance.crossref.test.ts` — ensure related links for new K7B assets resolve
- `tests/unit/doctor/self-checks.test.ts` — add missing-path coverage for K7B router assets under existing Hermes check IDs
- `tests/unit/templates/hermes-assets.test.ts` — lock K7B draft-kind and boundary semantics

### Existing files to inspect while implementing

- `docs/superpowers/specs/2026-04-07-hermes-completion-design.md` — K7 target includes local skill/rule draft refinement
- `docs/superpowers/plans/2026-04-07-hermes-k7a-local-distillation-plan.md` — K7A baseline to extend
- `docs/superpowers/plans/2026-04-08-hermes-k8-local-memory-router-plan.md` — K8 canonical-over-candidate routing constraints that must remain unchanged
- `commands/wiki-promote.md` — canonical promotion remains separate from draft generation
- `skills/wiki-distillation/SKILL.md` — canonical promotion/review boundary reference
- `templates/generic/docs/wiki/processes/knowledge-trust-model.md` — trust gate boundary for promotion decisions

---

## Task 1: Extend Hermes draft-kind schema for K7B skill/rule drafts

**Files:**

- Modify: `templates/generic/.bbg/scripts/hermes-schema.sql`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write the failing K7B draft-kind test first**

Append this test to `tests/unit/templates/hermes-assets.test.ts`:

```ts
it("extends K7 draft kinds to include local skill/rule drafts without changing local-only status", async () => {
  const schema = await readFile(join(packageRoot, "templates/generic/.bbg/scripts/hermes-schema.sql"), "utf8");
  const normalized = schema.replace(/\s+/g, " ").toLowerCase();

  expect(normalized).toContain("draft_kind text check (draft_kind in ('wiki', 'process', 'skill', 'rule'))");
  expect(normalized).toContain("status in ('pending', 'distilled', 'local_only', 'rejected', 'superseded')");
  expect(normalized).not.toContain("org_level");
  expect(normalized).not.toContain("global_bbg");
});
```

- [ ] **Step 2: Run the focused draft-kind test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "extends K7 draft kinds to include local skill/rule drafts without changing local-only status"`

Expected: FAIL because `draft_kind` currently supports only `wiki` and `process`.

- [ ] **Step 3: Update `draft_kind` constraint in schema**

In `templates/generic/.bbg/scripts/hermes-schema.sql`, change:

```sql
draft_kind       TEXT CHECK (draft_kind IN ('wiki', 'process')),
```

to:

```sql
draft_kind       TEXT CHECK (draft_kind IN ('wiki', 'process', 'skill', 'rule')),
```

Keep status local-only and unchanged.

- [ ] **Step 4: Run the focused draft-kind test to verify it passes**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "extends K7 draft kinds to include local skill/rule drafts without changing local-only status"`

Expected: PASS.

- [ ] **Step 5: Commit Task 1 changes**

```bash
git add templates/generic/.bbg/scripts/hermes-schema.sql tests/unit/templates/hermes-assets.test.ts
git commit -m "feat: extend Hermes draft kinds for skill and rule outputs"
```

---

## Task 2: Add K7B skill/rule draft commands, skills, and process documentation

**Files:**

- Create: `commands/hermes-draft-skill.md`
- Create: `commands/hermes-draft-rule.md`
- Create: `skills/hermes-skill-drafting/SKILL.md`
- Create: `skills/hermes-rule-drafting/SKILL.md`
- Create: `templates/generic/docs/wiki/processes/hermes-skill-rule-drafting.md`
- Modify: `commands/hermes-distill.md`
- Modify: `commands/hermes-candidates.md`
- Modify: `skills/hermes-distillation/SKILL.md`
- Modify: `templates/generic/docs/wiki/processes/hermes-distillation.md`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write the failing K7B asset-content test first**

Append this test to `tests/unit/templates/hermes-assets.test.ts`:

```ts
it("documents K7B local skill/rule draft generation boundaries", async () => {
  const [draftSkillCmd, draftRuleCmd, skillDraftingSkill, ruleDraftingSkill, draftingProcess, distillCmd] =
    await Promise.all([
      readFile(join(packageRoot, "commands/hermes-draft-skill.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-draft-rule.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-skill-drafting/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "skills/hermes-rule-drafting/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-skill-rule-drafting.md"), "utf8"),
      readFile(join(packageRoot, "commands/hermes-distill.md"), "utf8"),
    ]);
  const normalizedProcess = draftingProcess.replace(/\s+/g, " ").toLowerCase();

  expect(draftSkillCmd).toContain("local skill drafts");
  expect(draftRuleCmd).toContain("local rule drafts");
  expect(skillDraftingSkill).toContain("drafts remain non-canonical until separately promoted");
  expect(ruleDraftingSkill).toContain("drafts remain non-canonical until separately promoted");
  expect(normalizedProcess).toContain("k7b adds local skill/rule draft generation");
  expect(normalizedProcess).toContain("canonical promotion remains a separate review step");
  expect(distillCmd).toContain("skill/rule draft targets");
});
```

- [ ] **Step 2: Run the focused K7B asset-content test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K7B local skill/rule draft generation boundaries"`

Expected: FAIL because K7B assets do not exist yet.

- [ ] **Step 3: Create `commands/hermes-draft-skill.md`**

Create with this content:

```md
# /hermes-draft-skill

## Description

Generate and review local skill drafts from evaluated Hermes candidates with strong reuse potential.

## Usage
```

/hermes-draft-skill
/hermes-draft-skill --candidate <candidate_id>
/hermes-draft-skill --draft <skills/local/<name>/SKILL.md>

```

## Process

1. Select an evaluated candidate with reusable execution evidence.
2. Draft a local skill output without editing canonical/global skill assets directly.
3. Link the draft to candidate evidence and review rationale.
4. Keep the draft in local review state until separately promoted.

## Rules

- Generate local skill drafts only
- Do not auto-promote draft skills into canonical/global assets
- Require evidence links before review handoff

## Related

- [Hermes Distill Command](./hermes-distill.md)
- [Hermes Draft Rule Command](./hermes-draft-rule.md)
- [Hermes Skill Drafting Skill](../skills/hermes-skill-drafting/SKILL.md)
```

- [ ] **Step 4: Create `commands/hermes-draft-rule.md`**

Create with this content:

```md
# /hermes-draft-rule

## Description

Generate and review local rule drafts from evaluated Hermes candidates with recurring policy/process evidence.

## Usage
```

/hermes-draft-rule
/hermes-draft-rule --candidate <candidate_id>
/hermes-draft-rule --draft <rules/local/<name>.md>

```

## Process

1. Select an evaluated candidate that implies a durable rule boundary.
2. Draft a local rule output without editing canonical/global rule assets directly.
3. Link the draft to candidate evidence and review rationale.
4. Keep the draft in local review state until separately promoted.

## Rules

- Generate local rule drafts only
- Do not auto-promote draft rules into canonical/global assets
- Require evidence links before review handoff

## Related

- [Hermes Distill Command](./hermes-distill.md)
- [Hermes Draft Skill Command](./hermes-draft-skill.md)
- [Hermes Rule Drafting Skill](../skills/hermes-rule-drafting/SKILL.md)
```

- [ ] **Step 5: Create `skills/hermes-skill-drafting/SKILL.md`**

Create with this content:

```md
---
name: hermes-skill-drafting
category: hermes
description: Use when turning evaluated Hermes candidates into local skill drafts.
---

# Hermes Skill Drafting

## Workflow

1. Select a candidate with strong reuse potential
2. Draft a local skill from linked evidence and rationale
3. Keep draft scope local and reviewable
4. Hand off for separate promotion review

## Rules

- Drafts remain non-canonical until separately promoted
- Do not write global skill assets in K7B
- Preserve evidence links in the draft

## Related

- [Hermes Draft Skill Command](../../commands/hermes-draft-skill.md)
- [Hermes Distillation Skill](../hermes-distillation/SKILL.md)
```

- [ ] **Step 6: Create `skills/hermes-rule-drafting/SKILL.md`**

Create with this content:

```md
---
name: hermes-rule-drafting
category: hermes
description: Use when turning evaluated Hermes candidates into local rule drafts.
---

# Hermes Rule Drafting

## Workflow

1. Select a candidate with recurring rule-level evidence
2. Draft a local rule from linked evidence and rationale
3. Keep draft scope local and reviewable
4. Hand off for separate promotion review

## Rules

- Drafts remain non-canonical until separately promoted
- Do not write global rule assets in K7B
- Preserve evidence links in the draft

## Related

- [Hermes Draft Rule Command](../../commands/hermes-draft-rule.md)
- [Hermes Distillation Skill](../hermes-distillation/SKILL.md)
```

- [ ] **Step 7: Create `templates/generic/docs/wiki/processes/hermes-skill-rule-drafting.md`**

Create with this content:

```md
---
title: Hermes Skill and Rule Drafting
type: process
status: active
sources:
  - .bbg/scripts/hermes-schema.sql
last_updated: 2026-04-08
tags:
  - hermes
  - distillation
  - skill-drafts
  - rule-drafts
related:
  - docs/wiki/processes/hermes-distillation.md
  - docs/wiki/processes/knowledge-trust-model.md
---

# Hermes Skill and Rule Drafting

## Scope

K7B adds local skill/rule draft generation from evaluated Hermes candidates.

## Process

1. Select candidates with reusable skill/rule signals.
2. Create local skill/rule drafts linked to candidate evidence.
3. Keep drafts reviewable and non-canonical.
4. Send drafts to separate promotion review when ready.

## Guardrails

- Draft generation is local-only in K7B.
- Canonical promotion remains a separate review step.
- Cross-project/global promotion is out of scope.
```

- [ ] **Step 8: Update existing distillation assets for K7B handoff**

Update `commands/hermes-distill.md` focus section to include:

```md
- skill/rule draft targets
```

Update `commands/hermes-candidates.md` focus section to include:

```md
- K7B skill/rule draft readiness
```

Update `skills/hermes-distillation/SKILL.md` rules with:

```md
- Route qualified candidates into wiki/process/skill/rule draft workflows while keeping promotion separate
```

Update `templates/generic/docs/wiki/processes/hermes-distillation.md` guardrails with:

```md
- K7 includes local wiki/process/skill/rule draft generation, but promotion stays separate.
```

- [ ] **Step 9: Run focused K7B asset-content test and crossref test**

Run:

```bash
npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K7B local skill/rule draft generation boundaries"
npx vitest run tests/unit/templates/governance.crossref.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit Task 2 changes**

```bash
git add commands/hermes-draft-skill.md commands/hermes-draft-rule.md commands/hermes-distill.md commands/hermes-candidates.md skills/hermes-skill-drafting/SKILL.md skills/hermes-rule-drafting/SKILL.md skills/hermes-distillation/SKILL.md templates/generic/docs/wiki/processes/hermes-skill-rule-drafting.md templates/generic/docs/wiki/processes/hermes-distillation.md tests/unit/templates/hermes-assets.test.ts
git commit -m "feat: add Hermes local skill and rule draft workflows"
```

---

## Task 3: Register K7B assets in governance manifest

**Files:**

- Modify: `src/templates/governance.ts`
- Modify: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Add failing governance expectations first**

In governance tests, add destination assertions:

```ts
expect(destinations).toContain("commands/hermes-draft-skill.md");
expect(destinations).toContain("commands/hermes-draft-rule.md");
expect(destinations).toContain("skills/hermes-skill-drafting/SKILL.md");
expect(destinations).toContain("skills/hermes-rule-drafting/SKILL.md");
expect(destinations).toContain("docs/wiki/processes/hermes-skill-rule-drafting.md");
```

Update task totals by `+5` from current post-K8 counts.

- [ ] **Step 2: Run governance test to verify it fails**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: FAIL until K7B assets are registered.

- [ ] **Step 3: Update Hermes groups in `src/templates/governance.ts`**

Update:

```ts
const HERMES_SKILLS = [
  "hermes-runtime",
  "hermes-evaluation",
  "hermes-distillation",
  "hermes-memory-router",
  "hermes-skill-drafting",
  "hermes-rule-drafting",
];

const HERMES_COMMANDS = [
  "hermes-log",
  "hermes-candidates",
  "hermes-distill",
  "hermes-refine",
  "hermes-query",
  "hermes-draft-skill",
  "hermes-draft-rule",
];

const HERMES_DOC_FILES = [
  "docs/wiki/processes/hermes-runtime.md",
  "docs/wiki/processes/hermes-distillation.md",
  "docs/wiki/processes/hermes-memory-routing.md",
  "docs/wiki/processes/hermes-skill-rule-drafting.md",
];
```

- [ ] **Step 4: Run governance test to verify it passes**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 3 changes**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register Hermes skill and rule draft governance assets"
```

---

## Task 4: Extend self-check coverage for K7B assets

**Files:**

- Modify: `tests/unit/doctor/self-checks.test.ts`
- Modify: `src/doctor/self-checks.ts` only if required

- [ ] **Step 1: Add failing K7B self-check tests first**

Add tests for missing paths:

```ts
commands/hermes-draft-skill.md -> self-hermes-commands-exist
commands/hermes-draft-rule.md -> self-hermes-commands-exist
skills/hermes-skill-drafting/SKILL.md -> self-hermes-skills-exist
skills/hermes-rule-drafting/SKILL.md -> self-hermes-skills-exist
docs/wiki/processes/hermes-skill-rule-drafting.md -> self-hermes-docs-exist
```

Each test should assert `result.ok === false`, `check.passed === false`, and message contains the missing path.

- [ ] **Step 2: Run self-check suite to verify behavior**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: If manifest already drives coverage, tests may pass immediately; document that and keep manifest-driven approach.

- [ ] **Step 3: Keep manifest-driven implementation (no new check IDs)**

Use existing Hermes check IDs only.

- [ ] **Step 4: Run self-check suite to verify pass**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 4 changes**

```bash
git add tests/unit/doctor/self-checks.test.ts src/doctor/self-checks.ts
git commit -m "test: cover Hermes skill and rule draft governance assets"
```

---

## Task 5: Document K7B boundaries in knowledge metadata README

**Files:**

- Modify: `templates/generic/.bbg/knowledge/README.md`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write failing README boundary test first**

Add test:

```ts
it("documents K7B skill/rule draft boundaries in the knowledge README", async () => {
  const readme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
  const normalized = readme.replace(/\s+/g, " ").toLowerCase();

  expect(normalized).toContain("k7b adds local skill/rule draft generation");
  expect(normalized).toContain("draft skill/rule outputs remain non-canonical until separately promoted");
  expect(normalized).toContain("global promotion remains out of scope in k7b");
});
```

- [ ] **Step 2: Run focused README test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K7B skill/rule draft boundaries in the knowledge README"`

Expected: FAIL until README is updated.

- [ ] **Step 3: Update README with K7B paragraph**

Append under Hermes responsibilities:

```md
In K7B, local skill/rule draft generation is added alongside wiki/process drafts. Draft skill/rule outputs remain non-canonical until separately promoted through review workflows, and global promotion remains out of scope in K7B.
```

- [ ] **Step 4: Run focused README test to verify it passes**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K7B skill/rule draft boundaries in the knowledge README"`

Expected: PASS.

- [ ] **Step 5: Commit Task 5 changes**

```bash
git add templates/generic/.bbg/knowledge/README.md tests/unit/templates/hermes-assets.test.ts
git commit -m "docs: clarify Hermes skill and rule draft boundaries"
```

---

## Task 6: Final K7B verification

**Files:**

- Modify if needed: any K7B-touched file required to resolve verification issues

- [ ] **Step 1: Run targeted K7B suites**

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
git commit -m "test: verify Hermes K7B integration"
```

Only create this commit if verification uncovers follow-up issues beyond Tasks 1-5.

---

## K7B Scope Guardrails

Do **not** include any of the following in K7B:

- canonical skill/rule promotion automation
- global/org-level promotion paths
- memory routing changes (already K8)
- embeddings/vector search/ranking heuristics
- cross-project intake or aggregation

K7B is complete once local Hermes can generate and govern skill/rule drafts with explicit non-canonical boundaries, while preserving local-only and promotion-later constraints.
