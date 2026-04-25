---
name: start
category: workflow
visibility: user
description: AI-driven BBG task start workflow for beginning implementation work from a user request; use instead of a public bbg start CLI command
---

# Start Skill

Use this skill when the user wants to begin implementation work, start a task, or create a governed task session.

Do not ask the user to run `bbg start`. Starting work is an AI workflow because the agent must understand the request, load project context, decide the right workflow path, and then execute.

## Workflow

1. Confirm `.bbg/config.json` exists. If missing, ask the user to run `bbg init` first.
2. Read `AGENTS.md`, `RULES.md`, and relevant `.bbg/harness/skills/*/SKILL.md` files for the task.
3. Run the internal runner to create task state:
   - `bbg start-agent "<task>"`
   - Use `--json` only when machine-readable state is needed.
4. Read generated artifacts:
   - `.bbg/tasks/<task-id>/session.json`
   - `.bbg/tasks/<task-id>/decisions.json`
   - `.bbg/tasks/<task-id>/context.json`
   - `.bbg/tasks/<task-id>/handoff.md`
5. Continue with planning, TDD, review, verification, and Hermes lookup according to the generated decisions.

## Rules

- Do not treat the runner output as the implementation itself.
- If the task is ambiguous, clarify before editing code.
- For substantial work, create or follow a concrete implementation plan.
- Keep all verification evidence tied back to the task session.

## Related

- [start command](../../commands/start.md)
- [resume skill](../resume/SKILL.md)
- [task intake](../task-intake/SKILL.md)
- [workflow orchestration](../workflow-orchestration/SKILL.md)
