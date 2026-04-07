---
name: hermes-evaluation
category: hermes
description: Use when scoring Hermes runs for correctness, quality, reproducibility, and candidate-worthiness.
---

# Hermes Evaluation

## Workflow

1. Review the run record and linked artifacts
2. Score correctness, quality, reproducibility, regression risk, and reuse potential
3. Decide whether the run should produce a candidate object
4. Record the evaluation outcome and rationale

## Rules

- Do not create a candidate from a run that lacks enough evidence to evaluate
- Distinguish local usefulness from higher-scope reusability
- Prefer explicit rationale over implicit scoring assumptions
- Successful local candidates should feed draft distillation before canonical promotion review

## Related

- [Hermes Candidates Command](../../commands/hermes-candidates.md)
- [Hermes Runtime Skill](../hermes-runtime/SKILL.md)
