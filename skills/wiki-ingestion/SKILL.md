---
name: wiki-ingestion
category: knowledge
description: Use when ingesting one raw source from docs/raw into durable wiki pages with source attribution, index maintenance, and chronological logging.
---

# Wiki Ingestion

## Overview
Use this skill to convert one raw source into durable wiki knowledge without rewriting the source itself. Raw files in `docs/raw/` are immutable inputs, and every wiki update must preserve explicit source attribution plus any unresolved conflicts or open questions.

## Workflow

### Step 1: Read one raw source
- Accept exactly one source path under `docs/raw/`
- Read the source as written
- Treat the raw file as immutable input during ingest

### Step 2: Extract durable knowledge
- Capture facts that should persist beyond the immediate source
- Note open questions that still need confirmation
- Record conflicts, ambiguity, or competing statements explicitly

### Step 3: Update wiki pages
- Create or revise the relevant pages under `docs/wiki/`
- Organize material by durable topic instead of copying the raw source verbatim
- Preserve source attribution on each new or updated page

### Step 4: Update the wiki index
- Add new pages to `docs/wiki/index.md`
- Update renamed or reorganized entries so pages stay discoverable

### Step 5: Append the wiki log
- Add a chronological entry to `docs/wiki/log.md`
- Summarize the source used, pages changed, and unresolved issues

## Output
- Wiki pages created or updated
- Durable facts captured from the source
- Open questions and conflicts still pending
- Confirmation that `docs/wiki/index.md` and `docs/wiki/log.md` were updated

## Rules
- Read one source at a time from `docs/raw/`
- Do not rewrite or normalize the raw source during ingest
- Keep durable knowledge in `docs/wiki/`, not in ad hoc notes
- Preserve explicit source attribution for every wiki change
- Record conflicts instead of silently choosing one interpretation
- Update both the index and log whenever wiki pages change

## Related

- [Wiki Ingest Command](../../commands/wiki-ingest.md)
- [Wiki Query Skill](../wiki-query/SKILL.md)
- [Wiki Lint Skill](../wiki-lint/SKILL.md)
