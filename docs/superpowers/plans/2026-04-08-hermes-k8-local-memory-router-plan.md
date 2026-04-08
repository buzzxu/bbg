# Hermes K8 Local Memory Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-only Hermes memory router so future work consults local canonical wiki knowledge first, then local Hermes draft candidates, before falling back to raw/runtime evidence.

**Architecture:** K8 extends the existing wiki-query and Hermes K7A governance assets instead of introducing a new retrieval engine. The first router implementation is declarative and workflow-driven: it defines retrieval order, query boundaries, and draft-vs-canonical decision rules in commands, skills, docs, manifest registration, and self-check coverage. No embeddings, ranking engine, or automated memory mutation are part of this phase.

**Tech Stack:** TypeScript, Vitest, Markdown governance assets, existing wiki-query and Hermes distillation workflows, governance manifest/self-check infrastructure

---

## File Structure

### New files

- `commands/hermes-query.md` — local memory router command contract for Hermes-aware question answering
- `skills/hermes-memory-router/SKILL.md` — workflow skill for selecting local canonical wiki vs local candidate memory vs raw/runtime artifacts
- `templates/generic/docs/wiki/processes/hermes-memory-routing.md` — process doc that defines K8 retrieval order and boundaries

### Modified files

- `commands/wiki-query.md` — connect wiki-first querying to the new K8 local memory router boundary
- `commands/hermes-candidates.md` — clarify candidate memory is consultable but lower priority than canonical wiki memory
- `skills/wiki-query/SKILL.md` — make the local canonical-over-candidate rule explicit
- `skills/hermes-distillation/SKILL.md` — clarify routed draft outputs are candidate memory, not canonical memory
- `templates/generic/.bbg/knowledge/README.md` — document K8 local memory layers and routing order
- `src/templates/governance.ts` — register K8 command, skill, and process doc
- `src/doctor/self-checks.ts` — extend existing Hermes coverage to include K8 assets through the manifest
- `tests/unit/templates/governance.test.ts` — assert K8 asset registration and updated totals
- `tests/unit/templates/governance.crossref.test.ts` — validate Related links for the new router assets
- `tests/unit/doctor/self-checks.test.ts` — cover missing K8 router assets through Hermes self-check groups
- `tests/unit/templates/hermes-assets.test.ts` — lock K8 routing order and boundary language into template assets

### Existing files to inspect while implementing

- `docs/superpowers/specs/2026-04-07-hermes-completion-design.md` — approved retrieval order and local-first architecture
- `docs/superpowers/plans/2026-04-07-hermes-k7a-local-distillation-plan.md` — prior Hermes local-only workflow pattern to mirror
- `commands/wiki-query.md` — existing wiki-first query semantics that K8 should extend, not replace
- `skills/wiki-query/SKILL.md` — current answer/promotion split and query-order rules
- `commands/hermes-distill.md` — local draft creation workflow that feeds candidate memory
- `templates/generic/docs/wiki/processes/hermes-distillation.md` — K7A draft lifecycle boundary that K8 must preserve
- `templates/generic/docs/wiki/processes/knowledge-trust-model.md` — trust boundary between canonical and candidate knowledge

---

## Task 1: Add K8 routing command, skill, and process documentation

**Files:**

- Create: `commands/hermes-query.md`
- Create: `skills/hermes-memory-router/SKILL.md`
- Create: `templates/generic/docs/wiki/processes/hermes-memory-routing.md`
- Modify: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write the failing K8 asset-content test first**

Append this test to `tests/unit/templates/hermes-assets.test.ts`:

```ts
it("documents K8 local memory routing order and canonical-over-candidate priority", async () => {
  const [queryCommand, routerSkill, routingProcess] = await Promise.all([
    readFile(join(packageRoot, "commands/hermes-query.md"), "utf8"),
    readFile(join(packageRoot, "skills/hermes-memory-router/SKILL.md"), "utf8"),
    readFile(join(packageRoot, "templates/generic/docs/wiki/processes/hermes-memory-routing.md"), "utf8"),
  ]);
  const normalizedCommand = queryCommand.replace(/\s+/g, " ").toLowerCase();
  const normalizedSkill = routerSkill.replace(/\s+/g, " ").toLowerCase();
  const normalizedProcess = routingProcess.replace(/\s+/g, " ").toLowerCase();

  expect(normalizedCommand).toContain("local canonical wiki memory before local candidate memory");
  expect(normalizedSkill).toContain("canonical over candidate");
  expect(normalizedSkill).toContain("local over raw/runtime evidence");
  expect(normalizedProcess).toContain("1. local canonical wiki memory");
  expect(normalizedProcess).toContain("2. local candidate draft memory");
  expect(normalizedProcess).toContain("3. raw/runtime artifacts only when needed");
});
```

- [ ] **Step 2: Run the focused K8 routing test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K8 local memory routing order and canonical-over-candidate priority"`

Expected: FAIL because the K8 router assets do not exist yet.

- [ ] **Step 3: Create `commands/hermes-query.md`**

Create `commands/hermes-query.md` with this content:

```md
# /hermes-query

## Description

Answer questions using the K8 local Hermes memory router: local canonical wiki memory before local candidate memory, and raw/runtime artifacts only when the local layers are insufficient.

## Usage
```

/hermes-query "What is the current rollout process?"
/hermes-query "Which local draft explains this repeated failure?"
/hermes-query "What evidence supports this candidate process change?"

```

## Query Order

1. Read local canonical wiki memory first
2. Check local candidate draft memory when canonical pages are missing or incomplete
3. Consult raw/runtime artifacts only when the local layers still leave a gap
4. Keep canonical promotion separate from query answering

## Process

1. Start with canonical wiki/process pages that already answer the question.
2. Use local Hermes draft candidates only when canonical memory is missing, incomplete, or explicitly under review.
3. Read the smallest supporting run/evaluation/artifact evidence needed to resolve the remaining gap.
4. Answer with the highest-trust local memory available and state whether the result came from canonical or candidate memory.

## Rules

- Prefer local canonical wiki memory before local candidate memory
- Prefer local memory before raw/runtime evidence
- Candidate memory can inform answers but does not become canonical by being queried
- Keep promotion and routing separate

## Related

- [Wiki Query Command](./wiki-query.md)
- [Hermes Candidates Command](./hermes-candidates.md)
- [Hermes Memory Router Skill](../skills/hermes-memory-router/SKILL.md)
```

- [ ] **Step 4: Create `skills/hermes-memory-router/SKILL.md`**

Create `skills/hermes-memory-router/SKILL.md` with this content:

```md
---
name: hermes-memory-router
category: hermes
description: Use when selecting between local canonical wiki memory, local candidate draft memory, and raw/runtime evidence.
---

# Hermes Memory Router

## Workflow

1. Read local canonical wiki/process pages first
2. Escalate to local candidate draft memory only when canonical memory is missing or incomplete
3. Escalate to raw/runtime evidence only when the local memory layers do not resolve the question
4. Return the answer with explicit memory-layer provenance

## Rules

- Canonical over candidate
- Local over raw/runtime evidence
- Candidate memory is reviewable draft memory, not trusted canonical memory
- Querying a candidate does not promote it
- Keep routing separate from distillation and promotion workflows

## Related

- [Hermes Query Command](../../commands/hermes-query.md)
- [Wiki Query Skill](../wiki-query/SKILL.md)
- [Hermes Distillation Skill](../hermes-distillation/SKILL.md)
```

- [ ] **Step 5: Create `templates/generic/docs/wiki/processes/hermes-memory-routing.md`**

Create `templates/generic/docs/wiki/processes/hermes-memory-routing.md` with this content:

```md
---
title: Hermes Memory Routing
type: process
status: active
sources:
  - docs/wiki/processes/hermes-runtime.md
  - docs/wiki/processes/hermes-distillation.md
last_updated: 2026-04-08
tags:
  - hermes
  - routing
  - local-memory
related:
  - docs/wiki/processes/hermes-runtime.md
  - docs/wiki/processes/hermes-distillation.md
  - docs/wiki/processes/knowledge-trust-model.md
---

# Hermes Memory Routing

## Retrieval Order

1. Local canonical wiki memory
2. Local candidate draft memory
3. Raw/runtime artifacts only when needed

## Routing Rules

- Prefer canonical over candidate
- Prefer local over raw/runtime evidence
- Treat candidate drafts as reviewable memory, not canonical truth
- Keep routing separate from promotion decisions

## Guardrails

- K8 does not introduce embeddings or ranking heuristics.
- K8 does not auto-promote queried candidates.
- K8 remains local-only and does not add org/global routing.
```

````

- [ ] **Step 6: Run the focused K8 routing test to verify it passes**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K8 local memory routing order and canonical-over-candidate priority"`

Expected: PASS.

- [ ] **Step 7: Commit the K8 router governance assets**

```bash
git add commands/hermes-query.md skills/hermes-memory-router/SKILL.md templates/generic/docs/wiki/processes/hermes-memory-routing.md tests/unit/templates/hermes-assets.test.ts
git commit -m "feat: add Hermes local memory router assets"
````

---

## Task 2: Align wiki-query and Hermes workflows with K8 routing boundaries

**Files:**

- Modify: `commands/wiki-query.md`
- Modify: `commands/hermes-candidates.md`
- Modify: `skills/wiki-query/SKILL.md`
- Modify: `skills/hermes-distillation/SKILL.md`
- Test: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write the failing workflow-alignment test first**

Append this test to `tests/unit/templates/hermes-assets.test.ts`:

```ts
it("keeps K8 query workflows canonical-first and candidate-aware without auto-promotion", async () => {
  const [wikiQueryCommand, wikiQuerySkill, hermesCandidatesCommand, hermesDistillationSkill] = await Promise.all([
    readFile(join(packageRoot, "commands/wiki-query.md"), "utf8"),
    readFile(join(packageRoot, "skills/wiki-query/SKILL.md"), "utf8"),
    readFile(join(packageRoot, "commands/hermes-candidates.md"), "utf8"),
    readFile(join(packageRoot, "skills/hermes-distillation/SKILL.md"), "utf8"),
  ]);
  const normalizedWikiCommand = wikiQueryCommand.replace(/\s+/g, " ").toLowerCase();
  const normalizedWikiSkill = wikiQuerySkill.replace(/\s+/g, " ").toLowerCase();
  const normalizedCandidates = hermesCandidatesCommand.replace(/\s+/g, " ").toLowerCase();
  const normalizedDistillation = hermesDistillationSkill.replace(/\s+/g, " ").toLowerCase();

  expect(normalizedWikiCommand).toContain("canonical wiki memory before local candidate draft memory");
  expect(normalizedWikiSkill).toContain("candidate memory is a lower-priority fallback than canonical wiki memory");
  expect(normalizedCandidates).toContain("candidate memory is queryable but not canonical");
  expect(normalizedDistillation).toContain("distilled drafts become candidate memory until separately promoted");
});
```

- [ ] **Step 2: Run the focused workflow-alignment test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "keeps K8 query workflows canonical-first and candidate-aware without auto-promotion"`

Expected: FAIL because the K8 routing language is not yet present in those workflow assets.

- [ ] **Step 3: Update `commands/wiki-query.md`**

Add this rule to the `## Query Order` section after step 2:

```md
3. Prefer canonical wiki memory before local candidate draft memory when both exist
```

Then update the later numbering to keep the list sequential, and add this bullet under `## Rules`:

```md
- Prefer canonical wiki memory before local candidate draft memory
```

- [ ] **Step 4: Update `skills/wiki-query/SKILL.md`**

Add this bullet under `## Rules`:

```md
- Candidate memory is a lower-priority fallback than canonical wiki memory
```

Add this bullet under `## Query Order` after item 2:

```md
3. Check local candidate draft memory only when canonical wiki memory is missing or incomplete
```

Then renumber the remaining items.

- [ ] **Step 5: Update `commands/hermes-candidates.md`**

Append this sentence below the out-of-scope line near the bottom:

```md
Candidate memory is queryable but not canonical.
```

- [ ] **Step 6: Update `skills/hermes-distillation/SKILL.md`**

Add this rule under `## Rules`:

```md
- Distilled drafts become candidate memory until separately promoted into canonical knowledge
```

- [ ] **Step 7: Run the focused workflow-alignment test to verify it passes**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "keeps K8 query workflows canonical-first and candidate-aware without auto-promotion"`

Expected: PASS.

- [ ] **Step 8: Commit the K8 workflow alignment**

```bash
git add commands/wiki-query.md commands/hermes-candidates.md skills/wiki-query/SKILL.md skills/hermes-distillation/SKILL.md tests/unit/templates/hermes-assets.test.ts
git commit -m "feat: align query workflows with Hermes memory routing"
```

---

## Task 3: Register K8 router assets in the governance manifest

**Files:**

- Modify: `src/templates/governance.ts`
- Modify: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Add failing governance expectations first**

In `tests/unit/templates/governance.test.ts`, add these assertions in the minimal-config test:

```ts
expect(destinations).toContain("commands/hermes-query.md");
expect(destinations).toContain("skills/hermes-memory-router/SKILL.md");
expect(destinations).toContain("docs/wiki/processes/hermes-memory-routing.md");
```

Update the suite-wide task totals by `+3` from the current post-K7A counts.

- [ ] **Step 2: Run the governance test to verify it fails**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: FAIL because K8 router assets are not registered yet.

- [ ] **Step 3: Update `src/templates/governance.ts`**

Change the Hermes constants to:

```ts
const HERMES_SKILLS = ["hermes-runtime", "hermes-evaluation", "hermes-distillation", "hermes-memory-router"];

const HERMES_COMMANDS = ["hermes-log", "hermes-candidates", "hermes-distill", "hermes-refine", "hermes-query"];

const HERMES_DOC_FILES = [
  "docs/wiki/processes/hermes-runtime.md",
  "docs/wiki/processes/hermes-distillation.md",
  "docs/wiki/processes/hermes-memory-routing.md",
];
```

- [ ] **Step 4: Run the governance test to verify it passes**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the K8 manifest registration**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register Hermes memory routing assets"
```

---

## Task 4: Extend self-check coverage for K8 router assets

**Files:**

- Modify: `tests/unit/doctor/self-checks.test.ts`
- Modify: `src/doctor/self-checks.ts` only if needed

- [ ] **Step 1: Add failing K8 self-check tests first**

Append these tests to `tests/unit/doctor/self-checks.test.ts`:

```ts
it("fails the Hermes command check for a missing K8 router command", async () => {
  const root = await makeTempDir();
  await createMinimalGovernance(root);

  const missingPath = "commands/hermes-query.md";
  await rm(join(root, missingPath));

  const result = await runSelfChecks(root);
  const check = getCheck(result, "self-hermes-commands-exist");

  expect(result.ok).toBe(false);
  expect(check.passed).toBe(false);
  expect(check.message).toContain(missingPath);
});

it("fails the Hermes skill check for a missing K8 router skill", async () => {
  const root = await makeTempDir();
  await createMinimalGovernance(root);

  const missingPath = "skills/hermes-memory-router/SKILL.md";
  await rm(join(root, missingPath));

  const result = await runSelfChecks(root);
  const check = getCheck(result, "self-hermes-skills-exist");

  expect(result.ok).toBe(false);
  expect(check.passed).toBe(false);
  expect(check.message).toContain(missingPath);
});

it("fails the Hermes doc check for a missing K8 routing process doc", async () => {
  const root = await makeTempDir();
  await createMinimalGovernance(root);

  const missingPath = "docs/wiki/processes/hermes-memory-routing.md";
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

Expected: FAIL until the manifest-driven Hermes groups include the K8 assets.

- [ ] **Step 3: Keep the implementation manifest-driven**

Do not add new self-check IDs. Keep using the existing Hermes check IDs, letting the expanded `GOVERNANCE_MANIFEST.hermes*` groups drive coverage.

- [ ] **Step 4: Run the self-check suite to verify it passes**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the K8 self-check coverage**

```bash
git add tests/unit/doctor/self-checks.test.ts src/doctor/self-checks.ts
git commit -m "test: cover Hermes memory routing governance assets"
```

---

## Task 5: Document K8 routing order in knowledge metadata guidance

**Files:**

- Modify: `templates/generic/.bbg/knowledge/README.md`
- Test: `tests/unit/templates/hermes-assets.test.ts`

- [ ] **Step 1: Write the failing README routing test first**

Append this test to `tests/unit/templates/hermes-assets.test.ts`:

```ts
it("documents K8 local memory routing in the knowledge README", async () => {
  const knowledgeReadme = await readFile(join(packageRoot, "templates/generic/.bbg/knowledge/README.md"), "utf8");
  const normalized = knowledgeReadme.replace(/\s+/g, " ").toLowerCase();

  expect(normalized).toContain("local canonical wiki memory before local candidate draft memory");
  expect(normalized).toContain("candidate memory remains reviewable draft memory");
  expect(normalized).toContain("raw/runtime artifacts are a fallback layer");
});
```

- [ ] **Step 2: Run the README routing test to verify it fails**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K8 local memory routing in the knowledge README"`

Expected: FAIL because the README does not yet contain the K8 routing explanation.

- [ ] **Step 3: Update `templates/generic/.bbg/knowledge/README.md`**

Append this paragraph to the end of the Hermes Runtime Responsibilities section:

```md
In K8, local canonical wiki memory is consulted before local candidate draft memory, and raw/runtime artifacts are a fallback layer only when the local memory layers do not resolve the question. Candidate memory remains reviewable draft memory until separately promoted.
```

- [ ] **Step 4: Run the README routing test to verify it passes**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts -t "documents K8 local memory routing in the knowledge README"`

Expected: PASS.

- [ ] **Step 5: Commit the K8 README guidance**

```bash
git add templates/generic/.bbg/knowledge/README.md tests/unit/templates/hermes-assets.test.ts
git commit -m "docs: clarify Hermes local memory routing order"
```

---

## Task 6: Final K8 verification

**Files:**

- Modify if needed: any K8-touched file required to resolve verification issues

- [ ] **Step 1: Run the targeted K8 suites**

Run: `npx vitest run tests/unit/templates/hermes-assets.test.ts tests/unit/templates/governance.test.ts tests/unit/templates/governance.crossref.test.ts tests/unit/doctor/self-checks.test.ts`

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

- [ ] **Step 5: Commit any final verification-only fixes if needed**

```bash
git add .
git commit -m "test: verify Hermes local memory routing integration"
```

Only create this commit if verification uncovers follow-up issues beyond the earlier K8 commits.

---

## K8 Scope Guardrails

Do **not** include any of the following in K8:

- embeddings or vector search
- ranking heuristics or retrieval scoring engines
- automatic candidate promotion caused by querying
- local skill/rule generation
- org/global memory routing
- cross-project aggregation

K8 is complete once the scaffold defines a local-first, canonical-over-candidate memory router in commands, skills, docs, manifest coverage, and self-checks, while keeping routing distinct from promotion and distillation.
