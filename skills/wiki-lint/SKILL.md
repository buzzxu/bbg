---
name: wiki-lint
category: knowledge
description: Use when auditing docs/wiki for orphan pages, missing sources, duplicate concepts, weak cross-links, or stale claims that need maintenance follow-up.
---

# Wiki Lint

## Overview
Use this skill to review wiki health systematically and produce maintenance work that is easy to act on. The focus is structure, attribution, and durability: pages should be reachable, sourced, linked, and kept free of stale or duplicated knowledge.

## Workflow

### Step 1: Scan wiki pages
- Review the structure under `docs/wiki/`
- Inspect index coverage and relevant page-to-page links

### Step 2: Detect orphan pages
- Find pages missing from `docs/wiki/index.md`
- Find pages that are difficult to discover from related links

### Step 3: Detect missing sources
- Flag pages with missing `sources` references or claims that are not traceable
- Note attribution gaps clearly instead of guessing provenance

### Step 4: Detect duplicate concepts or weak linking
- Identify overlapping pages that should be merged, clarified, or cross-linked
- Flag pages that should link to neighboring concepts, decisions, reports, or processes

### Step 5: Produce a categorized maintenance report
- Group findings by orphan pages, missing sources, stale claims, weak cross-links, and duplicate concepts
- Include actionable fixes for each category

## Output
- Categorized maintenance report
- List of orphan pages
- List of missing-source or weak-attribution issues
- List of duplicate concepts, weak links, and stale claims
- Recommended follow-up actions

## Rules
- Scan both structure and page content
- Prefer actionable fixes over vague observations
- Flag stale claims when the wiki appears outdated or weakly supported
- Treat missing sources as a first-class maintenance issue
- Call out duplication even when pages use different wording for the same concept

## Related

- [Wiki Lint Command](../../commands/wiki-lint.md)
- [Wiki Ingestion Skill](../wiki-ingestion/SKILL.md)
- [Wiki Query Skill](../wiki-query/SKILL.md)
