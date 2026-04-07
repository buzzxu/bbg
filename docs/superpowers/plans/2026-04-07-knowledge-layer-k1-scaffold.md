# Knowledge Layer K1 Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first knowledge-layer scaffold to BBG so `bbg init` can generate `docs/raw/` and `docs/wiki/` structure plus the initial wiki ingest/query/lint governance assets for target projects.

**Architecture:** K1 introduces a new governance asset family without adding runtime knowledge compilation yet. The implementation is limited to static scaffold generation: template files, command docs, skill docs, governance manifest registration, self-check coverage, and unit tests that prove the scaffold is installed consistently.

**Tech Stack:** TypeScript, Vitest, Markdown templates, existing governance manifest pipeline

---

## File Structure

### New files

- `commands/wiki-ingest.md` — slash command contract for source-to-wiki ingestion
- `commands/wiki-query.md` — slash command contract for wiki-first question answering
- `commands/wiki-lint.md` — slash command contract for wiki health checks
- `skills/wiki-ingestion/SKILL.md` — workflow skill for ingesting a raw source into the wiki
- `skills/wiki-query/SKILL.md` — workflow skill for wiki-first querying and optional knowledge promotion suggestions
- `skills/wiki-lint/SKILL.md` — workflow skill for detecting orphan/missing-source/stale wiki issues
- `templates/generic/docs/raw/README.md` — explains raw sources as immutable inputs
- `templates/generic/docs/wiki/index.md` — initial wiki catalog scaffold
- `templates/generic/docs/wiki/log.md` — append-only ingest/query/lint log scaffold
- `templates/generic/docs/wiki/concepts/README.md` — concept page guidance
- `templates/generic/docs/wiki/decisions/README.md` — decision page guidance
- `templates/generic/docs/wiki/reports/README.md` — report page guidance
- `templates/generic/docs/wiki/processes/README.md` — process page guidance

### Modified files

- `src/templates/governance.ts` — register new skills, commands, and docs/wiki scaffold files in `buildGovernanceManifest` and `GOVERNANCE_MANIFEST`
- `src/doctor/self-checks.ts` — treat wiki scaffold files as expected governance content and prevent false orphan warnings
- `tests/unit/templates/governance.test.ts` — assert scaffold assets are emitted and update totals
- `tests/unit/templates/governance.crossref.test.ts` — ensure new command/skill related links remain valid
- `tests/unit/doctor/self-checks.test.ts` — add self-check coverage for wiki scaffold registration

### Existing files to inspect while implementing

- `src/commands/init-manifest.ts` — confirm no extra code changes are needed because root templates already concatenate `buildGovernanceManifest()` output
- `README.md` / `AGENTS.md` — optional style references only; no code changes in K1

---

## Task 1: Add wiki command documents

**Files:**

- Create: `commands/wiki-ingest.md`
- Create: `commands/wiki-query.md`
- Create: `commands/wiki-lint.md`
- Test: `tests/unit/templates/governance.crossref.test.ts`

- [ ] **Step 1: Write the failing cross-reference test expectations mentally against current repo state**

K1 relies on the existing `governance.crossref` test to validate `## Related` sections. Before adding files, note that new command docs do not exist yet, so any manifest assertion added later would fail until these files are created.

- [ ] **Step 2: Create `commands/wiki-ingest.md`**

Write a command doc that:

- starts with a title and a short purpose statement
- explains input as one source path under `docs/raw/`
- tells the agent to read the source, update/create wiki pages, update `docs/wiki/index.md`, and append to `docs/wiki/log.md`
- requires explicit source attribution and conflict notes
- includes a `## Related` section with valid relative links

Use this exact related section block at the end:

```md
## Related

- [Wiki Ingestion Skill](../skills/wiki-ingestion/SKILL.md)
- [Wiki Query Command](./wiki-query.md)
- [Wiki Lint Command](./wiki-lint.md)
```

- [ ] **Step 3: Create `commands/wiki-query.md`**

Write a command doc that:

- enforces wiki-first lookup (`docs/wiki/index.md` first, then relevant pages, then raw sources only if needed)
- instructs the agent to cite wiki pages used
- instructs the agent to suggest wiki promotion if the answer has lasting value
- includes a valid `## Related` section

Use this exact related section block:

```md
## Related

- [Wiki Query Skill](../skills/wiki-query/SKILL.md)
- [Wiki Ingest Command](./wiki-ingest.md)
- [Wiki Lint Command](./wiki-lint.md)
```

- [ ] **Step 4: Create `commands/wiki-lint.md`**

Write a command doc that:

- instructs the agent to scan wiki structure for orphan pages, missing sources, stale claims, weak cross-links, and duplicate concepts
- requires a categorized report with actionable fixes
- includes a valid `## Related` section

Use this exact related section block:

```md
## Related

- [Wiki Lint Skill](../skills/wiki-lint/SKILL.md)
- [Wiki Ingest Command](./wiki-ingest.md)
- [Wiki Query Command](./wiki-query.md)
```

- [ ] **Step 5: Run the cross-reference test to verify command docs are structurally valid**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`

Expected: PASS if the new files were written with valid `## Related` links; if it fails, fix the links before continuing.

- [ ] **Step 6: Commit command docs**

```bash
git add commands/wiki-ingest.md commands/wiki-query.md commands/wiki-lint.md
git commit -m "feat: add wiki scaffold governance commands"
```

---

## Task 2: Add wiki skill documents

**Files:**

- Create: `skills/wiki-ingestion/SKILL.md`
- Create: `skills/wiki-query/SKILL.md`
- Create: `skills/wiki-lint/SKILL.md`
- Test: `tests/unit/templates/governance.crossref.test.ts`

- [ ] **Step 1: Create `skills/wiki-ingestion/SKILL.md`**

Write a skill that defines this sequence:

1. Read one raw source from `docs/raw/`
2. Extract durable facts / open questions / conflicts
3. Update or create the right wiki page(s)
4. Update `docs/wiki/index.md`
5. Append an entry to `docs/wiki/log.md`

The skill must explicitly say raw sources are immutable and wiki pages must preserve source attribution.

Use this exact `## Related` block:

```md
## Related

- [Wiki Ingest Command](../../commands/wiki-ingest.md)
- [Wiki Query Skill](../wiki-query/SKILL.md)
- [Wiki Lint Skill](../wiki-lint/SKILL.md)
```

- [ ] **Step 2: Create `skills/wiki-query/SKILL.md`**

Write a skill that defines this sequence:

1. Read `docs/wiki/index.md`
2. Read the minimum relevant wiki pages
3. Answer using wiki-first evidence
4. Read raw sources only if the wiki is insufficient
5. Suggest promoting durable answers back into the wiki when appropriate

Use this exact `## Related` block:

```md
## Related

- [Wiki Query Command](../../commands/wiki-query.md)
- [Wiki Ingestion Skill](../wiki-ingestion/SKILL.md)
- [Wiki Lint Skill](../wiki-lint/SKILL.md)
```

- [ ] **Step 3: Create `skills/wiki-lint/SKILL.md`**

Write a skill that defines this sequence:

1. Scan wiki pages
2. Detect orphan pages
3. Detect pages missing `sources`
4. Detect duplicate concepts or weak linking
5. Produce a categorized maintenance report

Use this exact `## Related` block:

```md
## Related

- [Wiki Lint Command](../../commands/wiki-lint.md)
- [Wiki Ingestion Skill](../wiki-ingestion/SKILL.md)
- [Wiki Query Skill](../wiki-query/SKILL.md)
```

- [ ] **Step 4: Run the cross-reference test to verify skill docs are valid**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit skill docs**

```bash
git add skills/wiki-ingestion/SKILL.md skills/wiki-query/SKILL.md skills/wiki-lint/SKILL.md
git commit -m "feat: add wiki scaffold governance skills"
```

---

## Task 3: Add wiki scaffold template files

**Files:**

- Create: `templates/generic/docs/raw/README.md`
- Create: `templates/generic/docs/wiki/index.md`
- Create: `templates/generic/docs/wiki/log.md`
- Create: `templates/generic/docs/wiki/concepts/README.md`
- Create: `templates/generic/docs/wiki/decisions/README.md`
- Create: `templates/generic/docs/wiki/reports/README.md`
- Create: `templates/generic/docs/wiki/processes/README.md`
- Test: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Create `templates/generic/docs/raw/README.md`**

The file must explain:

- `docs/raw/` stores immutable source material
- agents may read these files but should not rewrite them during ingest/query/lint
- examples of suitable raw sources (PRDs, incident notes, research notes, meeting summaries)

- [ ] **Step 2: Create `templates/generic/docs/wiki/index.md`**

Initialize with a heading and empty category sections:

```md
# Wiki Index

## Concepts

## Decisions

## Reports

## Processes
```

Add short guidance that this file is the canonical wiki entrypoint and should be updated whenever pages are added or renamed.

- [ ] **Step 3: Create `templates/generic/docs/wiki/log.md`**

Initialize with a heading and a short note that the file is append-only and records ingest/query/lint events in chronological order.

- [ ] **Step 4: Create section README templates**

Create these files with concise guidance and a frontmatter example that includes the K1-required fields:

- `templates/generic/docs/wiki/concepts/README.md`
- `templates/generic/docs/wiki/decisions/README.md`
- `templates/generic/docs/wiki/reports/README.md`
- `templates/generic/docs/wiki/processes/README.md`

Use this exact frontmatter example in each file (adjust the `type` value to match the folder):

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

- [ ] **Step 5: Add a first failing manifest test for missing wiki docs**

In `tests/unit/templates/governance.test.ts`, add assertions in the minimal-config test for these new destinations:

```ts
expect(destinations).toContain("docs/raw/README.md");
expect(destinations).toContain("docs/wiki/index.md");
expect(destinations).toContain("docs/wiki/log.md");
expect(destinations).toContain("docs/wiki/concepts/README.md");
expect(destinations).toContain("docs/wiki/decisions/README.md");
expect(destinations).toContain("docs/wiki/reports/README.md");
expect(destinations).toContain("docs/wiki/processes/README.md");
```

Do not implement manifest wiring yet.

- [ ] **Step 6: Run the targeted governance test to verify it fails**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: FAIL because the new wiki scaffold files are not registered yet.

- [ ] **Step 7: Commit template files only after the failing test was observed**

```bash
git add templates/generic/docs/raw/README.md templates/generic/docs/wiki/index.md templates/generic/docs/wiki/log.md templates/generic/docs/wiki/concepts/README.md templates/generic/docs/wiki/decisions/README.md templates/generic/docs/wiki/reports/README.md templates/generic/docs/wiki/processes/README.md tests/unit/templates/governance.test.ts
git commit -m "test: add failing wiki scaffold manifest expectations"
```

---

## Task 4: Register wiki scaffold assets in the governance manifest

**Files:**

- Modify: `src/templates/governance.ts`
- Test: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Add new constant lists near other governance file lists**

In `src/templates/governance.ts`, add these exact constants after `ORG_GOVERNANCE_FILES`:

```ts
const WIKI_SKILLS = ["wiki-ingestion", "wiki-query", "wiki-lint"];

const WIKI_COMMANDS = ["wiki-ingest", "wiki-query", "wiki-lint"];

const WIKI_DOC_FILES = [
  "docs/raw/README.md",
  "docs/wiki/index.md",
  "docs/wiki/log.md",
  "docs/wiki/concepts/README.md",
  "docs/wiki/decisions/README.md",
  "docs/wiki/reports/README.md",
  "docs/wiki/processes/README.md",
];
```

- [ ] **Step 2: Register wiki skills in the skills section**

Change the skills loop from:

```ts
for (const skill of [...CORE_SKILLS, ...OPERATIONS_SKILLS]) {
  tasks.push(copyTask(`skills/${skill}/SKILL.md`, `skills/${skill}/SKILL.md`));
}
```

to:

```ts
for (const skill of [...CORE_SKILLS, ...OPERATIONS_SKILLS, ...WIKI_SKILLS]) {
  tasks.push(copyTask(`skills/${skill}/SKILL.md`, `skills/${skill}/SKILL.md`));
}
```

- [ ] **Step 3: Register wiki commands in the commands section**

Change the commands loop from:

```ts
for (const cmd of CORE_COMMANDS) {
  tasks.push(copyTask(`commands/${cmd}.md`, `commands/${cmd}.md`));
}
```

to:

```ts
for (const cmd of [...CORE_COMMANDS, ...WIKI_COMMANDS]) {
  tasks.push(copyTask(`commands/${cmd}.md`, `commands/${cmd}.md`));
}
```

- [ ] **Step 4: Register wiki scaffold docs near the end of `buildGovernanceManifest`**

Insert this block after the org governance section and before `return mergePluginTemplates(...)`:

```ts
// --- Wiki Scaffold Docs ---
for (const wikiFile of WIKI_DOC_FILES) {
  tasks.push(copyTask(`generic/${wikiFile}`, wikiFile));
}
```

- [ ] **Step 5: Export the wiki lists in `GOVERNANCE_MANIFEST`**

Add these fields to the exported object:

```ts
  wikiSkills: WIKI_SKILLS,
  wikiCommands: WIKI_COMMANDS,
  wikiDocFiles: WIKI_DOC_FILES,
```

- [ ] **Step 6: Update the governance test counts and assertions**

In `tests/unit/templates/governance.test.ts`:

- increase skill count from `46` to `49`
- increase command count from `35` to `38`
- add a wiki docs bucket assertion with expected length `7`
- increase minimal total from `142` to `155`
- increase TypeScript total from `157` to `170`
- increase TS+Python total from `176` to `189`
- increase backend Java total from `161` to `174`

Use a dedicated docs filter such as:

```ts
const wikiDocTasks = tasks.filter(
  (t) => t.destination.startsWith("docs/wiki/") || t.destination === "docs/raw/README.md",
);
expect(wikiDocTasks).toHaveLength(7);
```

- [ ] **Step 7: Run the governance manifest test to verify it passes**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit manifest registration**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register wiki scaffold governance assets"
```

---

## Task 5: Extend self-checks for wiki scaffold files

**Files:**

- Modify: `src/doctor/self-checks.ts`
- Modify: `tests/unit/doctor/self-checks.test.ts`

- [ ] **Step 1: Add wiki skills and wiki commands to orphan detection**

In `checkNoOrphanFiles`, after core/operations skills are added, also add:

```ts
for (const skill of GOVERNANCE_MANIFEST.wikiSkills) {
  allManifestPaths.add(`skills/${skill}/SKILL.md`);
}
```

After core commands are added, also add:

```ts
for (const cmd of GOVERNANCE_MANIFEST.wikiCommands) {
  allManifestPaths.add(`commands/${cmd}.md`);
}
```

- [ ] **Step 2: Add wiki doc files plus wiki command/skill existence checks**

Still in `checkNoOrphanFiles`, add:

```ts
for (const wikiDoc of GOVERNANCE_MANIFEST.wikiDocFiles) {
  allManifestPaths.add(wikiDoc);
}
```

Then in `runSelfChecks`, add dedicated checks after the existing core skills/commands checks and before hooks:

```ts
checks.push(
  await checkFilesExist(packageRoot, "self-wiki-docs-exist", "wiki scaffold", GOVERNANCE_MANIFEST.wikiDocFiles),
);
checks.push(
  await checkFilesExist(
    packageRoot,
    "self-wiki-skills-exist",
    "wiki skill",
    GOVERNANCE_MANIFEST.wikiSkills.map((skill) => `skills/${skill}/SKILL.md`),
  ),
);
checks.push(
  await checkFilesExist(
    packageRoot,
    "self-wiki-commands-exist",
    "wiki command",
    GOVERNANCE_MANIFEST.wikiCommands.map((cmd) => `commands/${cmd}.md`),
  ),
);
```

Update the disk file glob in `checkNoOrphanFiles` from:

```ts
["agents/*.md", "skills/*/SKILL.md", "rules/**/*.md", "commands/*.md"];
```

to:

```ts
["agents/*.md", "skills/*/SKILL.md", "rules/**/*.md", "commands/*.md", "docs/raw/*.md", "docs/wiki/**/*.md"];
```

- [ ] **Step 3: Add a failing self-check test for missing wiki docs**

In `tests/unit/doctor/self-checks.test.ts`, add a new test:

```ts
it("detects missing wiki scaffold files", async () => {
  const root = await makeTempDir();

  const result = await runSelfChecks(root);

  const wikiCheck = result.checks.find((c) => c.id === "self-wiki-docs-exist");
  const wikiSkillsCheck = result.checks.find((c) => c.id === "self-wiki-skills-exist");
  const wikiCommandsCheck = result.checks.find((c) => c.id === "self-wiki-commands-exist");
  expect(wikiCheck).toBeDefined();
  expect(wikiCheck!.passed).toBe(false);
  expect(wikiSkillsCheck).toBeDefined();
  expect(wikiSkillsCheck!.passed).toBe(false);
  expect(wikiCommandsCheck).toBeDefined();
  expect(wikiCommandsCheck!.passed).toBe(false);
});
```

- [ ] **Step 4: Add a passing self-check test with one wiki scaffold file set**

Extend `createMinimalGovernance` to write the wiki scaffold files:

```ts
await writeTextFile(join(root, "docs", "raw", "README.md"), "# Raw Sources\n");
await writeTextFile(join(root, "docs", "wiki", "index.md"), "# Wiki Index\n");
await writeTextFile(join(root, "docs", "wiki", "log.md"), "# Wiki Log\n");
await writeTextFile(join(root, "docs", "wiki", "concepts", "README.md"), "# Concepts\n");
await writeTextFile(join(root, "docs", "wiki", "decisions", "README.md"), "# Decisions\n");
await writeTextFile(join(root, "docs", "wiki", "reports", "README.md"), "# Reports\n");
await writeTextFile(join(root, "docs", "wiki", "processes", "README.md"), "# Processes\n");
await writeTextFile(join(root, "skills", "wiki-ingestion", "SKILL.md"), "# Wiki Ingestion\n\n## Related\n");
await writeTextFile(join(root, "skills", "wiki-query", "SKILL.md"), "# Wiki Query\n\n## Related\n");
await writeTextFile(join(root, "skills", "wiki-lint", "SKILL.md"), "# Wiki Lint\n\n## Related\n");
await writeTextFile(join(root, "commands", "wiki-ingest.md"), "# /wiki-ingest\n\n## Related\n");
await writeTextFile(join(root, "commands", "wiki-query.md"), "# /wiki-query\n\n## Related\n");
await writeTextFile(join(root, "commands", "wiki-lint.md"), "# /wiki-lint\n\n## Related\n");
```

Then in the passing test, assert:

```ts
const wikiCheck = result.checks.find((c) => c.id === "self-wiki-docs-exist");
const wikiSkillsCheck = result.checks.find((c) => c.id === "self-wiki-skills-exist");
const wikiCommandsCheck = result.checks.find((c) => c.id === "self-wiki-commands-exist");
expect(wikiCheck).toBeDefined();
expect(wikiCheck!.passed).toBe(true);
expect(wikiSkillsCheck).toBeDefined();
expect(wikiSkillsCheck!.passed).toBe(true);
expect(wikiCommandsCheck).toBeDefined();
expect(wikiCommandsCheck!.passed).toBe(true);
```

- [ ] **Step 5: Run self-check tests**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit self-check coverage**

```bash
git add src/doctor/self-checks.ts tests/unit/doctor/self-checks.test.ts
git commit -m "test: extend self-check coverage for wiki scaffold assets"
```

---

## Task 6: Final cross-reference and full verification

**Files:**

- Modify if needed: any of the files created above to fix final verification issues

- [ ] **Step 1: Run cross-reference validation again**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`

Expected: PASS.

- [ ] **Step 2: Run the three targeted suites together**

Run: `npx vitest run tests/unit/templates/governance.test.ts tests/unit/templates/governance.crossref.test.ts tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Run full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Commit final K1 verification fixes if needed**

```bash
git add .
git commit -m "test: verify wiki scaffold integration end-to-end"
```

Only create this final commit if verification required follow-up changes beyond the earlier commits.

---

## K1 Scope Guardrails

Do **not** include any of the following in K1:

- `.bbg/knowledge.db`
- SQL schema for knowledge metadata
- automatic telemetry/eval/wiki compilation
- stale detection logic
- contradiction registry
- layered summaries
- runtime command executors beyond documentation/governance assets

K1 is complete once the scaffold is generated, registered, validated, and fully tested.
