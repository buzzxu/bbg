# /hermes-adopt

## Description

record approved strategy adoption events with rollout metadata.

## Usage

```
/hermes-adopt --recommendation <recommendation_id> --target routing-policy-v2 --status active
/hermes-adopt --recommendation <recommendation_id> --status rolled_back --note "regression observed"
```

## Rules

- Adoption requires explicit linkage to accepted recommendations
- Rollout status changes must preserve audit history
- K12 adoption does not auto-edit code or governance assets

## Related

- [Hermes Strategy Command](./hermes-strategy.md)
- [Hermes Outcomes Command](./hermes-outcomes.md)
- [Hermes Strategy Adoption Skill](../skills/hermes-strategy-adoption/SKILL.md)
