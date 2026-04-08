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

For upgraded installs, ALTER TABLE alone is insufficient for K7A local
distillation workflows because the old hermes_candidates status CHECK still
blocks distilled. Upgraded installs must rebuild or export-import
hermes_candidates from the latest schema before using K7A local distillation
workflows.

In K7A, Hermes candidates may be distilled into local wiki or process drafts that remain reviewable project-local artifacts. Canonical wiki promotion remains a separate review step, so draft distillation should not bypass trust and maintenance workflows.

In K7B, local skill/rule draft generation is added alongside wiki/process drafts. Draft skill/rule outputs remain non-canonical until separately promoted through review workflows, and global promotion remains out of scope in K7B.

In K8, local canonical wiki memory is consulted before local candidate draft memory, and raw/runtime artifacts are a fallback layer only when the local memory layers do not resolve the question. Candidate memory remains reviewable draft memory until separately promoted.

In K9, Hermes collects and normalizes cross-project candidates into intake records. Intake records remain non-canonical until K10 verification, and global promotion remains out of scope in K9.

K10 verifies candidates before promotion decisions. Promotion decisions remain evidence-gated and auditable, and K11 meta-learning remains out of scope in K10.

K11 derives advisory strategy recommendations from historical evidence. Strategy changes require explicit human approval, and K11 does not auto-edit workflows, skills, rules, or routing policy.

K7A only distills wiki/process drafts. Other candidate types remain reserved for
later phases.
