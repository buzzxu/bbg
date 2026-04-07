# /wiki-refresh

## Description
Refresh existing canonical wiki pages from newer runtime evidence so maintained reports and processes stay aligned with current operational signals.

## Usage
```
/wiki-refresh
/wiki-refresh docs/wiki/reports/workflow-stability-summary.md
/wiki-refresh docs/wiki/processes/knowledge-compilation.md
```

## Refresh vs Ingest
- refresh updates existing canonical wiki pages from newer runtime evidence
- refresh should prefer updating report or process pages in place
- refresh should mark pages `stale` or `superseded` when appropriate

## Process
1. **Identify candidate pages** — Choose the existing report or process pages that may be outdated
2. **Compare newer runtime evidence** — Review the latest runtime artifacts relevant to each page
3. **Update in place when canonical** — Refresh the page body and frontmatter when the page remains the right canonical destination
4. **Mark lifecycle state** — Mark pages `stale` or `superseded` when they no longer reflect current evidence cleanly
5. **Record the refresh** — Update `docs/wiki/index.md` if needed and append `docs/wiki/log.md`

## Rules
- Distinguish refresh from raw-source ingest; refresh starts from existing canonical wiki pages plus newer runtime evidence
- Prefer in-place updates for report and process pages that remain canonical
- Mark pages `stale` or `superseded` instead of silently leaving misleading content in place
- Preserve or update frontmatter `sources` whenever the evidence set changes

## Related

- [Wiki Maintenance Skill](../skills/wiki-maintenance/SKILL.md)
- [Wiki Compile Command](./wiki-compile.md)
- [Wiki Lint Command](./wiki-lint.md)
