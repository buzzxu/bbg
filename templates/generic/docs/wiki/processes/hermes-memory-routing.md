---
title: Hermes Memory Routing
type: process
status: active
sources:
  - docs/wiki/processes/hermes-runtime.md
  - docs/wiki/processes/hermes-distillation.md
last_updated: 2026-04-08
tags:
  - hermes
  - routing
  - local-memory
related:
  - docs/wiki/processes/hermes-runtime.md
  - docs/wiki/processes/hermes-distillation.md
  - docs/wiki/processes/knowledge-trust-model.md
---

# Hermes Memory Routing

## Retrieval Order

1. Local canonical wiki memory
2. Local candidate draft memory
3. Raw/runtime artifacts only when needed

## Routing Rules

- Prefer canonical over candidate
- Prefer local over raw/runtime evidence
- Treat candidate drafts as reviewable memory, not canonical truth
- Keep routing separate from promotion decisions

## Guardrails

- K8 does not introduce embeddings or ranking heuristics.
- K8 does not auto-promote queried candidates.
- K8 remains local-only and does not add org/global routing.
