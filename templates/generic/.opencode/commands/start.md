---
description: Run the primary task start flow
---

# /start -- Primary Task Entry

<!-- BBG:BEGIN MANAGED -->
Run `bbg start "<task>"`.

After `bbg start`, prefer the structured task state from:

1. `.bbg/tasks/<task-id>/context.json`
2. `.bbg/tasks/<task-id>/handoff.md`
3. `.bbg/tasks/<task-id>/decisions.json`

If OpenCode was launched by `bbg`, prefer the injected `BBG_TASK_*`, `BBG_LOOP_*`, `BBG_HANDOFF_PATH`, `BBG_CONTEXT_PATH`, `BBG_RESUME_STRATEGY`, and `BBG_RECOVERY_PLAN` environment variables when present.

If the CLI task flow is unavailable:

1. Read `AGENTS.md`
2. Read `RULES.md`
3. Follow `commands/start.md`
4. Resume an existing task with `bbg resume <task-id>` when applicable
<!-- BBG:END MANAGED -->
