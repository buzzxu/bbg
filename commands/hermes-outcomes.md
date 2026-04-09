# /hermes-outcomes

## Description

review measured outcomes for adopted strategies over defined windows.

## Usage

```
/hermes-outcomes --adoption <adoption_id> --window 14d
/hermes-outcomes --status regressed
```

## Rules

- Outcome assessments must include baseline and observed metrics where available
- Regressions should trigger explicit review and possible rollback decisions
- K12 outcome reporting is advisory and does not auto-roll back strategies

## Related

- [Hermes Adopt Command](./hermes-adopt.md)
- [Hermes Outcome Evaluation Skill](../skills/hermes-outcome-evaluation/SKILL.md)
- [Hermes Strategy Command](./hermes-strategy.md)
