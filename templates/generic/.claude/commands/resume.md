# /resume -- Primary Task Resume Entry

<!-- BBG:BEGIN MANAGED -->
Run `bbg resume <task-id>`.

When resuming, prefer structured runtime state in this order:

1. `.bbg/tasks/<task-id>/context.json`
2. `.bbg/tasks/<task-id>/handoff.md`
3. `.bbg/tasks/<task-id>/decisions.json`

If Claude was launched by `bbg`, prefer the injected `BBG_TASK_*`, `BBG_LOOP_*`, `BBG_HANDOFF_PATH`, `BBG_CONTEXT_PATH`, `BBG_RESUME_STRATEGY`, and `BBG_RECOVERY_PLAN` environment variables when present.

If the CLI task flow is unavailable:

1. Read `AGENTS.md`
2. Read `RULES.md`
3. Read `.bbg/tasks/<task-id>/context.json`
4. Read `.bbg/tasks/<task-id>/handoff.md`
5. Read `.bbg/tasks/<task-id>/decisions.json`
6. Continue from the recorded next actions
<!-- BBG:END MANAGED -->
