# Knowledge Metadata

`.bbg/knowledge.db` is the structured helper index for the project knowledge layer.

- `docs/raw/` is the immutable source layer.
- `docs/wiki/` is the human-readable canonical knowledge layer.
- `.bbg/knowledge.db` is an optional metadata index that can record source metadata,
  wiki page metadata, page-source relationships, and lint findings.

This database supports future workflows that need structured lookups, but it is not
the canonical content store for project knowledge.

Teams should not hand-edit `.bbg/knowledge.db` directly. Update raw sources and wiki
pages through the documented workflows instead, then let BBG-managed processes rebuild
or refresh the metadata layer when those workflows are available.
