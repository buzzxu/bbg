# /wiki-compile

## Description
Compile runtime outputs into durable wiki report or process pages so recurring operational evidence becomes maintainable project knowledge.

## Usage
```
/wiki-compile
/wiki-compile docs/wiki/reports/regression-risk-summary.md
/wiki-compile docs/wiki/processes/knowledge-compilation.md
```

## Input Sources
Compilation may use one or more of these source artifacts:

- telemetry summaries or exported SQL report output
- eval comparison output or saved eval report artifacts
- workflow summaries or workflow report artifacts
- red-team reports

Generator-owned files such as `.bbg/scripts/*.sql` are scaffolding inputs and tools, not compiled evidence artifacts themselves.

## Output Contract
- identify the source artifacts used
- update one or more report or process pages under `docs/wiki/`
- update `docs/wiki/index.md`
- append `docs/wiki/log.md`
- preserve or update frontmatter `sources`

## Process
1. **Select evidence** — Choose the runtime artifacts that support a stable report or process update
2. **Read current wiki targets** — Review `docs/wiki/index.md` plus any existing report or process pages that may need to be updated
3. **Synthesize a stable summary** — Extract durable findings from runtime outputs instead of copying raw command output verbatim
4. **Update canonical pages** — Create or revise one or more pages under `docs/wiki/reports/` or `docs/wiki/processes/`
5. **Maintain navigation and history** — Update `docs/wiki/index.md` and append a chronological entry to `docs/wiki/log.md`
6. **Preserve attribution** — Keep frontmatter `sources` aligned with the runtime artifacts that informed the update

## Rules
- Treat runtime outputs as derivative evidence that can inform durable wiki pages
- Do not treat `.bbg/scripts/*.sql` scaffolding files as compiled evidence artifacts
- Prefer updating existing canonical report or process pages before creating adjacent duplicates
- Preserve or update page frontmatter `sources` whenever compiled content changes
- Update `docs/wiki/index.md` and append `docs/wiki/log.md` every time compilation changes wiki content

## Related

- [Wiki Compilation Skill](../skills/wiki-compilation/SKILL.md)
- [Wiki Refresh Command](./wiki-refresh.md)
- [Wiki Query Command](./wiki-query.md)
