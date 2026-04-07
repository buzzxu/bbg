# /wiki-ingest

## Description
Ingest one raw source from `docs/raw/` into the wiki so durable knowledge is captured, organized, and traceable back to its origin.

## Usage
```
/wiki-ingest docs/raw/<source>.md
/wiki-ingest docs/raw/research-notes.md
/wiki-ingest docs/raw/incident-summary.md
```

## Input Contract
- Accept exactly one source path for K2
- The source path must point to a file under `docs/raw/`
- Treat the provided raw file as immutable input during ingest

## Process
1. **Validate input** — Confirm the input is exactly one source file under `docs/raw/`
2. **Read the source** — Extract durable facts, open questions, and any conflicting statements that need follow-up
3. **Update wiki pages** — Create or revise the relevant pages under `docs/wiki/` based on the source content
4. **Update the index** — Add or revise entries in `docs/wiki/index.md` so the new or changed pages remain discoverable
5. **Append the log** — Add a chronological entry to `docs/wiki/log.md` describing what was ingested and what changed
6. **Preserve attribution** — Record explicit source attribution on every new or updated wiki page and note any unresolved conflicts

## Output Contract
Return a summary with these fields:

- `updated_pages` — existing wiki pages revised during ingest
- `new_pages` — new canonical wiki pages created from the source
- `index_updated` — whether `docs/wiki/index.md` was updated
- `log_appended` — whether a new entry was appended to `docs/wiki/log.md`
- `conflicts` — contradictions, ambiguity, or disputed statements that remain unresolved
- `open_questions` — follow-up questions that still need evidence

## Rules
- Accept exactly one source path and keep it under `docs/raw/`
- Treat the raw source as the authority for what was observed in that document
- Every created or updated wiki page must include the source path in its `sources` field
- Do not remove source attribution from wiki content
- Call out contradictions, ambiguity, and missing context explicitly
- Document conflicts instead of resolving them silently
- Update the index and log every time wiki content changes

## Examples
```
/wiki-ingest docs/raw/customer-interview.md
/wiki-ingest docs/raw/prd-v2.md
/wiki-ingest docs/raw/postmortem-2026-04-01.md
```

## Related

- [Wiki Ingestion Skill](../skills/wiki-ingestion/SKILL.md)
- [Wiki Query Command](./wiki-query.md)
- [Wiki Lint Command](./wiki-lint.md)
