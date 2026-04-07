# /wiki-ingest

## Description
Ingest one raw source from `docs/raw/` into the wiki so durable knowledge is captured, organized, and traceable back to its origin.

## Usage
```
/wiki-ingest docs/raw/<source>.md
/wiki-ingest docs/raw/research-notes.md
/wiki-ingest docs/raw/incident-summary.md
```

## Process
1. **Validate input** — Confirm the input is exactly one source file under `docs/raw/`
2. **Read the source** — Extract durable facts, open questions, and any conflicting statements that need follow-up
3. **Update wiki pages** — Create or revise the relevant pages under `docs/wiki/` based on the source content
4. **Update the index** — Add or revise entries in `docs/wiki/index.md` so the new or changed pages remain discoverable
5. **Append the log** — Add a chronological entry to `docs/wiki/log.md` describing what was ingested and what changed
6. **Preserve attribution** — Record explicit source attribution on every new or updated wiki page and note any unresolved conflicts

## Output
- List of wiki pages created or updated
- Summary of facts captured from the source
- Open questions or conflicts that still need resolution
- Confirmation that `docs/wiki/index.md` and `docs/wiki/log.md` were updated

## Rules
- Accept exactly one source path and keep it under `docs/raw/`
- Treat the raw source as the authority for what was observed in that document
- Do not remove source attribution from wiki content
- Call out contradictions, ambiguity, and missing context explicitly
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
