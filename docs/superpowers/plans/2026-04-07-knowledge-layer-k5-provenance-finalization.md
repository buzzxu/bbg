# Knowledge Layer K5 Provenance Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize the knowledge layer with provenance, freshness, contradiction tracking, layered summaries, and candidate knowledge promotion so the generated system becomes trustworthy and sustainable over time.

**Architecture:** K5 extends the K3 metadata database and K4 compile/refresh workflows rather than replacing them. Markdown wiki pages remain the human-readable canonical layer, while the structured knowledge DB now tracks source hashes, page freshness, contradictions, layered summaries, query history, and candidate promotions. K5 adds the governance rules and workflows needed to manage trust without making the system fully autonomous.

**Tech Stack:** TypeScript, Vitest, SQLite schema templates, Markdown governance assets, existing K1-K4 knowledge layer scaffolding

---

## File Structure

### New files

- `commands/wiki-audit.md` — deep audit command for provenance, contradictions, and summary completeness
- `commands/wiki-stale.md` — targeted command for stale page and stale source review
- `commands/wiki-promote.md` — command for promoting durable answers/candidate notes into canonical wiki pages
- `skills/wiki-auditor/SKILL.md` — audit workflow for trust/consistency review
- `skills/wiki-provenance/SKILL.md` — provenance workflow for source hashing, freshness, and evidence tracing
- `skills/wiki-distillation/SKILL.md` — workflow for turning durable answers/candidate notes into formal wiki updates
- `templates/generic/.bbg/scripts/knowledge-provenance.sql` — schema extension for K5 trust metadata
- `templates/generic/docs/wiki/processes/knowledge-trust-model.md` — process page describing freshness, contradiction, and promotion decisions

### Modified files

- `templates/generic/.bbg/scripts/knowledge-schema.sql` — extend K3 schema with provenance, contradictions, summaries, query history, and candidate updates
- `templates/generic/.bbg/knowledge/README.md` — explain the new trust-oriented metadata responsibilities
- `commands/wiki-compile.md` — add summary-layer and provenance update expectations
- `commands/wiki-refresh.md` — add freshness and contradiction review expectations
- `commands/wiki-query.md` — add durable answer capture and candidate-update guidance
- `skills/wiki-compilation/SKILL.md` — add summary-layer updates and provenance expectations
- `skills/wiki-maintenance/SKILL.md` — add stale propagation and contradiction review expectations
- `skills/wiki-query/SKILL.md` — add candidate knowledge update creation guidance
- `src/config/schema.ts` — extend `KnowledgeConfig` for freshness/provenance feature switches if needed
- `src/templates/governance.ts` — register K5 commands/skills/process page and provenance SQL asset
- `src/doctor/self-checks.ts` — add K5 assets to expected governance/self-check logic
- `tests/unit/templates/governance.test.ts` — add assertions for K5 assets and updated totals
- `tests/unit/templates/governance.crossref.test.ts` — validate all new related links
- `tests/unit/doctor/self-checks.test.ts` — add self-check coverage for K5 assets

### Existing files to inspect while implementing

- `docs/superpowers/plans/2026-04-07-knowledge-layer-k3-metadata-db.md` — source of truth for existing DB layer before extending it
- `docs/superpowers/plans/2026-04-07-knowledge-layer-k4-runtime-compilation.md` — source of truth for compile/refresh workflow before trust features are added
- `templates/generic/docs/wiki/reports/*.md` — current compiled page examples that K5 will enrich with layered summaries and provenance expectations

---

## Task 1: Extend the knowledge schema for provenance and trust metadata

**Files:**

- Modify: `templates/generic/.bbg/scripts/knowledge-schema.sql`
- Create: `templates/generic/.bbg/scripts/knowledge-provenance.sql`

- [ ] **Step 1: Add freshness and provenance fields to existing K3 tables**

Extend `knowledge_sources` with:

```sql
ALTER TABLE knowledge_sources ADD COLUMN last_seen_hash TEXT;
ALTER TABLE knowledge_sources ADD COLUMN freshness_status TEXT NOT NULL DEFAULT 'current';
ALTER TABLE knowledge_sources ADD COLUMN last_checked_at TEXT;
```

Extend `knowledge_pages` with:

```sql
ALTER TABLE knowledge_pages ADD COLUMN freshness_status TEXT NOT NULL DEFAULT 'current';
ALTER TABLE knowledge_pages ADD COLUMN summary_level TEXT NOT NULL DEFAULT 'L2';
ALTER TABLE knowledge_pages ADD COLUMN stale_reason TEXT;
```

If you prefer not to use `ALTER TABLE` statements inside the base schema file, rewrite the full CREATE TABLE definitions to include these fields directly. Keep the schema idempotent.

- [ ] **Step 2: Add new K5 tables to `knowledge-schema.sql`**

Add these tables:

```sql
CREATE TABLE IF NOT EXISTS knowledge_contradictions (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  page_a_path        TEXT    NOT NULL,
  page_b_path        TEXT    NOT NULL,
  issue_type         TEXT    NOT NULL,
  resolution_status  TEXT    NOT NULL DEFAULT 'open',
  detected_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at        TEXT
);

CREATE TABLE IF NOT EXISTS knowledge_page_summaries (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  page_path          TEXT    NOT NULL,
  summary_level      TEXT    NOT NULL,
  content            TEXT    NOT NULL,
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(page_path, summary_level)
);

CREATE TABLE IF NOT EXISTS knowledge_query_history (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  question           TEXT    NOT NULL,
  matched_pages      TEXT,
  response_kind      TEXT    NOT NULL,
  promoted           INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_candidate_updates (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  source_kind        TEXT    NOT NULL,
  source_ref         TEXT    NOT NULL,
  proposed_page_path TEXT,
  status             TEXT    NOT NULL DEFAULT 'pending',
  rationale          TEXT,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  reviewed_at        TEXT
);
```

- [ ] **Step 3: Add indexes for the new trust tables**

Add:

```sql
CREATE INDEX IF NOT EXISTS idx_knowledge_contradictions_status ON knowledge_contradictions(resolution_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_page_summaries_level ON knowledge_page_summaries(summary_level);
CREATE INDEX IF NOT EXISTS idx_knowledge_candidate_updates_status ON knowledge_candidate_updates(status);
```

- [ ] **Step 4: Create `templates/generic/.bbg/scripts/knowledge-provenance.sql`**

Write a companion SQL file containing example read-only queries for:

- stale pages
- contradictory pages
- missing summary layers
- pending candidate updates

Include at least these query headings as SQL comments:

```sql
-- stale pages
-- open contradictions
-- pages missing summary levels
-- pending candidate promotions
```

- [ ] **Step 5: Review the schema against K5 scope**

Confirm the schema now includes:

- freshness
- contradictions
- summaries
- query history
- candidate updates

and does **not** include:

- vector search
- embeddings
- external service dependencies

- [ ] **Step 6: Commit the schema extension**

```bash
git add templates/generic/.bbg/scripts/knowledge-schema.sql templates/generic/.bbg/scripts/knowledge-provenance.sql
git commit -m "feat: extend knowledge schema with provenance and trust metadata"
```

---

## Task 2: Add K5 commands and skills

**Files:**

- Create: `commands/wiki-audit.md`
- Create: `commands/wiki-stale.md`
- Create: `commands/wiki-promote.md`
- Create: `skills/wiki-auditor/SKILL.md`
- Create: `skills/wiki-provenance/SKILL.md`
- Create: `skills/wiki-distillation/SKILL.md`
- Modify: `commands/wiki-compile.md`
- Modify: `commands/wiki-refresh.md`
- Modify: `commands/wiki-query.md`
- Modify: `skills/wiki-compilation/SKILL.md`
- Modify: `skills/wiki-maintenance/SKILL.md`
- Modify: `skills/wiki-query/SKILL.md`
- Test: `tests/unit/templates/governance.crossref.test.ts`

- [ ] **Step 1: Create `commands/wiki-audit.md`**

The command must instruct the agent to review:

- source freshness
- contradictions
- summary-layer completeness
- pending candidate updates

Use this exact related section:

```md
## Related

- [Wiki Auditor Skill](../skills/wiki-auditor/SKILL.md)
- [Wiki Stale Command](./wiki-stale.md)
- [Wiki Promote Command](./wiki-promote.md)
```

- [ ] **Step 2: Create `commands/wiki-stale.md`**

The command must focus on:

- pages whose sources changed
- stale pages lacking review
- unresolved stale reasons

Use this exact related section:

```md
## Related

- [Wiki Provenance Skill](../skills/wiki-provenance/SKILL.md)
- [Wiki Audit Command](./wiki-audit.md)
- [Wiki Refresh Command](./wiki-refresh.md)
```

- [ ] **Step 3: Create `commands/wiki-promote.md`**

The command must describe turning a durable answer or candidate update into a canonical wiki change.

Use this exact related section:

```md
## Related

- [Wiki Distillation Skill](../skills/wiki-distillation/SKILL.md)
- [Wiki Query Command](./wiki-query.md)
- [Wiki Compile Command](./wiki-compile.md)
```

- [ ] **Step 4: Create `skills/wiki-auditor/SKILL.md`**

Define a workflow that:

1. reads trust metadata
2. reviews stale pages
3. reviews contradictions
4. checks summary coverage
5. outputs a prioritized audit report

- [ ] **Step 5: Create `skills/wiki-provenance/SKILL.md`**

Define a workflow that:

1. compares source changes
2. updates freshness status
3. traces evidence from wiki page to sources
4. flags stale pages and unresolved evidence gaps

- [ ] **Step 6: Create `skills/wiki-distillation/SKILL.md`**

Define a workflow that:

1. reviews durable answers/candidate updates
2. chooses target page type
3. updates or creates canonical wiki pages
4. updates summaries and provenance links
5. records promotion outcome

- [ ] **Step 7: Update existing compile/refresh/query docs and skills**

Add these K5 expectations:

- `wiki-compile` updates summary layers when significant pages change
- `wiki-refresh` reviews freshness and contradiction state
- `wiki-query` can create candidate updates rather than forcing immediate promotion
- `wiki-compilation` updates L0/L1/L2 summaries as needed
- `wiki-maintenance` records stale reasons and contradiction review actions
- `wiki-query` logs durable-answer candidates for later promotion

- [ ] **Step 8: Run cross-reference validation**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit K5 commands and skills**

```bash
git add commands/wiki-audit.md commands/wiki-stale.md commands/wiki-promote.md skills/wiki-auditor/SKILL.md skills/wiki-provenance/SKILL.md skills/wiki-distillation/SKILL.md commands/wiki-compile.md commands/wiki-refresh.md commands/wiki-query.md skills/wiki-compilation/SKILL.md skills/wiki-maintenance/SKILL.md skills/wiki-query/SKILL.md
git commit -m "feat: add knowledge provenance and promotion workflows"
```

---

## Task 3: Add the knowledge trust process page and README guidance

**Files:**

- Create: `templates/generic/docs/wiki/processes/knowledge-trust-model.md`
- Modify: `templates/generic/.bbg/knowledge/README.md`
- Modify: `templates/generic/docs/wiki/processes/knowledge-compilation.md`

- [ ] **Step 1: Create `templates/generic/docs/wiki/processes/knowledge-trust-model.md`**

Use frontmatter:

```md
---
title: Knowledge Trust Model
type: process
status: active
sources:
  - .bbg/scripts/knowledge-schema.sql
  - .bbg/scripts/knowledge-provenance.sql
last_updated: 2026-04-07
tags:
  - knowledge
  - trust
  - provenance
related:
  - docs/wiki/processes/knowledge-compilation.md
---
```

Body sections:

- `# Knowledge Trust Model`
- `## Freshness`
- `## Contradictions`
- `## Summary Layers`
- `## Promotion Decisions`

- [ ] **Step 2: Extend `templates/generic/.bbg/knowledge/README.md`**

Add a section describing:

- source hashing
- freshness status
- contradiction registry
- summary layers
- candidate promotion records

Also explain that the DB is support infrastructure for trust, not a replacement for `docs/wiki/`.

- [ ] **Step 3: Update `templates/generic/docs/wiki/processes/knowledge-compilation.md`**

Add explicit references to:

- summary layer updates
- freshness review during refresh
- candidate promotion instead of immediate canonical edits when confidence is low

- [ ] **Step 4: Review for K5 terminology consistency**

Ensure these terms are used consistently:

- `freshness_status`
- `contradiction`
- `summary layer`
- `candidate update`
- `promotion`

- [ ] **Step 5: Commit process docs**

```bash
git add templates/generic/docs/wiki/processes/knowledge-trust-model.md templates/generic/.bbg/knowledge/README.md templates/generic/docs/wiki/processes/knowledge-compilation.md
git commit -m "docs: add knowledge trust model guidance"
```

---

## Task 4: Register K5 assets in the governance manifest

**Files:**

- Modify: `src/templates/governance.ts`
- Modify: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Add K5 manifest constants**

In `src/templates/governance.ts`, add:

```ts
const WIKI_TRUST_SKILLS = ["wiki-auditor", "wiki-provenance", "wiki-distillation"];

const WIKI_TRUST_COMMANDS = ["wiki-audit", "wiki-stale", "wiki-promote"];

const WIKI_TRUST_DOC_FILES = ["docs/wiki/processes/knowledge-trust-model.md"];

const KNOWLEDGE_PROVENANCE_SCRIPTS = ["knowledge-provenance.sql"];
```

- [ ] **Step 2: Register the K5 skills and commands**

Extend the skills/commands loops to include `...WIKI_TRUST_SKILLS` and `...WIKI_TRUST_COMMANDS`.

- [ ] **Step 3: Register the trust process doc and provenance script**

Add blocks that copy:

- `generic/docs/wiki/processes/knowledge-trust-model.md` → `docs/wiki/processes/knowledge-trust-model.md`
- `generic/.bbg/scripts/knowledge-provenance.sql` → `.bbg/scripts/knowledge-provenance.sql`

- [ ] **Step 4: Export the K5 categories in `GOVERNANCE_MANIFEST`**

Add:

```ts
  wikiTrustSkills: WIKI_TRUST_SKILLS,
  wikiTrustCommands: WIKI_TRUST_COMMANDS,
  wikiTrustDocFiles: WIKI_TRUST_DOC_FILES,
  knowledgeProvenanceScripts: KNOWLEDGE_PROVENANCE_SCRIPTS,
```

- [ ] **Step 5: Add failing governance test expectations before implementation if not already done**

In `tests/unit/templates/governance.test.ts`, add assertions for:

```ts
expect(destinations).toContain("skills/wiki-auditor/SKILL.md");
expect(destinations).toContain("skills/wiki-provenance/SKILL.md");
expect(destinations).toContain("skills/wiki-distillation/SKILL.md");
expect(destinations).toContain("commands/wiki-audit.md");
expect(destinations).toContain("commands/wiki-stale.md");
expect(destinations).toContain("commands/wiki-promote.md");
expect(destinations).toContain("docs/wiki/processes/knowledge-trust-model.md");
expect(destinations).toContain(".bbg/scripts/knowledge-provenance.sql");
```

Update totals by `+8` in each existing scenario.

Assuming K4 is complete, set totals to:

- minimal config: `166 -> 174`
- TypeScript config: `181 -> 189`
- TS+Python config: `200 -> 208`
- backend Java config: `185 -> 193`

- [ ] **Step 6: Run the governance manifest test**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit manifest registration**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register knowledge trust and provenance assets"
```

---

## Task 5: Extend self-check coverage for K5 trust assets

**Files:**

- Modify: `src/doctor/self-checks.ts`
- Modify: `tests/unit/doctor/self-checks.test.ts`

- [ ] **Step 1: Add K5 trust skills/commands/docs/scripts to orphan detection**

In `checkNoOrphanFiles`, add loops for:

```ts
for (const skill of GOVERNANCE_MANIFEST.wikiTrustSkills) {
  allManifestPaths.add(`skills/${skill}/SKILL.md`);
}
for (const cmd of GOVERNANCE_MANIFEST.wikiTrustCommands) {
  allManifestPaths.add(`commands/${cmd}.md`);
}
for (const file of GOVERNANCE_MANIFEST.wikiTrustDocFiles) {
  allManifestPaths.add(file);
}
for (const script of GOVERNANCE_MANIFEST.knowledgeProvenanceScripts) {
  allManifestPaths.add(`.bbg/scripts/${script}`);
}
```

- [ ] **Step 2: Add dedicated self-checks in `runSelfChecks`**

Add file/script existence checks similar to K3/K4:

```ts
checks.push(
  await checkFilesExist(
    packageRoot,
    "self-wiki-trust-skills-exist",
    "wiki trust skill",
    GOVERNANCE_MANIFEST.wikiTrustSkills.map((skill) => `skills/${skill}/SKILL.md`),
  ),
);

checks.push(
  await checkFilesExist(
    packageRoot,
    "self-wiki-trust-commands-exist",
    "wiki trust command",
    GOVERNANCE_MANIFEST.wikiTrustCommands.map((cmd) => `commands/${cmd}.md`),
  ),
);

checks.push(
  await checkFilesExist(
    packageRoot,
    "self-wiki-trust-docs-exist",
    "wiki trust doc",
    GOVERNANCE_MANIFEST.wikiTrustDocFiles,
  ),
);

checks.push(
  await checkFilesExist(
    packageRoot,
    "self-knowledge-provenance-scripts-exist",
    "knowledge provenance script",
    GOVERNANCE_MANIFEST.knowledgeProvenanceScripts.map((s) => `.bbg/scripts/${s}`),
  ),
);
```

- [ ] **Step 3: Extend `createMinimalGovernance()` fixture**

Add writes for:

```ts
await writeTextFile(join(root, "commands", "wiki-audit.md"), "# /wiki-audit\n\n## Related\n");
await writeTextFile(join(root, "commands", "wiki-stale.md"), "# /wiki-stale\n\n## Related\n");
await writeTextFile(join(root, "commands", "wiki-promote.md"), "# /wiki-promote\n\n## Related\n");
await writeTextFile(join(root, "skills", "wiki-auditor", "SKILL.md"), "# Wiki Auditor\n\n## Related\n");
await writeTextFile(join(root, "skills", "wiki-provenance", "SKILL.md"), "# Wiki Provenance\n\n## Related\n");
await writeTextFile(join(root, "skills", "wiki-distillation", "SKILL.md"), "# Wiki Distillation\n\n## Related\n");
await writeTextFile(join(root, "docs", "wiki", "processes", "knowledge-trust-model.md"), "# Knowledge Trust Model\n");
await writeTextFile(join(root, ".bbg", "scripts", "knowledge-provenance.sql"), "-- stale pages\n");
```

- [ ] **Step 4: Add a targeted self-check test for K5 trust assets**

Add a test that verifies:

- `self-wiki-trust-skills-exist` fails on an empty root and passes with the fixture
- `self-wiki-trust-commands-exist` fails on an empty root and passes with the fixture
- `self-wiki-trust-docs-exist` fails on an empty root and passes with the fixture
- `self-knowledge-provenance-scripts-exist` fails on an empty root and passes with the fixture

- [ ] **Step 5: Run the self-check suite**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit self-check support**

```bash
git add src/doctor/self-checks.ts tests/unit/doctor/self-checks.test.ts
git commit -m "test: add self-check coverage for knowledge trust assets"
```

---

## Task 6: Final K5 verification

**Files:**

- Modify if needed: any K5-touched file to resolve verification issues

- [ ] **Step 1: Run targeted suites**

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

- [ ] **Step 5: Commit any final K5 verification fixes if needed**

```bash
git add .
git commit -m "test: verify knowledge trust and provenance integration"
```

Only create this commit if verification required follow-up edits beyond the earlier K5 commits.

---

## K5 Scope Guardrails

Do **not** include any of the following in K5:

- vector embeddings or semantic search engines
- external provenance services
- fully automatic self-editing wiki agents that bypass review
- force-promotion of every durable answer into canonical docs
- opaque trust scores without source evidence

K5 is complete once provenance, freshness, contradiction tracking, layered summaries, and candidate-promotion workflows are present as governed assets and are fully integrated into manifest, self-check, and test coverage.
