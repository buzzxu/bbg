# /wiki-lint

## Description
Audit the wiki for structural and content health issues so gaps, duplication, and weak maintenance signals can be corrected systematically.

## Usage
```
/wiki-lint
/wiki-lint docs/wiki/
/wiki-lint --focus concepts
```

## Process
1. **Scan the wiki** — Review wiki structure and relevant pages across `docs/wiki/`
2. **Find orphan pages** — Detect pages that are not reachable from `docs/wiki/index.md` or related links
3. **Check source coverage** — Identify pages with missing source references or claims that cannot be traced cleanly
4. **Flag stale content** — Note statements that appear outdated, unsupported, or in conflict with newer material
5. **Review linking quality** — Detect weak cross-links and duplicate concepts that should be merged, linked, or clarified
6. **Report fixes** — Produce a categorized report with actionable maintenance steps

## Output
- Categorized findings for orphan pages, missing sources, stale claims, weak cross-links, and duplicate concepts
- Actionable fixes for each finding
- Prioritized summary of the most important wiki maintenance work

## Rules
- Review structure as well as content quality
- Group findings by category so follow-up work is easy to assign
- Prefer concrete, low-ambiguity fixes over general observations
- Flag duplicate concepts even when wording differs
- Call out stale or weakly supported claims instead of silently ignoring them

## Examples
```
/wiki-lint
/wiki-lint docs/wiki/
/wiki-lint --focus decisions
```

## Related

- [Wiki Lint Skill](../skills/wiki-lint/SKILL.md)
- [Wiki Ingest Command](./wiki-ingest.md)
- [Wiki Query Command](./wiki-query.md)
