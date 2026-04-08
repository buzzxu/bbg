---
name: hermes-memory-router
category: hermes
description: Use when selecting between local canonical wiki memory, local candidate draft memory, and raw/runtime evidence.
---

# Hermes Memory Router

## Workflow

1. Read local canonical wiki/process pages first
2. Escalate to local candidate draft memory only when canonical memory is missing or incomplete
3. Escalate to raw/runtime evidence only when the local memory layers do not resolve the question
4. Return the answer with explicit memory-layer provenance

## Rules

- Canonical over candidate
- Local over raw/runtime evidence
- Candidate memory is reviewable draft memory, not trusted canonical memory
- Intake records are non-canonical review memory until K10 verification
- K10 verification/promotion records are not canonical routing layers by default
- Querying a candidate does not promote it
- Keep routing separate from distillation and promotion workflows

## Related

- [Hermes Query Command](../../commands/hermes-query.md)
- [Wiki Query Skill](../wiki-query/SKILL.md)
- [Hermes Distillation Skill](../hermes-distillation/SKILL.md)
