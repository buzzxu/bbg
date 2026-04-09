# /analyze-repo

## Description

Run deep analysis for a single repository and update its living architecture file. Intended for immediate analysis after adding a new sub-repository.

## Usage

```
/analyze-repo user-service
/analyze-repo order-service --deep-interview
/analyze-repo payment-gateway --refresh-wiki
```

## Options

| Flag               | Default         | Description                                     |
| ------------------ | --------------- | ----------------------------------------------- |
| `--deep-interview` | `true`          | Run Socratic clarification for business context |
| `--refresh-wiki`   | `true`          | Sync updates into wiki knowledge layer          |
| `--focus`          | `tech,business` | Limit analysis sections                         |

## Process

1. Inspect repo stack, dependency graph, and test strategy
2. Optionally run deep-interview for unclear business behavior
3. Update `docs/architecture/repos/<repo>.md` in place
4. Update cross-repo references in `docs/architecture/repo-dependency-graph.md`
5. Optionally refresh wiki pages tied to this repo

## Output

- Updated repo architecture file: `docs/architecture/repos/<repo>.md`
- Updated dependency map and architecture index references

## Rules

- One repository, one living architecture file
- Keep historical changes in document-level changelog table
- Do not duplicate records in dated folders for architecture docs

## Related

- **Skills**: [deep-interview](../skills/deep-interview/SKILL.md), [architecture-analysis](../skills/architecture-analysis/SKILL.md)
- **Commands**: [/analyze](./analyze.md), [/interview](./interview.md)
