---
title: Hermes Runtime
type: process
status: active
sources:
  - .bbg/scripts/hermes-schema.sql
last_updated: 2026-04-07
tags:
  - hermes
  - runtime
  - evaluation
related:
  - docs/wiki/processes/knowledge-trust-model.md
---

# Hermes Runtime

## Run Capture

Hermes records task execution, agent usage, workflow usage, and linked artifacts as structured runtime memory.

Hermes runtime records are operational memory, not canonical project knowledge.

If the project already has an existing `.bbg/knowledge.db`, apply `.bbg/scripts/hermes-schema.sql` to the existing database before relying on Hermes-backed workflows.

## Evaluation

Runs can be scored for correctness, quality, reproducibility, regression risk, and reuse potential before they become candidate knowledge.

Artifacts should be linked as evidence rather than copied wholesale into wiki pages or promotion records.

## Candidate Formation

High-value or repeated runs may produce candidate objects that can later be refined into canonical local knowledge.

Evaluation should happen before local candidate decisions so refinement is grounded in explicit scoring and rationale.

Cross-project promotion is out of scope for K6.
