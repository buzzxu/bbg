# /start -- Primary Task Entry

<!-- BBG:BEGIN MANAGED -->
Run the project-local BBG Start Skill adapter: `.claude/skills/bbg-start/SKILL.md`, then follow `.bbg/harness/skills/start/SKILL.md`.

The skill may call `bbg start-agent "<task>"` internally. After task state exists, prefer:

1. `.bbg/tasks/<task-id>/context.json`
2. `.bbg/tasks/<task-id>/handoff.md`
3. `.bbg/tasks/<task-id>/decisions.json`

If Claude was launched by `bbg`, prefer the injected `BBG_TASK_*`, `BBG_LOOP_*`, `BBG_HANDOFF_PATH`, `BBG_CONTEXT_PATH`, `BBG_RESUME_STRATEGY`, and `BBG_RECOVERY_PLAN` environment variables when present.

If the CLI task flow is unavailable:

1. Read `AGENTS.md`
2. Read `RULES.md`
3. Follow `.bbg/harness/commands/start.md`
4. Resume an existing task with `.bbg/harness/skills/resume/SKILL.md` when applicable
<!-- BBG:END MANAGED -->
