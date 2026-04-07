# Wiki Log

This append-only log records ingest, query, and lint events in chronological order.

Log entries must be appended, not edited in place except for typo fixes in the newest entry.

Required entry format:

```md
## [2026-04-07] ingest | docs/raw/example.md

- Updated: docs/wiki/concepts/example.md
- Added source attribution
- Flagged one unresolved conflict
```
