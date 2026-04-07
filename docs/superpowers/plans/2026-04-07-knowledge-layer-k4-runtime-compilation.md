# Knowledge Layer K4 Runtime Compilation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the knowledge layer to existing BBG runtime outputs by adding compile/refresh governance workflows that turn telemetry, eval, workflow, and red-team results into maintainable wiki reports.

**Architecture:** K4 does not yet make knowledge compilation fully automatic. Instead, it adds explicit governance entrypoints (`/wiki-compile`, `/wiki-refresh`) and companion skills that compile existing runtime outputs into durable wiki pages under `docs/wiki/reports/` and `docs/wiki/processes/`. The knowledge database introduced in K3 remains a helper index reserved for later structured synchronization; K4 still treats Markdown wiki pages as the primary human-readable artifact and does not require the DB to be populated.

**Tech Stack:** TypeScript, Vitest, Markdown governance assets, existing telemetry/eval/workflow/red-team scaffolds, K3 knowledge metadata foundation

---

## File Structure

### New files

- `commands/wiki-compile.md` — command contract for compiling runtime outputs into wiki pages
- `commands/wiki-refresh.md` — command contract for refreshing stale wiki pages from newer runtime outputs
- `skills/wiki-compilation/SKILL.md` — skill describing report-oriented compilation from runtime artifacts into wiki pages
- `skills/wiki-maintenance/SKILL.md` — skill describing recompile/refresh decisions, stale handling, and incremental updates
- `templates/generic/docs/wiki/reports/regression-risk-summary.md` — starter report page for eval-derived regression patterns
- `templates/generic/docs/wiki/reports/workflow-stability-summary.md` — starter report page for workflow/telemetry stability patterns
- `templates/generic/docs/wiki/reports/red-team-findings-summary.md` — starter report page for backend red-team recurring findings
- `templates/generic/docs/wiki/processes/knowledge-compilation.md` — process page describing how runtime artifacts become wiki knowledge

### Modified files

- `src/templates/governance.ts` — register new compile/refresh commands, skills, and starter wiki pages
- `src/doctor/self-checks.ts` — include the new starter report/process pages and commands/skills in expected governance content
- `tests/unit/templates/governance.test.ts` — assert K4 compile assets and update totals
- `tests/unit/templates/governance.crossref.test.ts` — validate related links for the new compile/refresh assets
- `tests/unit/doctor/self-checks.test.ts` — cover K4 assets in self-check expectations
- `commands/wiki-query.md` — add note that compiled report pages are preferred evidence when present
- `skills/wiki-query/SKILL.md` — same behavioral refinement for compiled pages

### Existing files to inspect while implementing

- `skills/telemetry-dashboard/SKILL.md` — source pattern for telemetry-backed reports
- `commands/eval-compare.md` — source pattern for eval result interpretation
- `skills/workflow-orchestration/SKILL.md` — source pattern for workflow-state summaries
- `skills/red-team-test/SKILL.md` — source pattern for backend security findings
- `docs/superpowers/plans/2026-04-07-knowledge-layer-k3-metadata-db.md` — K3 metadata boundary that K4 must build on without jumping to K5 provenance features

---

## Task 1: Add wiki compile and refresh command documents

**Files:**

- Create: `commands/wiki-compile.md`
- Create: `commands/wiki-refresh.md`
- Modify: `commands/wiki-query.md`
- Test: `tests/unit/templates/governance.crossref.test.ts`

- [ ] **Step 1: Create `commands/wiki-compile.md`**

Write a command doc that describes a manual compilation workflow from runtime outputs into wiki pages.

It must state that compilation may use these input sources:

- telemetry summaries or exported SQL report output
- eval comparison output or saved eval report artifacts
- workflow summaries or workflow report artifacts
- red-team reports

Also state explicitly that generator-owned files such as `.bbg/scripts/*.sql` are scaffolding inputs/tools, not the compiled evidence artifacts themselves.

It must require this output contract:

- identify the source artifacts used
- update one or more report/process pages under `docs/wiki/`
- update `docs/wiki/index.md`
- append `docs/wiki/log.md`
- preserve or update frontmatter `sources`

Use this exact related section:

```md
## Related

- [Wiki Compilation Skill](../skills/wiki-compilation/SKILL.md)
- [Wiki Refresh Command](./wiki-refresh.md)
- [Wiki Query Command](./wiki-query.md)
```

- [ ] **Step 2: Create `commands/wiki-refresh.md`**

Write a command doc that distinguishes refresh from ingest:

- refresh updates existing canonical wiki pages from newer runtime evidence
- refresh should prefer updating report/process pages in place
- refresh should mark pages `stale` or `superseded` when appropriate

Use this exact related section:

```md
## Related

- [Wiki Maintenance Skill](../skills/wiki-maintenance/SKILL.md)
- [Wiki Compile Command](./wiki-compile.md)
- [Wiki Lint Command](./wiki-lint.md)
```

- [ ] **Step 3: Update `commands/wiki-query.md` to prefer compiled report pages when present**

Add a note in the query order section that report/process pages created by `/wiki-compile` and `/wiki-refresh` should be preferred over raw telemetry/eval outputs whenever they are not marked `stale` or `superseded`.

- [ ] **Step 4: Run cross-reference validation**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit command docs**

```bash
git add commands/wiki-compile.md commands/wiki-refresh.md commands/wiki-query.md
git commit -m "feat: add wiki compile and refresh commands"
```

---

## Task 2: Add wiki compilation and maintenance skills

**Files:**

- Create: `skills/wiki-compilation/SKILL.md`
- Create: `skills/wiki-maintenance/SKILL.md`
- Modify: `skills/wiki-query/SKILL.md`
- Test: `tests/unit/templates/governance.crossref.test.ts`

- [ ] **Step 1: Create `skills/wiki-compilation/SKILL.md`**

Write a skill that defines this sequence:

1. Select one or more runtime artifacts
2. Read the current wiki index and any relevant report/process pages
3. Synthesize a stable summary from runtime outputs
4. Update or create the target wiki report/process page
5. Update `index.md` and append `log.md`

It must explicitly say that compile inputs are derivative artifacts, not raw sources, and must still be listed in `sources`.

Use this exact related section:

```md
## Related

- [Wiki Compile Command](../../commands/wiki-compile.md)
- [Wiki Maintenance Skill](../wiki-maintenance/SKILL.md)
- [Telemetry Dashboard](../telemetry-dashboard/SKILL.md)
```

- [ ] **Step 2: Create `skills/wiki-maintenance/SKILL.md`**

Write a skill that defines this sequence:

1. Identify candidate wiki pages for refresh
2. Compare current page scope against newer runtime artifacts
3. Update in place if the page remains canonical
4. Mark `stale` or `superseded` when the page no longer reflects current evidence
5. Record updates in `log.md`

Use this exact related section:

```md
## Related

- [Wiki Refresh Command](../../commands/wiki-refresh.md)
- [Wiki Lint Skill](../wiki-lint/SKILL.md)
- [Wiki Compilation Skill](../wiki-compilation/SKILL.md)
```

- [ ] **Step 3: Update `skills/wiki-query/SKILL.md` with compiled-page preference**

Add a rule that when a relevant compiled report/process page already exists, the agent should use it before reopening lower-level telemetry/eval/workflow/red-team artifacts unless the page is marked `stale` or `superseded`.

- [ ] **Step 4: Run cross-reference validation**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit skill docs**

```bash
git add skills/wiki-compilation/SKILL.md skills/wiki-maintenance/SKILL.md skills/wiki-query/SKILL.md
git commit -m "feat: add wiki compilation and maintenance skills"
```

---

## Task 3: Add starter compiled wiki pages

**Files:**

- Create: `templates/generic/docs/wiki/reports/regression-risk-summary.md`
- Create: `templates/generic/docs/wiki/reports/workflow-stability-summary.md`
- Create: `templates/generic/docs/wiki/reports/red-team-findings-summary.md`
- Create: `templates/generic/docs/wiki/processes/knowledge-compilation.md`

These files are **starter canonical pages / seed pages**. `/wiki-compile` and `/wiki-refresh` own later updates to them (or creation of adjacent pages), but K4 seeds the initial stable destinations.

- [ ] **Step 1: Create `templates/generic/docs/wiki/reports/regression-risk-summary.md`**

Add a starter page with frontmatter:

```md
---
title: Regression Risk Summary
type: report
status: draft
sources:
  - evals/golden-tasks/manifest.json
last_updated: 2026-04-07
tags:
  - evaluation
  - regression
related:
  - docs/wiki/index.md
---
```

Body sections:

- `# Regression Risk Summary`
- `## Current Signals`
- `## Regressions To Watch`
- `## Follow-up Actions`

- [ ] **Step 2: Create `templates/generic/docs/wiki/reports/workflow-stability-summary.md`**

Use frontmatter with `type: report`, `status: draft`, and sources that reference telemetry/workflow report artifacts or documented report-generation inputs. Do **not** treat `.bbg/scripts/*.sql` schema/setup files themselves as the compiled evidence output.

Body sections:

- `# Workflow Stability Summary`
- `## Workflow Health`
- `## Bottlenecks`
- `## Recommended Improvements`

- [ ] **Step 3: Create `templates/generic/docs/wiki/reports/red-team-findings-summary.md`**

Use frontmatter with sources referencing backend red-team playbook/report template artifacts.

Body sections:

- `# Red Team Findings Summary`
- `## Current Risk Areas`
- `## Recurring Weaknesses`
- `## Mitigation Priorities`

- [ ] **Step 4: Create `templates/generic/docs/wiki/processes/knowledge-compilation.md`**

Use frontmatter:

```md
---
title: Knowledge Compilation
type: process
status: active
sources:
  - docs/wiki/log.md
last_updated: 2026-04-07
tags:
  - knowledge
  - process
related:
  - docs/wiki/index.md
---
```

Body sections:

- `# Knowledge Compilation`
- `## Inputs`
- `## Compilation Steps`
- `## Refresh Rules`

- [ ] **Step 5: Ensure all starter pages follow K2 conventions**

Check that all pages include:

- complete frontmatter
- `status`
- `sources`
- `related`

- [ ] **Step 6: Commit starter wiki pages**

```bash
git add templates/generic/docs/wiki/reports/regression-risk-summary.md templates/generic/docs/wiki/reports/workflow-stability-summary.md templates/generic/docs/wiki/reports/red-team-findings-summary.md templates/generic/docs/wiki/processes/knowledge-compilation.md
git commit -m "feat: add starter compiled wiki report templates"
```

---

## Task 4: Register K4 assets in the governance manifest

**Files:**

- Modify: `src/templates/governance.ts`
- Modify: `tests/unit/templates/governance.test.ts`

- [ ] **Step 1: Add K4 manifest constants**

In `src/templates/governance.ts`, add:

```ts
const WIKI_COMPILATION_SKILLS = ["wiki-compilation", "wiki-maintenance"];

const WIKI_COMPILATION_COMMANDS = ["wiki-compile", "wiki-refresh"];

const WIKI_COMPILED_DOC_FILES = [
  "docs/wiki/reports/regression-risk-summary.md",
  "docs/wiki/reports/workflow-stability-summary.md",
  "docs/wiki/reports/red-team-findings-summary.md",
  "docs/wiki/processes/knowledge-compilation.md",
];
```

- [ ] **Step 2: Register the K4 skills**

Update the skills loop so it includes `...WIKI_COMPILATION_SKILLS` along with K1 wiki skills.

- [ ] **Step 3: Register the K4 commands**

Update the commands loop so it includes `...WIKI_COMPILATION_COMMANDS` along with K1 wiki commands.

- [ ] **Step 4: Register the starter compiled docs**

Add this block near the wiki scaffold docs section:

```ts
// --- Wiki Compiled Docs ---
for (const wikiFile of WIKI_COMPILED_DOC_FILES) {
  tasks.push(copyTask(`generic/${wikiFile}`, wikiFile));
}
```

- [ ] **Step 5: Export the K4 categories from `GOVERNANCE_MANIFEST`**

Add:

```ts
  wikiCompilationSkills: WIKI_COMPILATION_SKILLS,
  wikiCompilationCommands: WIKI_COMPILATION_COMMANDS,
  wikiCompiledDocFiles: WIKI_COMPILED_DOC_FILES,
```

- [ ] **Step 6: Add failing governance test expectations before implementation if not already done**

In `tests/unit/templates/governance.test.ts`, add assertions for:

```ts
expect(destinations).toContain("skills/wiki-compilation/SKILL.md");
expect(destinations).toContain("skills/wiki-maintenance/SKILL.md");
expect(destinations).toContain("commands/wiki-compile.md");
expect(destinations).toContain("commands/wiki-refresh.md");
expect(destinations).toContain("docs/wiki/reports/regression-risk-summary.md");
expect(destinations).toContain("docs/wiki/reports/workflow-stability-summary.md");
expect(destinations).toContain("docs/wiki/reports/red-team-findings-summary.md");
expect(destinations).toContain("docs/wiki/processes/knowledge-compilation.md");
```

Update totals by `+8` in each existing scenario.

Assuming K3 is complete, set the new totals to:

- minimal config: `158 -> 166`
- TypeScript config: `173 -> 181`
- TS+Python config: `192 -> 200`
- backend Java config: `177 -> 185`

- [ ] **Step 7: Run the governance test**

Run: `npx vitest run tests/unit/templates/governance.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit manifest registration**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register wiki runtime compilation assets"
```

---

## Task 5: Extend self-check coverage for K4 assets

**Files:**

- Modify: `src/doctor/self-checks.ts`
- Modify: `tests/unit/doctor/self-checks.test.ts`

- [ ] **Step 1: Add compilation skills and commands to orphan detection**

In `checkNoOrphanFiles`, add loops for:

```ts
for (const skill of GOVERNANCE_MANIFEST.wikiCompilationSkills) {
  allManifestPaths.add(`skills/${skill}/SKILL.md`);
}

for (const cmd of GOVERNANCE_MANIFEST.wikiCompilationCommands) {
  allManifestPaths.add(`commands/${cmd}.md`);
}
```

- [ ] **Step 2: Add compiled doc files plus compilation command/skill existence checks**

Add:

```ts
for (const wikiDoc of GOVERNANCE_MANIFEST.wikiCompiledDocFiles) {
  allManifestPaths.add(wikiDoc);
}
```

And add dedicated checks in `runSelfChecks`:

```ts
checks.push(
  await checkFilesExist(
    packageRoot,
    "self-wiki-compilation-skills-exist",
    "wiki compilation skill",
    GOVERNANCE_MANIFEST.wikiCompilationSkills.map((skill) => `skills/${skill}/SKILL.md`),
  ),
);
checks.push(
  await checkFilesExist(
    packageRoot,
    "self-wiki-compilation-commands-exist",
    "wiki compilation command",
    GOVERNANCE_MANIFEST.wikiCompilationCommands.map((cmd) => `commands/${cmd}.md`),
  ),
);
```

And add the compiled docs check:

```ts
checks.push(
  await checkFilesExist(
    packageRoot,
    "self-wiki-compiled-docs-exist",
    "compiled wiki doc",
    GOVERNANCE_MANIFEST.wikiCompiledDocFiles,
  ),
);
```

- [ ] **Step 3: Extend `createMinimalGovernance()` fixture**

Add writes for:

```ts
await writeTextFile(join(root, "commands", "wiki-compile.md"), "# /wiki-compile\n\n## Related\n");
await writeTextFile(join(root, "commands", "wiki-refresh.md"), "# /wiki-refresh\n\n## Related\n");
await writeTextFile(join(root, "skills", "wiki-compilation", "SKILL.md"), "# Wiki Compilation\n\n## Related\n");
await writeTextFile(join(root, "skills", "wiki-maintenance", "SKILL.md"), "# Wiki Maintenance\n\n## Related\n");
await writeTextFile(join(root, "docs", "wiki", "reports", "regression-risk-summary.md"), "# Regression Risk Summary\n");
await writeTextFile(
  join(root, "docs", "wiki", "reports", "workflow-stability-summary.md"),
  "# Workflow Stability Summary\n",
);
await writeTextFile(
  join(root, "docs", "wiki", "reports", "red-team-findings-summary.md"),
  "# Red Team Findings Summary\n",
);
await writeTextFile(join(root, "docs", "wiki", "processes", "knowledge-compilation.md"), "# Knowledge Compilation\n");
```

- [ ] **Step 4: Add a targeted self-check test**

Add a test that confirms these checks fail on an empty temp dir and pass once the fixture files are written:

- `self-wiki-compilation-skills-exist`
- `self-wiki-compilation-commands-exist`
- `self-wiki-compiled-docs-exist`

- [ ] **Step 5: Run the self-check suite**

Run: `npx vitest run tests/unit/doctor/self-checks.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit self-check updates**

```bash
git add src/doctor/self-checks.ts tests/unit/doctor/self-checks.test.ts
git commit -m "test: add self-check coverage for wiki compilation assets"
```

---

## Task 6: Final K4 verification

**Files:**

- Modify if needed: any K4-touched file to resolve verification findings

- [ ] **Step 1: Run targeted suites**

Run: `npx vitest run tests/unit/templates/governance.test.ts tests/unit/templates/governance.crossref.test.ts tests/unit/doctor/self-checks.test.ts`

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

- [ ] **Step 5: Commit any final K4 verification fixes if needed**

```bash
git add .
git commit -m "test: verify wiki runtime compilation integration"
```

Only create this commit if verification required follow-up edits beyond the earlier K4 commits.

---

## K4 Scope Guardrails

Do **not** include any of the following in K4:

- automatic background compilation hooks
- source hashing propagation logic
- contradiction registry tables or workflows
- layered summaries (L0/L1/L2/L3)
- candidate promotion queue tables
- signed receipts or trust chains
- search engine / FTS integration

K4 is complete once explicit compile/refresh workflows exist, starter compiled wiki pages are generated, and the governance/test/self-check system fully recognizes the new runtime compilation assets.
