# /hermes-verify

## Description

verify intake candidates with explicit evidence checks before any promotion decision is recorded.

## Usage

```
/hermes-verify --run <intake_run_id>
/hermes-verify --candidate <intake_candidate_id>
```

## Rules

- Verification must be evidence-gated
- Verification results are required before promotion decisions
- K10 does not introduce meta-learning optimization

## Related

- [Hermes Intake Review Command](./hermes-intake-review.md)
- [Hermes Promote Command](./hermes-promote.md)
- [Hermes Verification Skill](../skills/hermes-verification/SKILL.md)
