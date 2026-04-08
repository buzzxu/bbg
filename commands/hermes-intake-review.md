# /hermes-intake-review

## Description

Review normalized intake candidates for duplicates and conflicts before accepting local-only intake outcomes.

This step is to review normalized intake candidates for duplicates and conflicts before any downstream local-only acceptance.

## Usage

```
/hermes-intake-review
/hermes-intake-review --run <intake_run_id>
/hermes-intake-review --status pending_review
```

## Process

1. Load normalized intake records for the selected run or status.
2. Group likely duplicates by normalized hash and candidate type.
3. Flag evidence or field mismatches as conflicts requiring reviewer decisions.
4. Mark each intake record as duplicate, conflict, accepted_local_only, or rejected.
5. Keep global verification and promotion workflows out of the K9 intake review step.

## Focus

- duplicate detection
- conflict triage
- local-only acceptance decisions
- intake auditability
- K9 boundary enforcement

## Related

- [Hermes Intake Command](./hermes-intake.md)
- [Hermes Intake Skill](../skills/hermes-intake/SKILL.md)
- [Hermes Query Command](./hermes-query.md)
