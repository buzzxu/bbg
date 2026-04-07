# Knowledge Layer K3 Metadata DB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the structured metadata layer for the knowledge system by generating a Markdown-first but SQLite-backed knowledge scaffold (`.bbg/knowledge.db` + schema assets) without changing K1/K2’s wiki-first interaction model.

**Architecture:** K3 introduces a lightweight runtime metadata store that tracks knowledge sources, wiki pages, source-page relationships, and lint findings. Markdown remains the human-readable canonical layer under `docs/wiki/`, while `.bbg/knowledge/` and `.bbg/scripts/knowledge-schema.sql` provide an optional structured index for future freshness, contradiction, and compilation features in K4/K5. K3 only scaffolds this metadata layer; it does not require compile/refresh workflows to populate it yet.

**Tech Stack:** TypeScript, Vitest, SQLite schema templates, governance manifest pipeline, BBG config schema

---

## File Structure

### New files

- `templates/generic/.bbg/knowledge/README.md` — explains the role of the structured knowledge metadata layer and how it relates to `docs/raw/` and `docs/wiki/`
- `templates/generic/.bbg/scripts/knowledge-schema.sql` — SQLite schema for sources, pages, page-source relationships, and lint findings

### Modified files

- `src/config/schema.ts` — add optional knowledge runtime configuration to `BbgConfig`
- `src/templates/governance.ts` — register the knowledge schema script and `.bbg/knowledge/README.md`, and export them in `GOVERNANCE_MANIFEST`
- `src/doctor/self-checks.ts` — treat the new knowledge assets as expected governance content and prevent orphan false positives
- `tests/unit/templates/governance.test.ts` — add assertions for the knowledge script and README and update totals
- `tests/unit/doctor/self-checks.test.ts` — add self-check coverage for the knowledge assets
- `tests/unit/runtime/schema.test.ts` — extend default runtime config coverage for the new knowledge paths if runtime config is expanded there

### Existing files to inspect while implementing

- `docs/superpowers/plans/2026-04-07-knowledge-layer-k1-scaffold.md` — K1 scaffold assets that K3 must not break
- `docs/superpowers/plans/2026-04-07-knowledge-layer-k2-workflows.md` — K2 semantic contract that K3 stores metadata for
- `src/runtime/schema.ts` — inspect if runtime config helpers should include a knowledge section for path defaults

---

## Task 1: Add knowledge metadata scaffold files

**Files:**

- Create: `templates/generic/.bbg/knowledge/README.md`
- Create: `templates/generic/.bbg/scripts/knowledge-schema.sql`

- [ ] **Step 1: Create `templates/generic/.bbg/knowledge/README.md`**

Write a README that explains:

- `docs/raw/` is the immutable source layer
- `docs/wiki/` is the human-readable knowledge layer
- `.bbg/knowledge.db` is a structured helper index, not the canonical content store
- future workflows may record source/page relationships and lint findings here

The README must explicitly state that teams should not hand-edit the database file directly.

- [ ] **Step 2: Create `templates/generic/.bbg/scripts/knowledge-schema.sql`**

Add a SQLite schema with these four tables exactly:

```sql
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  path          TEXT    NOT NULL UNIQUE,
  source_type   TEXT    NOT NULL,
  title         TEXT,
  content_hash  TEXT,
  status        TEXT    NOT NULL DEFAULT 'active',
  ingested_at   TEXT,
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_pages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  path          TEXT    NOT NULL UNIQUE,
  page_type     TEXT    NOT NULL,
  title         TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'active',
  source_count  INTEGER NOT NULL DEFAULT 0,
  last_updated  TEXT,
  indexed_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_page_sources (
  page_id       INTEGER NOT NULL,
  source_id     INTEGER NOT NULL,
  linked_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (page_id, source_id),
  FOREIGN KEY (page_id) REFERENCES knowledge_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_lint_findings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  finding_type  TEXT    NOT NULL,
  path          TEXT    NOT NULL,
  severity      TEXT    NOT NULL,
  message       TEXT    NOT NULL,
  detected_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at   TEXT
);
```

Add indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_status ON knowledge_sources(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_type ON knowledge_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_lint_findings_type ON knowledge_lint_findings(finding_type);
```

- [ ] **Step 3: Review the SQL schema for K3 scope discipline**

Confirm the schema does **not** contain:

- contradiction tables
- summary-layer tables
- candidate update queues
- query history tables

`content_hash` is allowed in K3 only as a reserved foundation field. K3 does not yet assign freshness/provenance behavior to it; that begins in K5.

Those richer behaviors belong to K5, not K3.

- [ ] **Step 4: Commit the new scaffold files**

```bash
git add templates/generic/.bbg/knowledge/README.md templates/generic/.bbg/scripts/knowledge-schema.sql
git commit -m "feat: add knowledge metadata scaffold assets"
```

---

## Task 2: Add knowledge configuration shape

**Files:**

- Modify: `src/config/schema.ts`
- Test: `tests/unit/runtime/schema.test.ts`

- [ ] **Step 1: Add a `KnowledgeConfig` interface to `src/config/schema.ts`**

Insert this interface after `OrganizationConfig`:

```ts
export interface KnowledgeConfig {
  enabled?: boolean;
  databaseFile?: string;
  sourceRoot?: string;
  wikiRoot?: string;
}
```

- [ ] **Step 2: Extend `BbgConfig` with optional `knowledge`**

Add this property near `runtime`, `plugins`, and `organization`:

```ts
  knowledge?: KnowledgeConfig;
```

- [ ] **Step 3: Inspect `src/runtime/schema.ts` and decide whether runtime defaults should be extended now**

If `src/runtime/schema.ts` already owns generated runtime path defaults in a coherent way, extend it with a `knowledge` section. If not, keep the change constrained to `src/config/schema.ts` for K3 and note that deeper runtime wiring belongs to K4.

- [ ] **Step 4: If runtime defaults are extended, update `tests/unit/runtime/schema.test.ts`**

If you add a runtime knowledge section, update the expected default object with:

```ts
knowledge: {
  enabled: true,
  databaseFile: ".bbg/knowledge.db",
  sourceRoot: "docs/raw",
  wikiRoot: "docs/wiki",
},
```

If you do **not** extend runtime defaults in K3, do not touch this test.

- [ ] **Step 5: Run the relevant schema test surface**

Run one of the following depending on your implementation choice:

```bash
npx vitest run tests/unit/runtime/schema.test.ts
```

or, if only config typing changed and runtime defaults were left alone:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit the config schema changes**

```bash
git add src/config/schema.ts tests/unit/runtime/schema.test.ts
git commit -m "feat: add knowledge metadata config shape"
```

If `tests/unit/runtime/schema.test.ts` was not changed, omit it from `git add`.

---

## Task 3: Register knowledge metadata assets in the governance manifest

**Files:**

- Modify: `src/templates/governance.ts`
- Modify: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Add new manifest constants in `src/templates/governance.ts`**

After `ORG_GOVERNANCE_FILES`, add:

```ts
const KNOWLEDGE_FILES = [".bbg/knowledge/README.md"];

const KNOWLEDGE_SCRIPTS = ["knowledge-schema.sql"];
```

- [ ] **Step 2: Register the knowledge README file in `buildGovernanceManifest`**

Add this block after the org governance block and before the BBG scripts block:

```ts
// --- Knowledge Metadata Files ---
for (const file of KNOWLEDGE_FILES) {
  tasks.push(copyTask(`generic/${file}`, file));
}
```

- [ ] **Step 3: Register the knowledge SQL script through the `.bbg/scripts/` pattern**

Add this block immediately after the existing `BBG_SCRIPTS` loop or directly before it if you prefer grouping:

```ts
// --- Knowledge Scripts ---
for (const script of KNOWLEDGE_SCRIPTS) {
  tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
}
```

Do **not** merge it into `BBG_SCRIPTS` in K3; keep it as a separate manifest category so later K4/K5 work can reason about knowledge assets distinctly.

- [ ] **Step 4: Export the new categories in `GOVERNANCE_MANIFEST`**

Add:

```ts
  knowledgeFiles: KNOWLEDGE_FILES,
  knowledgeScripts: KNOWLEDGE_SCRIPTS,
```

- [ ] **Step 5: Add failing test expectations before implementation if you have not already edited the manifest**

In `tests/unit/templates/governance.test.ts`, add these minimal-config assertions:

```ts
expect(destinations).toContain(".bbg/knowledge/README.md");
expect(destinations).toContain(".bbg/scripts/knowledge-schema.sql");
```

Then update the counts by `+2` in every existing scenario:

- minimal config: `156 -> 158`
- TypeScript config: `171 -> 173`
- TS+Python config: `190 -> 192`
- backend Java config: `175 -> 177`

Add a dedicated bucket assertion such as:

```ts
const knowledgeTasks = tasks.filter(
  (t) => t.destination === ".bbg/knowledge/README.md" || t.destination === ".bbg/scripts/knowledge-schema.sql",
);
expect(knowledgeTasks).toHaveLength(2);
```

- [ ] **Step 6: Run the governance test to verify the new assets are fully registered**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit manifest registration**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register knowledge metadata scaffold in governance manifest"
```

---

## Task 4: Extend self-check coverage for knowledge assets

**Files:**

- Modify: `src/doctor/self-checks.ts`
- Modify: `tests/unit/doctor/self-checks.test.ts`

- [ ] **Step 1: Add knowledge files and scripts to orphan detection**

In `checkNoOrphanFiles`, add:

```ts
for (const file of GOVERNANCE_MANIFEST.knowledgeFiles) {
  allManifestPaths.add(file);
}
for (const script of GOVERNANCE_MANIFEST.knowledgeScripts) {
  allManifestPaths.add(`.bbg/scripts/${script}`);
}
```

- [ ] **Step 2: Add dedicated file-existence checks in `runSelfChecks`**

After the wiki docs check (from K1/K2), add:

```ts
checks.push(
  await checkFilesExist(
    packageRoot,
    "self-knowledge-files-exist",
    "knowledge metadata",
    GOVERNANCE_MANIFEST.knowledgeFiles,
  ),
);
```

And add a script check:

```ts
checks.push(
  await checkFilesExist(
    packageRoot,
    "self-knowledge-scripts-exist",
    "knowledge script",
    GOVERNANCE_MANIFEST.knowledgeScripts.map((s) => `.bbg/scripts/${s}`),
  ),
);
```

- [ ] **Step 3: Expand the orphan file glob to include `.bbg/knowledge` and `.bbg/scripts` SQL assets**

Update the disk file glob in `checkNoOrphanFiles` to include:

```ts
".bbg/knowledge/*.md",
".bbg/scripts/*.sql",
```

- [ ] **Step 4: Add failing self-check tests for missing knowledge assets**

In `tests/unit/doctor/self-checks.test.ts`, add:

```ts
it("detects missing knowledge metadata files", async () => {
  const root = await makeTempDir();

  const result = await runSelfChecks(root);

  const filesCheck = result.checks.find((c) => c.id === "self-knowledge-files-exist");
  const scriptsCheck = result.checks.find((c) => c.id === "self-knowledge-scripts-exist");

  expect(filesCheck).toBeDefined();
  expect(filesCheck!.passed).toBe(false);
  expect(scriptsCheck).toBeDefined();
  expect(scriptsCheck!.passed).toBe(false);
});
```

- [ ] **Step 5: Extend `createMinimalGovernance()` to include the knowledge assets**

Add:

```ts
await writeTextFile(join(root, ".bbg", "knowledge", "README.md"), "# Knowledge Metadata\n");
await writeTextFile(
  join(root, ".bbg", "scripts", "knowledge-schema.sql"),
  "CREATE TABLE IF NOT EXISTS knowledge_sources (id INTEGER);\n",
);
```

Then in the passing path, assert both checks pass.

- [ ] **Step 6: Run the self-check test suite**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit self-check support**

```bash
git add src/doctor/self-checks.ts tests/unit/doctor/self-checks.test.ts
git commit -m "test: add self-check coverage for knowledge metadata assets"
```

---

## Task 5: Final K3 verification

**Files:**

- Modify if needed: any K3-touched files to fix verification issues

- [ ] **Step 1: Run targeted suites**

Run: `npx vitest run tests/unit/templates/governance.test.ts tests/unit/doctor/self-checks.test.ts tests/unit/runtime/schema.test.ts`

Expected: PASS for the tests you actually changed. If `tests/unit/runtime/schema.test.ts` was intentionally untouched because runtime defaults were not expanded, you may omit it from this command.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit any final K3 verification fixes if needed**

```bash
git add .
git commit -m "test: verify knowledge metadata scaffold integration"
```

Only create this final commit if verification required follow-up edits beyond the earlier K3 commits.

---

## K3 Scope Guardrails

Do **not** include any of the following in K3:

- automatic wiki compilation from telemetry/eval/workflow/red-team outputs
- query history storage
- contradiction registry tables
- freshness state propagation logic
- layered summary tables
- candidate promotion queues
- runtime command executors that actively write to `.bbg/knowledge.db`

K3 is complete once the metadata scaffold exists, is generated by BBG, is represented in config/manifest/self-check/test coverage, and is ready for K4 integration work.
