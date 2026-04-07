---
title: Hermes Distillation
type: process
status: active
sources:
  - .bbg/scripts/hermes-schema.sql
last_updated: 2026-04-07
tags:
  - hermes
  - distillation
  - local-learning
related:
  - docs/wiki/processes/hermes-runtime.md
  - docs/wiki/processes/knowledge-compilation.md
---

# Hermes Distillation

## Inputs

- Hermes candidates with completed evaluation
- linked run artifacts and candidate evidence
- proposed local wiki or process targets

ALTER TABLE alone is insufficient for upgraded installs because the old status
CHECK still blocks distilled. Upgraded installs must rebuild or export-import
hermes_candidates from the latest schema before using K7A local distillation
workflows.

## Distillation Steps

1. Select an evaluated local candidate with enough evidence to refine.
2. Choose a local wiki or process draft destination.
3. Create or update the draft output while preserving links back to the candidate evidence.
4. Mark the candidate distilled once the draft output exists and is reviewable.
5. Send the draft through local refinement before any canonical wiki promotion.

## Guardrails

- Distillation creates local drafts, not final canonical pages.
- Canonical wiki promotion remains a separate review step.
- Only wiki/process draft targets are distillable in K7A.
- Other candidate types remain reserved for later phases.
- Cross-project promotion is out of scope.
