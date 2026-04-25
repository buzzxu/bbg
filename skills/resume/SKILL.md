---
name: resume
category: workflow
visibility: user
description: AI-driven BBG task resume workflow for continuing a governed task session; use instead of a public bbg resume CLI command
---

# Resume Skill

Use this skill when the user wants to continue a previous BBG task, switch AI tools, or recover context from a prepared session.

Do not ask the user to run `bbg resume`. Resume is an AI workflow because the agent must rehydrate context, reconcile current workspace state, and continue safely.

## Workflow

1. Identify the task id from the user request, `.bbg/tasks/index.json`, or `bbg status --json`.
2. Run the internal runner:
   - `bbg resume-agent <task-id>`
   - Use `--json` when you need exact file paths and task state.
3. Read task artifacts before making changes:
   - `.bbg/tasks/<task-id>/context.json`
   - `.bbg/tasks/<task-id>/handoff.md`
   - `.bbg/tasks/<task-id>/decisions.json`
4. Check current git status and verify whether previous work is complete, partial, or conflicting.
5. Continue from the next safe workflow step.

## Rules

- Never resume from memory alone when structured task artifacts exist.
- If the task id is ambiguous, inspect available sessions and choose the latest relevant one.
- If workspace changes conflict with handoff assumptions, stop and explain the conflict.

## Related

- [resume command](../../commands/resume.md)
- [start skill](../start/SKILL.md)
- [session memory](../session-memory/SKILL.md)
- [workflow orchestration](../workflow-orchestration/SKILL.md)
