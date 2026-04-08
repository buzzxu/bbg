---
name: hermes-meta-learning
category: hermes
description: Use when deriving cross-run strategy recommendations from Hermes evidence history.
---

# Hermes Meta-Learning

## Workflow

1. Select the evidence window and target scope (workflow, skill, routing).
2. Aggregate run/evaluation/intake/verification/promotion evidence.
3. Extract repeatable signals with confidence and traceable evidence references.
4. Produce recommendation records with rationale and status `proposed`.
5. Hand recommendations to strategy review workflows for human decision.

## Rules

- meta-learning outputs are advisory, not auto-applied
- Recommendations must include explicit evidence links and rationale
- K11 does not auto-edit workflows, skills, rules, or routing policy

## Related

- [Hermes Learn Command](../../commands/hermes-learn.md)
- [Hermes Strategy Selection Skill](../hermes-strategy-selection/SKILL.md)
- [Hermes Verification Skill](../hermes-verification/SKILL.md)
