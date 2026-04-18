# Doc Gardening Playbook

Use doc gardening to keep the repository readable for agents over time.

## Goals

- detect missing local references early
- detect stale docs after code or workflow changes
- treat documentation freshness as part of harness quality

## Default Flow

1. `bbg doc-garden`
2. Fix missing references first
3. Review stale references where code changed after the doc
4. Re-run until the report is acceptable for the current change

## Rules

- core governance docs should always resolve their local references
- stale workflow docs should be refreshed before process changes are considered stable
- doc gardening complements review; it does not replace content judgment
