# Hermes K11 Meta-Learning Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a governed K11 meta-learning layer that turns K6-K10 evidence into auditable, advisory optimization recommendations for workflow/skill/routing selection over time.

**Architecture:** K11 consumes historical runtime, evaluation, intake, verification, and promotion evidence to compute strategy recommendations. K11 remains recommendation-only: it records and explains optimization suggestions but does not auto-edit assets, auto-promote candidates, or bypass canonical routing/promotion guardrails.

**Tech Stack:** TypeScript, Vitest, SQLite schema templates, Markdown governance assets, existing Hermes K6-K10 scaffolding

---

## File Structure

### New files

- `commands/hermes-learn.md` — command contract for running evidence-backed learning passes
- `commands/hermes-strategy.md` — command contract for reviewing/applying recommendations with human approval
- `skills/hermes-meta-learning/SKILL.md` — workflow for deriving recommendations from historical evidence
- `skills/hermes-strategy-selection/SKILL.md` — workflow for controlled, manual strategy adoption
- `templates/generic/docs/wiki/processes/hermes-meta-learning.md` — process doc for K11 learning loop

### Modified files

- `templates/generic/.bbg/scripts/hermes-schema.sql` — add K11 learning and recommendation tables
- `templates/generic/.bbg/knowledge/README.md` — document K11 advisory scope and non-autonomous boundaries
- `commands/hermes-query.md` — clarify K11 recommendations are advisory and do not bypass canonical routing
- `commands/hermes-promote.md` — add K10→K11 handoff boundary
- `skills/hermes-memory-router/SKILL.md` — clarify router uses approved policy, not auto-optimized policy
- `skills/hermes-promotion/SKILL.md` — clarify K11 only consumes promotion evidence
- `templates/generic/docs/wiki/processes/hermes-memory-routing.md` — add K11 advisory boundary
- `templates/generic/docs/wiki/processes/hermes-verification-promotion.md` — add K11 handoff note
- `src/templates/governance.ts` — register K11 commands/skills/process doc
- `tests/unit/templates/governance.test.ts` — assert K11 assets and update totals
- `tests/unit/templates/governance.crossref.test.ts` — validate K11 links
- `tests/unit/doctor/self-checks.test.ts` — extend missing-path coverage for K11 assets
- `tests/unit/templates/hermes-assets.test.ts` — lock K11 schema/docs boundaries

---

## Task 1: Add K11 learning and recommendation schema

**Files:**

- Modify: `templates/generic/.bbg/scripts/hermes-schema.sql`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write failing K11 schema test first**
- [ ] **Step 2: Run focused test and verify RED**
- [ ] **Step 3: Add `hermes_learning_runs`, `hermes_learning_signals`, and `hermes_strategy_recommendations` tables + indexes**
- [ ] **Step 4: Re-run focused test and verify GREEN**
- [ ] **Step 5: Commit Task 1**

---

## Task 2: Add K11 commands, skills, and process documentation

**Files:**

- Create: `commands/hermes-learn.md`
- Create: `commands/hermes-strategy.md`
- Create: `skills/hermes-meta-learning/SKILL.md`
- Create: `skills/hermes-strategy-selection/SKILL.md`
- Create: `templates/generic/docs/wiki/processes/hermes-meta-learning.md`
- Modify: `commands/hermes-query.md`
- Modify: `commands/hermes-promote.md`
- Modify: `skills/hermes-memory-router/SKILL.md`
- Modify: `skills/hermes-promotion/SKILL.md`
- Modify: `templates/generic/docs/wiki/processes/hermes-memory-routing.md`
- Modify: `templates/generic/docs/wiki/processes/hermes-verification-promotion.md`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Add failing content/boundary tests first**
- [ ] **Step 2: Run focused tests and verify RED**
- [ ] **Step 3: Add K11 assets and K10/K8 handoff notes**
- [ ] **Step 4: Run focused hermes-assets + crossref tests and verify GREEN**
- [ ] **Step 5: Commit Task 2**

---

## Task 3: Register K11 assets in governance manifest

**Files:**

- Modify: `src/templates/governance.ts`
- Modify: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Add failing governance assertions first**
- [ ] **Step 2: Run governance test and verify RED**
- [ ] **Step 3: Add K11 commands/skills/doc entries to manifest constants**
- [ ] **Step 4: Re-run governance test and verify GREEN**
- [ ] **Step 5: Commit Task 3**

---

## Task 4: Extend self-check coverage for K11 assets

**Files:**

- Modify: `tests/unit/doctor/self-checks.test.ts`
- Modify: `src/doctor/self-checks.ts` only if needed

- [ ] **Step 1: Add missing-path tests for K11 command/skill/doc assets**
- [ ] **Step 2: Run self-check suite and verify GREEN**
- [ ] **Step 3: Keep manifest-driven behavior (no new check IDs)**
- [ ] **Step 4: Commit Task 4**

---

## Task 5: Document K11 boundaries in knowledge README

**Files:**

- Modify: `templates/generic/.bbg/knowledge/README.md`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Add failing README boundary test first**
- [ ] **Step 2: Run focused test and verify RED**
- [ ] **Step 3: Add K11 advisory-scope paragraph**
- [ ] **Step 4: Re-run focused test and verify GREEN**
- [ ] **Step 5: Commit Task 5**

---

## Task 6: Final K11 verification

**Files:**

- Modify if needed: any K11-touched file for verification fixes

- [ ] **Step 1: Run targeted suites**
- [ ] **Step 2: Run `npm run typecheck`**
- [ ] **Step 3: Run `npm run build`**
- [ ] **Step 4: Run `npm test`**
- [ ] **Step 5: Commit verification-only fixes (only if needed)**

---

## K11 Scope Guardrails

Do **not** include in K11:

- opaque autonomous self-editing
- auto-promotion or auto-merge without review gates
- bypassing canonical-first routing and trust model
- embeddings/vector/ranking additions
- unverifiable recommendation scoring without evidence links

K11 is complete once recommendation records are structurally captured, governance assets are registered and self-checked, and the full test/build pipeline passes while preserving evidence-first, human-reviewed control boundaries.
