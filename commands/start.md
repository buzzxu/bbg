# /start

Use the Start Skill. Do not ask the user to run a public `bbg start` CLI command.

## Primary Use

- Create a task session
- Run workflow planning decisions
- Prepare task environments, observation sessions, and Hermes query guidance when needed

## Examples

- `/start "Fix checkout timeout"`
- Ask the AI to use `skills/start/SKILL.md`

## Outputs

- `.bbg/tasks/<task-id>/session.json`
- `.bbg/tasks/<task-id>/decisions.json`
- `.bbg/tasks/<task-id>/context.json`
- `.bbg/tasks/<task-id>/handoff.md`

## Internal Runner

The skill may call `bbg start-agent "<task>"` to create structured task state.

## Related

- **Commands**: [resume](./resume.md), [status](./status.md), [task-env](./task-env.md), [observe](./observe.md)
- **Skills**: [start](../skills/start/SKILL.md), [workflow-orchestration](../skills/workflow-orchestration/SKILL.md), [task-environments](../skills/task-environments/SKILL.md)
- **Rules**: [patterns](../rules/common/patterns.md), [testing](../rules/common/testing.md)
