# /start

Use `bbg start "<task>"` as the primary entrypoint for implementation work.

## Primary Use

- Create a task session
- Run workflow planning decisions
- Prepare task environments, observation sessions, and Hermes query guidance when needed

## Examples

```bash
bbg start "Fix checkout timeout"
bbg start "Add payment retry flow" --json
```

## Outputs

- `.bbg/tasks/<task-id>/session.json`
- `.bbg/tasks/<task-id>/decisions.json`
- `.bbg/tasks/<task-id>/context.json`
- `.bbg/tasks/<task-id>/handoff.md`

## Related

- **Commands**: [resume](./resume.md), [status](./status.md), [task-env](./task-env.md), [observe](./observe.md)
- **Skills**: [workflow-orchestration](../skills/workflow-orchestration/SKILL.md), [task-environments](../skills/task-environments/SKILL.md)
- **Rules**: [patterns](../rules/common/patterns.md), [testing](../rules/common/testing.md)
