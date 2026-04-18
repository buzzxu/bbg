# /resume

Use `bbg resume <task-id>` to continue a prepared or in-progress task session.

## Primary Use

- Resume work after switching tools
- Continue a task that was prepared in the terminal
- Rehydrate task context, handoff, and environment bindings

## Examples

```bash
bbg resume fix-checkout-timeout
bbg resume fix-checkout-timeout --json
```

## Related

- **Commands**: [start](./start.md), [status](./status.md)
- **Skills**: [workflow-orchestration](../skills/workflow-orchestration/SKILL.md)
- **Artifacts**: `.bbg/tasks/<task-id>/handoff.md`, `.bbg/tasks/<task-id>/decisions.json`
