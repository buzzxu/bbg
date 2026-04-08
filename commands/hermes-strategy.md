# /hermes-strategy

## Description

review and decide Hermes strategy recommendations with human approval.

## Usage

```
/hermes-strategy --list --status proposed
/hermes-strategy --recommendation <recommendation_id> --decision accepted
```

## Rules

- Strategy decisions must reference recommendation evidence and rationale
- Accepted/rejected/superseded updates are recorded as explicit decisions
- K11 strategy decisions do not auto-apply code or content edits

## Related

- [Hermes Learn Command](./hermes-learn.md)
- [Hermes Strategy Selection Skill](../skills/hermes-strategy-selection/SKILL.md)
- [Hermes Query Command](./hermes-query.md)
