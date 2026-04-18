# /status

Use `bbg status` to inspect the current analyze run and task session state.

## Primary Use

- See active task sessions
- See the latest analyze run
- Check task environment bindings from the primary workflow entrypoints

## Examples

```bash
bbg status
bbg status --json
```

## Related

- **Commands**: [start](./start.md), [resume](./resume.md), [analyze](./analyze.md)
- **Artifacts**: `.bbg/analyze/latest.json`, `.bbg/tasks/`
