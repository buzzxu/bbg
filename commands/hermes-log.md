# /hermes-log

## Description

Inspect recent Hermes runtime and evaluation records so teams can understand how local learning inputs are being captured before distillation and promotion.

## Usage

```
/hermes-log
/hermes-log --last 10
/hermes-log --status failed
/hermes-log --run <run_id>
```

## Process

1. **Select the review window** - Start with the most recent runs unless a specific run or status filter is provided.
2. **Inspect runtime records** - Review run status, task type, workflow usage, and linked evaluation state.
3. **Follow artifact links** - Open linked artifacts for runs that need debugging, validation, or follow-up.
4. **Separate outcomes** - Group successful, failed, and review-worthy runs so unresolved work is visible.
5. **Escalate when needed** - Route strong runs to Hermes evaluation before any candidate promotion discussion.

## Focus

- recent runs
- recent evaluations
- linked artifacts
- unresolved failed runs worth reviewing

## Related

- [Hermes Runtime Skill](../skills/hermes-runtime/SKILL.md)
- [Hermes Evaluation Skill](../skills/hermes-evaluation/SKILL.md)
- [Hermes Candidates Command](./hermes-candidates.md)
