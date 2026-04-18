# /doc-garden

## Description

Scan repository docs for stale or missing local references so the repo stays agent-readable over time.

## Usage

```
/doc-garden
/doc-garden --status
```

## Process

1. Scan markdown files under `docs/` plus root governance docs.
2. Resolve local file references mentioned in links and inline code paths.
3. Flag missing references immediately.
4. Flag stale references when the referenced file changed after the document.
5. Save the latest report under `.bbg/doc-garden/latest.json`.

## Rules

- Missing references are high-priority findings
- Stale references should be reviewed before major workflow changes land
- Repo docs should stay navigable by agents without outside explanation

## Related

- [Update Docs Command](./update-docs.md)
- [Harness Audit Command](./harness-audit.md)
- [Doc Gardening Skill](../skills/doc-gardening/SKILL.md)
