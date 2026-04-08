---
title: Hermes Intake
type: process
status: active
sources:
  - .bbg/scripts/hermes-schema.sql
  - docs/wiki/processes/hermes-memory-routing.md
last_updated: 2026-04-08
tags:
  - hermes
  - intake
  - cross-project
related:
  - docs/wiki/processes/hermes-memory-routing.md
  - docs/wiki/processes/hermes-distillation.md
  - docs/wiki/processes/knowledge-trust-model.md
---

# Hermes Intake

k9 collects and normalizes cross-project candidates so reviewers can triage duplicates and conflicts before downstream usage.

## Intake Steps

1. Register or select source projects for the intake run.
2. Import candidate objects from each source project.
3. Normalize imported payloads into consistent intake candidate records.
4. Compute duplicate/conflict signals and assign pending review state.
5. Review outcomes as duplicate, conflict, accepted_local_only, or rejected.

## Guardrails

- K9 intake scope is collect and normalize only.
- Intake records remain non-canonical candidate memory.
- global promotion is out of scope in k9.
- Global verification is deferred until K10.
- Verified candidate handoff begins in K10, not K9 intake.

## Related

- [Hermes Memory Routing](./hermes-memory-routing.md)
- [Hermes Distillation](./hermes-distillation.md)
