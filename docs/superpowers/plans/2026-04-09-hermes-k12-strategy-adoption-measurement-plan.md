# Hermes K12 Strategy Adoption and Outcome Measurement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a governed K12 layer that turns accepted K11 recommendations into explicit adoption decisions and measures whether those adopted strategies improve outcomes over time.

**Architecture:** K12 sits after K11 advisory recommendations. K11 proposes; K12 records what was adopted, where it was applied, and whether metrics improved in later windows. K12 remains evidence-first and review-driven: no autonomous self-editing, no bypass of canonical routing/promotion controls.

**Tech Stack:** TypeScript, Vitest, SQLite schema templates, Markdown governance assets, existing Hermes K6-K11 scaffolding

---

## File Structure

### New files

- `commands/hermes-adopt.md` — command contract for recording approved strategy adoption events
- `commands/hermes-outcomes.md` — command contract for reviewing adoption impact over time windows
- `skills/hermes-strategy-adoption/SKILL.md` — workflow for controlled strategy rollout
- `skills/hermes-outcome-evaluation/SKILL.md` — workflow for outcome measurement and rollback triggers
- `templates/generic/docs/wiki/processes/hermes-strategy-adoption.md` — process doc for adopt → observe → evaluate cycle

### Modified files

- `templates/generic/.bbg/scripts/hermes-schema.sql` — add K12 adoption and outcome tables
- `templates/generic/.bbg/knowledge/README.md` — document K12 measurement scope and guardrails
- `commands/hermes-strategy.md` — handoff to K12 adoption tracking
- `commands/hermes-query.md` — clarify adopted strategies still honor canonical routing boundaries
- `skills/hermes-strategy-selection/SKILL.md` — clarify K11 decision vs K12 rollout boundary
- `skills/hermes-memory-router/SKILL.md` — document adopted-policy provenance requirement
- `templates/generic/docs/wiki/processes/hermes-meta-learning.md` — add K11→K12 handoff
- `templates/generic/docs/wiki/processes/hermes-memory-routing.md` — add K12 rollback guardrail note
- `src/templates/governance.ts` — register K12 commands/skills/process doc
- `tests/unit/templates/governance.test.ts` — assert K12 assets and update totals
- `tests/unit/templates/governance.crossref.test.ts` — validate K12 links
- `tests/unit/doctor/self-checks.test.ts` — missing-path coverage for K12 assets
- `tests/unit/templates/hermes-assets.test.ts` — lock K12 schema/content boundaries

---

## Task 1: Add K12 adoption/outcome schema

**Files:**

- Modify: `templates/generic/.bbg/scripts/hermes-schema.sql`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] Add failing schema test first (RED)
- [ ] Add `hermes_strategy_adoptions` and `hermes_strategy_outcomes` tables + indexes (GREEN)
- [ ] Commit Task 1

---

## Task 2: Add K12 commands, skills, and process docs

**Files:**

- Create: `commands/hermes-adopt.md`
- Create: `commands/hermes-outcomes.md`
- Create: `skills/hermes-strategy-adoption/SKILL.md`
- Create: `skills/hermes-outcome-evaluation/SKILL.md`
- Create: `templates/generic/docs/wiki/processes/hermes-strategy-adoption.md`
- Modify: `commands/hermes-strategy.md`
- Modify: `commands/hermes-query.md`
- Modify: `skills/hermes-strategy-selection/SKILL.md`
- Modify: `skills/hermes-memory-router/SKILL.md`
- Modify: `templates/generic/docs/wiki/processes/hermes-meta-learning.md`
- Modify: `templates/generic/docs/wiki/processes/hermes-memory-routing.md`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] Add failing content/boundary tests first (RED)
- [ ] Implement assets and handoff notes (GREEN)
- [ ] Run focused hermes-assets + crossref tests
- [ ] Commit Task 2

---

## Task 3: Register K12 assets in governance

**Files:**

- Modify: `src/templates/governance.ts`
- Modify: `tests/unit/templates/governance.test.ts`

- [ ] Add failing governance assertions (RED)
- [ ] Register K12 commands/skills/doc in manifest (GREEN)
- [ ] Commit Task 3

---

## Task 4: Extend self-check coverage for K12 assets

**Files:**

- Modify: `tests/unit/doctor/self-checks.test.ts`
- Modify: `src/doctor/self-checks.ts` only if needed

- [ ] Add missing-path tests for K12 command/skill/doc assets
- [ ] Run self-check suite
- [ ] Commit Task 4

---

## Task 5: Document K12 boundaries in knowledge README

**Files:**

- Modify: `templates/generic/.bbg/knowledge/README.md`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] Add failing README boundary test (RED)
- [ ] Add K12 scope paragraph (GREEN)
- [ ] Commit Task 5

---

## Task 6: Final K12 verification

- [ ] Run targeted suites
- [ ] Run `npm run typecheck`
- [ ] Run `npm run build`
- [ ] Run `npm test`
- [ ] Commit verification-only fixes (if needed)

---

## K12 Scope Guardrails

Do **not** include in K12:

- autonomous strategy auto-apply without explicit adoption records
- automatic edits of global/local assets from recommendation output
- bypassing canonical-first routing and K10 promotion verification boundaries
- embeddings/vector/ranking additions
- outcome scoring without evidence lineage

K12 is complete when strategy adoption and outcome measurement are structurally captured, audit-linked to K11 recommendations, governance-registered, and fully test/build verified under human-reviewed controls.
