# /analyze

## Description

Run holistic multi-repository analysis for technical architecture, business architecture, and cross-project dependencies. Produces continuously updated architecture documents (single source of truth, not monthly snapshots).

## Usage

```
/analyze
/analyze --repos all
/analyze --repos user-service,order-service
/analyze --refresh-wiki
```

## Options

| Flag             | Default                    | Description                                       |
| ---------------- | -------------------------- | ------------------------------------------------- |
| `--repos`        | `all`                      | Target repositories to analyze                    |
| `--refresh-wiki` | `true`                     | Refresh wiki pages from updated architecture docs |
| `--focus`        | `tech,business,dependency` | Select analysis lenses                            |

## Process

1. Load repository inventory from `.bbg/config.json`
2. Analyze each repo stack, structure, dependencies, and testing profile
3. Update global technical architecture (`docs/architecture/technical-architecture.md`)
4. Update global business architecture (`docs/architecture/business-architecture.md`)
5. Update cross-repo dependency map (`docs/architecture/repo-dependency-graph.md`)
6. Update per-repo living docs under `docs/architecture/repos/<repo>.md`
7. Refresh architecture index and optional wiki sync

## Output

- `docs/architecture/index.md`
- `docs/architecture/technical-architecture.md`
- `docs/architecture/business-architecture.md`
- `docs/architecture/repo-dependency-graph.md`
- `docs/architecture/repos/<repo>.md`

## Rules

- Architecture docs are living documents; update in place
- Do not generate monthly snapshots for architecture docs
- Keep change log section inside each architecture document
- Preserve traceability to source repos and commit ranges

## Related

- **Skills**: [architecture-analysis](../skills/architecture-analysis/SKILL.md), [business-analysis](../skills/business-analysis/SKILL.md), [cross-repo-analysis](../skills/cross-repo-analysis/SKILL.md)
- **Commands**: [/analyze-repo](./analyze-repo.md), [/wiki-compile](./wiki-compile.md)
