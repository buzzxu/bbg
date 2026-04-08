# /hermes-intake

## Description

Run K9 intake to collect and normalize candidate objects from multiple projects into local intake storage for review.

## Usage

```
/hermes-intake --source <project_id>
/hermes-intake --source <project_id> --limit 200
/hermes-intake --source <project_id> --since 2026-04-01
```

## Process

1. Select source project scope and candidate filters.
2. Import candidate records from each selected source project.
3. Normalize fields, evidence links, and candidate taxonomy into intake records.
4. Record normalization metadata and leave each intake record in reviewable status.
5. Hand off normalized intake records to `/hermes-intake-review` for duplicate/conflict review.

## Focus

- cross-project intake collection
- normalization consistency
- source traceability
- review-ready intake status
- K9 collect-and-normalize boundaries

Global verification and promotion are out of scope in K9.

## Related

- [Hermes Intake Review Command](./hermes-intake-review.md)
- [Hermes Intake Skill](../skills/hermes-intake/SKILL.md)
- [Hermes Candidates Command](./hermes-candidates.md)
