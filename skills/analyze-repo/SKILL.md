---
name: analyze-repo
category: internal
visibility: internal
description: Internal single-repository analysis helper that delegates to Analyze Skill or refreshes lightweight repo docs; do not expose as a user-facing entrypoint
---

# Analyze Repo Skill

Use this skill from `.bbg/harness/skills/analyze/SKILL.md` or `.bbg/harness/skills/add-repo/SKILL.md` when one repository needs targeted analysis.

Do not present this as a user-facing skill. Users should ask for Analyze; Analyze decides whether the scope is single-repo.

## Workflow

1. Identify the repository name from `.bbg/config.json`.
2. If deep analysis is needed, use `.bbg/harness/skills/analyze/SKILL.md`:
   - `bbg analyze-agent --repo <repo>`
   - `bbg analyze-agent "<focus query>" --repo <repo>`
3. Use the static internal runner only when you need a lightweight architecture file refresh:
   - `bbg analyze-repo-agent <repo>`
4. Read generated architecture and knowledge artifacts before summarizing.

## Rules

- Do not rely on static architecture output as the final project understanding.
- For new repositories, run Add Repo Skill first, then Analyze Skill.
- Keep analysis generic and evidence-backed; never hardcode business names or directories.

## Related

- [analyze skill](../analyze/SKILL.md)
- [add-repo skill](../add-repo/SKILL.md)
- [architecture analysis](../architecture-analysis/SKILL.md)
- [analyze-repo command](../../commands/analyze-repo.md)
