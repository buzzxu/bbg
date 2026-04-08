# /hermes-learn

## Description

derive advisory recommendations from Hermes evidence history.

## Usage

```
/hermes-learn --window 30d
/hermes-learn --scope routing
```

## Rules

- Learning uses historical evidence from runtime/eval/intake/verification/promotion records
- Recommendations are advisory and require explicit human review
- K11 does not auto-edit workflows, skills, or rules

## Related

- [Hermes Strategy Command](./hermes-strategy.md)
- [Hermes Meta-Learning Skill](../skills/hermes-meta-learning/SKILL.md)
- [Hermes Promote Command](./hermes-promote.md)
