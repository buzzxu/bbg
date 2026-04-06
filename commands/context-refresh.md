# /context-refresh

## Description
Regenerate the project's repo map and symbol maps. Run this when the codebase has changed significantly (new files, refactored modules, renamed symbols) to keep context loading accurate.

## Usage
```
/context-refresh
/context-refresh --repo-map
/context-refresh --symbol-map
/context-refresh --all
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--repo-map` | `false` | Regenerate only the repo map |
| `--symbol-map` | `false` | Regenerate only symbol map(s) |
| `--all` | `true` | Regenerate both repo map and symbol maps |

## Process
1. **Regenerate repo map** - Run `node .bbg/scripts/build-repo-map.js`.
2. **Regenerate symbol map(s)** - Run language-appropriate extractors from `.bbg/scripts/`.
3. **Report results** - Show file counts, symbol counts, and generation timestamps.

## Output
```
Repo map refreshed: 342 files scored -> .bbg/context/repo-map.json
Symbol map refreshed: 187 symbols extracted -> .bbg/context/symbol-map.json
Generated at: 2026-04-03T14:30:00Z
```

## Rules
- Run all available extractors by detecting scripts in `.bbg/scripts/`
- If an extractor fails (for example missing toolchain), warn and continue
- Never modify source code - analysis is read-only
- Suggest running after major refactors, branch switches, or merges
- Track refresh timestamps so context-loading can check freshness

## Examples
```
/context-refresh
/context-refresh --repo-map
/context-refresh --symbol-map
```

## Related
- **Skills**: [context-loading](../skills/context-loading/SKILL.md), [search-first](../skills/search-first/SKILL.md)
- **Commands**: [/context-budget](context-budget.md)
