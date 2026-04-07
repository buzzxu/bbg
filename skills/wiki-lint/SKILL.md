---
name: wiki-lint
category: knowledge
description: Use when auditing docs/wiki for orphan pages, missing sources, duplicate concepts, weak cross-links, or stale claims that need maintenance follow-up.
---

# Wiki Lint

## Overview
Use this skill to review wiki health systematically and produce maintenance work that is easy to act on. The focus is structure, attribution, and durability: pages should be reachable, sourced, linked, and kept free of stale or duplicated knowledge.

## Workflow

1. Read `docs/wiki/index.md`
2. Enumerate wiki pages by folder
3. Compare indexed pages to on-disk pages
4. Check frontmatter fields
5. Check link coverage and duplicate concepts
6. Produce a categorized maintenance report

### Step 1: Read `docs/wiki/index.md`
- Start from the canonical catalog before inspecting individual pages.
- Treat the index as the expected discovery path for formal wiki content.

### Step 2: Enumerate wiki pages by folder
- Review `docs/wiki/concepts/`, `docs/wiki/decisions/`, `docs/wiki/reports/`, and `docs/wiki/processes/`.
- Build a complete list of on-disk wiki pages before classifying findings.

### Step 3: Compare indexed pages to on-disk pages
- Flag pages on disk that are missing from `docs/wiki/index.md` as `orphan_pages` candidates.
- Flag broken or stale index references when the index points at pages that do not exist or no longer match the current structure.

### Step 4: Check frontmatter fields
- Verify formal wiki pages include the expected frontmatter, especially `title`, `type`, `status`, `sources`, and `last_updated`.
- Record missing or weak attribution as `missing_sources` instead of inventing provenance.

### Step 5: Check link coverage and duplicate concepts
- Identify pages with weak discovery paths or missing neighboring links as `weak_cross_links`.
- Identify pages that appear to cover the same topic under different names as `duplicate_topics`.
- Identify pages whose status, timestamps, or evidence suggest they need review as `stale_candidates`.

### Step 6: Produce a categorized maintenance report
- Group findings under `orphan_pages`, `missing_sources`, `duplicate_topics`, `weak_cross_links`, and `stale_candidates`.
- Include the affected file path for every finding.
- Include a concrete remediation suggestion for every finding so follow-up work is deterministic.

## Output
- Categorized maintenance report
- `orphan_pages` findings with file paths and remediation
- `missing_sources` findings with file paths and remediation
- `duplicate_topics` findings with affected pages and remediation
- `weak_cross_links` findings with file paths and remediation
- `stale_candidates` findings with file paths and remediation

## Rules
- Scan both structure and page content
- Prefer actionable fixes over vague observations
- Flag stale claims when the wiki appears outdated or weakly supported
- Treat missing sources as a first-class maintenance issue
- Call out duplication even when pages use different wording for the same concept

## Anti-Patterns
- Deleting pages during lint
- Inventing sources for missing-source pages
- Collapsing disputed topics into one clean summary without flagging uncertainty

## Related

- [Wiki Lint Command](../../commands/wiki-lint.md)
- [Wiki Ingestion Skill](../wiki-ingestion/SKILL.md)
- [Wiki Query Skill](../wiki-query/SKILL.md)
