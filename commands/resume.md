# /resume

Use the Resume Skill. Do not ask the user to run a public `bbg resume` CLI command.

## Primary Use

- Resume work after switching tools
- Continue a task that was prepared in the terminal
- Rehydrate task context, handoff, and environment bindings

## Examples

- `/resume fix-checkout-timeout`
- Ask the AI to use `skills/resume/SKILL.md`

## Internal Runner

The skill may call `bbg resume-agent <task-id>` to rehydrate structured task state.

## Related

- **Commands**: [start](./start.md), [status](./status.md)
- **Skills**: [resume](../skills/resume/SKILL.md), [workflow-orchestration](../skills/workflow-orchestration/SKILL.md)
- **Artifacts**: `.bbg/tasks/<task-id>/handoff.md`, `.bbg/tasks/<task-id>/decisions.json`
