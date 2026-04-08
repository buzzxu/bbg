---
name: hermes-intake
category: hermes
description: Use when importing and normalizing cross-project Hermes candidates for K9 intake review.
---

# Hermes Intake

## Workflow

1. Select source projects and intake filters for the run.
2. Import candidate objects and preserve source identifiers for traceability.
3. Normalize candidate payloads into a consistent intake shape.
4. Queue normalized records for duplicate/conflict review.
5. Route review outcomes to local-only statuses without promotion.

## Rules

- K9 intake collects and normalizes only
- Keep source project lineage on every intake record
- Use intake review to resolve duplicates and conflicts before acceptance
- Intake records are reviewable draft memory, not canonical memory
- intake records remain non-canonical until K10 verification
- Verification and promotion decisions are deferred to K10 workflows

## Related

- [Hermes Intake Command](../../commands/hermes-intake.md)
- [Hermes Intake Review Command](../../commands/hermes-intake-review.md)
- [Hermes Memory Router Skill](../hermes-memory-router/SKILL.md)
