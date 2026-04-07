# Knowledge Layer: Common

Shared rules for durable knowledge captured in the wiki layer.

## Mandatory

- Every formal wiki page must include frontmatter fields `title`, `type`, `status`, `sources`, and `last_updated`
- `sources` must point to raw docs or other durable artifacts; canonical wiki pages must never be source-less
- Treat files under `docs/raw/` as immutable inputs; preserve them as evidence instead of rewriting them
- Update `docs/wiki/index.md` whenever a formal wiki page is added, renamed, or archived
- Keep `docs/wiki/log.md` append-only so the knowledge trail stays auditable
- When new evidence contradicts an existing page, mark the conflict explicitly instead of silently rewriting history

## Recommended

- Prefer updating an existing page when new evidence extends the same stable topic
- Keep page titles and filenames aligned so index entries stay easy to scan
- Use `status` to reflect page lifecycle clearly (`active`, `draft`, `stale`, `superseded`)
- Link related wiki pages when they share sources, concepts, or follow-up decisions

## Forbidden

- Creating duplicate pages for the same stable topic when an existing page should be updated
- Publishing canonical conclusions without durable source attribution
- Editing raw source files under `docs/raw/` to make them match later interpretations
- Removing conflicting historical evidence from the log or wiki without recording what changed

## Related

- **Skills**: [wiki-ingestion](../../skills/wiki-ingestion/SKILL.md), [wiki-query](../../skills/wiki-query/SKILL.md), [wiki-lint](../../skills/wiki-lint/SKILL.md)
- **Commands**: [/wiki-ingest](../../commands/wiki-ingest.md), [/wiki-query](../../commands/wiki-query.md), [/wiki-lint](../../commands/wiki-lint.md)
