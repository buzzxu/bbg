# Knowledge Metadata

`.bbg/knowledge.db` is the structured helper index for the project knowledge layer.

- `docs/raw/` is the immutable source layer.
- `docs/wiki/` is the human-readable canonical knowledge layer.
- `.bbg/knowledge.db` is an optional metadata index that can record source metadata,
  wiki page metadata, page-source relationships, and lint findings.

This database supports future workflows that need structured lookups, but it is not
the canonical content store for project knowledge.

## Trust Metadata Responsibilities

The metadata layer can track:

- source hashing and last-seen hashes
- `freshness_status` for sources and pages
- contradiction registry records
- summary layers for wiki pages
- candidate promotion records and query history

This database is support infrastructure for trust and review workflows. It does not
replace `docs/wiki/` as the canonical human-readable knowledge layer.

## Existing Database Migration

Fresh K5 projects can initialize from the current schema files directly. Existing
K3 or K4 knowledge databases need a one-time migration or rebuild before the new
freshness, contradiction, summary-layer, and candidate-update fields are available.
Use the documented migration statements in `.bbg/scripts/knowledge-schema.sql` after
backing up the database, or recreate the DB from the latest schema when that is
safer for the team.

Teams should not hand-edit `.bbg/knowledge.db` directly. Update raw sources and wiki
pages through the documented workflows instead, then let BBG-managed processes rebuild
or refresh the metadata layer when those workflows are available.

## Hermes Runtime Responsibilities

Hermes runtime metadata complements the canonical knowledge database by recording:

- execution runs
- run artifacts
- structured evaluations
- candidate objects
- candidate evidence links

These records are the raw learning substrate for later distillation and promotion
workflows. They do not replace trusted wiki pages or promotion decisions.

By default, Hermes tables can live in the same `.bbg/knowledge.db`, initialized from
the companion `.bbg/scripts/hermes-schema.sql` file alongside the canonical knowledge
schema.

Existing projects must apply `.bbg/scripts/hermes-schema.sql` to the current
database (or rebuild from the latest schema set) before using Hermes-backed
workflows.
