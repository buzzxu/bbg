# /task-env

## Description

Create and manage task-scoped git worktrees with dedicated UI, log, metric, and trace artifact directories.

## Usage

```
/task-env start "fix checkout timeout"
/task-env start "stabilize login flow" --base main
/task-env finish fix-checkout-timeout
/task-env status
```

## Process

1. Create a task-scoped worktree under `.bbg/task-envs/<id>/worktree`.
2. Prepare artifact directories for UI, logs, metrics, and traces.
3. Record notes and verification targets in `.bbg/task-envs/<id>/notes.md`.
4. Use the task environment as the default runtime for interactive debugging and validation.
5. Finish the environment when the task is complete.

## Rules

- Prefer one task environment per active task
- Keep artifact capture tied to the task environment
- Finish stale environments instead of leaving orphan worktrees around

## Related

- [Observe Command](./observe.md)
- [Harness Audit Command](./harness-audit.md)
- [Task Environments Skill](../skills/task-environments/SKILL.md)
