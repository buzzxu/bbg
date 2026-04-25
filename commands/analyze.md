# /analyze

Use the Analyze Skill. Do not ask the user to run a public `bbg analyze` CLI command.

## Primary Use

- First-time project analysis after `bbg init`
- Full workspace business and technical architecture analysis across registered repositories
- Focused business-function analysis, for example `售后流程分析`
- Bootstrapping or refreshing repo/workspace Hermes and wiki knowledge

## Process

1. Read `skills/analyze/SKILL.md`
2. Follow its internal workflow exactly
3. Use `bbg analyze-agent` only as the skill's internal evidence runner
4. Complete the AI reasoning response and rerun the internal command until analysis is complete
5. Summarize final docs, knowledge artifacts, unknowns, and next actions for the user

## Outputs

- `.bbg/analyze/latest.json`
- `.bbg/analyze/runs/<run-id>.json`
- Repo and workspace docs under `docs/`
- Repo and workspace knowledge under `.bbg/knowledge/`
- Wiki and Hermes intake artifacts when available

## Related

- **Skills**: [analyze](../skills/analyze/SKILL.md), [architecture-analysis](../skills/architecture-analysis/SKILL.md), [business-analysis](../skills/business-analysis/SKILL.md), [cross-repo-analysis](../skills/cross-repo-analysis/SKILL.md)
- **Commands**: [start](./start.md), [status](./status.md), [analyze-repo](./analyze-repo.md)
- **Rules**: [patterns](../rules/common/patterns.md)
