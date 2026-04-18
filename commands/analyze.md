# /analyze

Use `bbg analyze` to build or refresh project understanding before implementation work.

## Primary Use

- First-time project analysis after `bbg init`
- Refreshing repo or workspace technical and business summaries
- Bootstrapping repo/workspace Hermes knowledge

## Examples

```bash
bbg analyze
bbg analyze --repo api
bbg analyze --json
```

## Outputs

- `.bbg/analyze/latest.json`
- `.bbg/analyze/runs/<run-id>.json`
- Repo and workspace docs under `docs/`
- Repo and workspace knowledge under `.bbg/knowledge/`

## Related

- **Commands**: [start](./start.md), [status](./status.md), [analyze-repo](./analyze-repo.md)
- **Skills**: [architecture-analysis](../skills/architecture-analysis/SKILL.md), [business-analysis](../skills/business-analysis/SKILL.md), [cross-repo-analysis](../skills/cross-repo-analysis/SKILL.md)
- **Rules**: [patterns](../rules/common/patterns.md)
