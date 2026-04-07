# Knowledge Layer K2 Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the K1 wiki scaffold into a disciplined knowledge workflow by standardizing frontmatter, defining page lifecycle rules, strengthening ingest/query/lint behavior, and adding governance coverage for these conventions.

**Architecture:** K2 still remains Markdown-first and does not introduce the knowledge database yet. Instead, it strengthens the semantic contract of the generated knowledge layer so that all tools share the same page schema, update rules, index/log behavior, and lint expectations before any structured runtime metadata is introduced in K3.

**Tech Stack:** TypeScript, Vitest, Markdown governance assets, existing manifest + self-check pipeline

---

## File Structure

### New files

- `rules/common/knowledge.md` — cross-tool rules for knowledge page creation, updates, source attribution, and lifecycle states

### Modified files

- `commands/wiki-ingest.md` — define standardized ingest outputs, source attribution, conflict handling, and index/log updates
- `commands/wiki-query.md` — define wiki-first lookup and durable-answer promotion rules
- `commands/wiki-lint.md` — define concrete knowledge health checks and output categories
- `skills/wiki-ingestion/SKILL.md` — encode the canonical ingest procedure and page creation/update decision points
- `skills/wiki-query/SKILL.md` — encode wiki-first answer synthesis and promotion heuristics
- `skills/wiki-lint/SKILL.md` — encode explicit lint categories and maintenance guidance
- `templates/generic/docs/wiki/index.md` — describe catalog responsibilities and entry format
- `templates/generic/docs/wiki/log.md` — describe append-only log format
- `templates/generic/docs/wiki/concepts/README.md` — add lifecycle + frontmatter + naming rules for concept pages
- `templates/generic/docs/wiki/decisions/README.md` — same for decision pages
- `templates/generic/docs/wiki/reports/README.md` — same for report pages
- `templates/generic/docs/wiki/processes/README.md` — same for process pages
- `src/templates/governance.ts` — register the new common rule and reflect count changes
- `src/doctor/self-checks.ts` — include the new rule in self-check/orphan logic automatically via manifest
- `tests/unit/templates/governance.test.ts` — add assertions for the knowledge rule and updated totals
- `tests/unit/templates/governance.crossref.test.ts` — validate any new related links added in K2 docs
- `tests/unit/doctor/self-checks.test.ts` — ensure new rule file is treated as expected governance content

### Existing files to inspect while implementing

- `docs/superpowers/plans/2026-04-07-knowledge-layer-k1-scaffold.md` — K1 contract that K2 refines, not replaces
- `rules/common/patterns.md` — style reference for writing the new `rules/common/knowledge.md`

---

## Task 1: Add a common knowledge governance rule

**Files:**

- Create: `rules/common/knowledge.md`
- Modify: `src/templates/governance.ts`
- Modify: `tests/unit/templates/governance.test.ts`
- Modify: `tests/unit/doctor/self-checks.test.ts`

- [ ] **Step 1: Write the failing governance test for the new common rule**

In `tests/unit/templates/governance.test.ts`, in the minimal-config test, add:

```ts
expect(ruleTasks.map((t) => t.destination)).toContain("rules/common/knowledge.md");
```

Update the common rules count from `8` to `9` and the total counts by `+1` in every existing scenario:

- minimal config: `155 -> 156`
- TypeScript config: `170 -> 171`
- TS+Python config: `189 -> 190`
- backend Java config: `174 -> 175`

- [ ] **Step 2: Run the targeted governance test to verify it fails**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: FAIL because `rules/common/knowledge.md` is not registered yet.

- [ ] **Step 3: Create `rules/common/knowledge.md`**

Write the new rule file with these sections:

- Title: `# Knowledge Layer: Common`
- `## Mandatory`
- `## Recommended`
- `## Forbidden`
- `## Related`

The rule must include these requirements:

- every formal wiki page must contain frontmatter fields `title`, `type`, `status`, `sources`, `last_updated`
- `sources` must point to raw docs or other durable artifacts; no source-less canonical pages
- raw files under `docs/raw/` are immutable inputs
- `docs/wiki/index.md` must be updated when a formal wiki page is added, renamed, or archived
- `docs/wiki/log.md` must remain append-only
- if new evidence contradicts an existing page, mark the conflict explicitly instead of silently rewriting history
- prefer updating an existing page over creating duplicates

Use this exact related section:

```md
## Related

- **Skills**: [wiki-ingestion](../../skills/wiki-ingestion/SKILL.md), [wiki-query](../../skills/wiki-query/SKILL.md), [wiki-lint](../../skills/wiki-lint/SKILL.md)
- **Commands**: [/wiki-ingest](../../commands/wiki-ingest.md), [/wiki-query](../../commands/wiki-query.md), [/wiki-lint](../../commands/wiki-lint.md)
```

- [ ] **Step 4: Register the new rule in `src/templates/governance.ts`**

In `COMMON_RULES`, append `"knowledge"` after `"agents"`:

```ts
const COMMON_RULES = [
  "coding-style",
  "git-workflow",
  "testing",
  "security",
  "performance",
  "patterns",
  "hooks",
  "agents",
  "knowledge",
];
```

- [ ] **Step 5: Extend self-check fixture setup to include the new rule**

In `tests/unit/doctor/self-checks.test.ts`, update `createMinimalGovernance()` to write:

```ts
await writeTextFile(join(root, "rules", "common", "knowledge.md"), "# Knowledge Layer: Common\n\n## Related\n");
```

- [ ] **Step 6: Run targeted tests to verify the new rule is fully wired**

Run: `npx vitest run tests/unit/templates/governance.test.ts tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the rule and registration**

```bash
git add rules/common/knowledge.md src/templates/governance.ts tests/unit/templates/governance.test.ts tests/unit/doctor/self-checks.test.ts
git commit -m "feat: add common knowledge governance rule"
```

---

## Task 2: Standardize wiki page frontmatter and lifecycle guidance in template docs

**Files:**

- Modify: `templates/generic/docs/wiki/concepts/README.md`
- Modify: `templates/generic/docs/wiki/decisions/README.md`
- Modify: `templates/generic/docs/wiki/reports/README.md`
- Modify: `templates/generic/docs/wiki/processes/README.md`
- Modify: `templates/generic/docs/wiki/index.md`
- Modify: `templates/generic/docs/wiki/log.md`

- [ ] **Step 1: Add one canonical frontmatter schema to all wiki section README files**

Replace any loose example with this normalized structure (adjust only the `type` value per folder):

```md
---
title: Example Page
type: concept
status: active
sources:
  - docs/raw/example.md
last_updated: 2026-04-07
tags:
  - example
related:
  - docs/wiki/index.md
---
```

Each README must explicitly state that:

- `status` may be `active`, `draft`, `stale`, or `superseded`
- `sources` is required
- pages should be updated in place when they describe the same stable concept/decision/report/process

- [ ] **Step 2: Add lifecycle guidance to each section README**

Add a short section named `## Lifecycle` in each README defining when to:

- create a new page
- update an existing page
- mark a page `stale`
- mark a page `superseded`

Use the same decision rules across all four files:

- create a new page when the topic is genuinely distinct
- update the existing page when new material extends the same topic
- mark `stale` when sources changed and the page needs review
- mark `superseded` when a new page replaces it

- [ ] **Step 3: Strengthen `templates/generic/docs/wiki/index.md`**

Add a short section explaining that each index entry should include:

- a relative link
- a one-line summary
- placement under the correct category

Add one example entry per section, such as:

```md
- [Quality Gate](./concepts/quality-gate.md) — Defines the project quality pass/fail contract.
```

- [ ] **Step 4: Strengthen `templates/generic/docs/wiki/log.md`**

Add a required entry format example:

```md
## [2026-04-07] ingest | docs/raw/example.md

- Updated: docs/wiki/concepts/example.md
- Added source attribution
- Flagged one unresolved conflict
```

Also state that log entries must be appended, not edited in place except for typo fixes in the newest entry.

- [ ] **Step 5: Review the template docs manually for consistency**

Confirm that all four wiki README files use the same field names and lifecycle terms: `title`, `type`, `status`, `sources`, `last_updated`, `tags`, `related`, plus statuses `active`, `draft`, `stale`, `superseded`.

- [ ] **Step 6: Commit the template guidance changes**

```bash
git add templates/generic/docs/wiki/index.md templates/generic/docs/wiki/log.md templates/generic/docs/wiki/concepts/README.md templates/generic/docs/wiki/decisions/README.md templates/generic/docs/wiki/reports/README.md templates/generic/docs/wiki/processes/README.md
git commit -m "docs: standardize wiki scaffold frontmatter and lifecycle guidance"
```

---

## Task 3: Strengthen wiki-ingest workflow semantics

**Files:**

- Modify: `commands/wiki-ingest.md`
- Modify: `skills/wiki-ingestion/SKILL.md`
- Test: `tests/unit/templates/governance.crossref.test.ts`

- [ ] **Step 1: Update `commands/wiki-ingest.md` with explicit output contract**

Add sections covering:

- expected input: exactly one source path for K2
- output summary fields: `updated_pages`, `new_pages`, `index_updated`, `log_appended`, `conflicts`, `open_questions`
- rule that every created or updated page must reference the source path in `sources`
- rule that conflicts must be documented, not resolved silently

- [ ] **Step 2: Update `skills/wiki-ingestion/SKILL.md` with page-decision logic**

Add an explicit decision procedure:

1. Search index for existing relevant pages
2. If the topic already exists, update that page
3. Create a new page only when the topic is distinct enough to deserve its own canonical page
4. Update index and append log entry

Also add a short anti-pattern list forbidding:

- duplicating the same concept under multiple names
- adding unsourced conclusions
- rewriting raw source files

- [ ] **Step 3: Keep all related links valid**

Make sure any new `## Related` links you add continue to point to existing K1/K2 files only.

- [ ] **Step 4: Run cross-reference validation**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit ingest workflow updates**

```bash
git add commands/wiki-ingest.md skills/wiki-ingestion/SKILL.md
git commit -m "docs: refine wiki ingest workflow semantics"
```

---

## Task 4: Strengthen wiki-query workflow semantics

**Files:**

- Modify: `commands/wiki-query.md`
- Modify: `skills/wiki-query/SKILL.md`
- Test: `tests/unit/templates/governance.crossref.test.ts`

- [ ] **Step 1: Update `commands/wiki-query.md` to define wiki-first behavior precisely**

Add a section named `## Query Order` with this exact logic:

1. Read `docs/wiki/index.md`
2. Read the minimum relevant wiki pages
3. Answer from wiki evidence first
4. Read raw sources only when the wiki is missing or ambiguous
5. Suggest promotion only if the answer adds durable project knowledge

- [ ] **Step 2: Add durable-answer promotion heuristics**

In both the command and skill, define that promotion is appropriate when the answer is:

- likely to be asked again
- explains a decision, process, or recurring pattern
- synthesizes multiple sources into a stable conclusion

Also state that ephemeral one-off troubleshooting notes should go to `docs/wiki/log.md`, not necessarily a formal page.

- [ ] **Step 3: Update `skills/wiki-query/SKILL.md` to separate answering from promotion**

Add two explicit final steps: 6. classify whether the answer is ephemeral or durable 7. if durable, recommend the target page type (`concept`, `decision`, `report`, or `process`)

- [ ] **Step 4: Run cross-reference validation**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit query workflow updates**

```bash
git add commands/wiki-query.md skills/wiki-query/SKILL.md
git commit -m "docs: refine wiki query workflow semantics"
```

---

## Task 5: Strengthen wiki-lint workflow semantics

**Files:**

- Modify: `commands/wiki-lint.md`
- Modify: `skills/wiki-lint/SKILL.md`
- Test: `tests/unit/templates/governance.crossref.test.ts`

- [ ] **Step 1: Expand `commands/wiki-lint.md` into explicit lint categories**

Add categories with expected output sections:

- `orphan_pages`
- `missing_sources`
- `duplicate_topics`
- `weak_cross_links`
- `stale_candidates`

For each category, require affected file paths and a suggested remediation.

- [ ] **Step 2: Expand `skills/wiki-lint/SKILL.md` into a deterministic workflow**

Add this exact sequence:

1. Read `docs/wiki/index.md`
2. Enumerate wiki pages by folder
3. Compare indexed pages to on-disk pages
4. Check frontmatter fields
5. Check link coverage and duplicate concepts
6. Produce a categorized maintenance report

Also add an anti-pattern section forbidding:

- deleting pages during lint
- inventing sources for missing-source pages
- collapsing disputed topics into one “clean” summary without flagging uncertainty

- [ ] **Step 3: Add a recommended output shape to the command doc**

Use this example structure:

```md
## Wiki Lint Report

### orphan_pages

- docs/wiki/concepts/foo.md — not linked from index or related sections

### missing_sources

- docs/wiki/reports/bar.md — frontmatter has no sources field
```

- [ ] **Step 4: Run cross-reference validation**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit lint workflow updates**

```bash
git add commands/wiki-lint.md skills/wiki-lint/SKILL.md
git commit -m "docs: refine wiki lint workflow semantics"
```

---

## Task 6: Final K2 verification and cleanup

**Files:**

- Modify if needed: any K2-touched file to resolve verification findings

- [ ] **Step 1: Run targeted governance suites**

Run: `npx vitest run tests/unit/templates/governance.test.ts tests/unit/templates/governance.crossref.test.ts tests/unit/doctor/self-checks.test.ts`

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

- [ ] **Step 5: Commit any final K2 verification fixes if needed**

```bash
git add .
git commit -m "test: verify knowledge layer workflow rules and docs"
```

Only create this commit if verification required follow-up edits beyond the prior K2 commits.

---

## K2 Scope Guardrails

Do **not** include any of the following in K2:

- `.bbg/knowledge.db`
- SQL knowledge schema
- runtime query index tables
- telemetry/eval automatic compilation
- source hashing
- contradiction registry tables
- layered summaries
- promotion queues or candidate-update storage

K2 is complete once the knowledge workflow conventions are explicit, registered, lintable, and test-verified in the generated scaffold.
