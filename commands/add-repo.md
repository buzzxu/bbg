# add-repo

Use the Add Repo Skill. Do not ask the user to run a public `bbg add-repo` CLI command.

Add Repo is an AI workflow because repository registration must preserve workspace context and continue into AI-driven project analysis.

## Steps

1. Read `skills/add-repo/SKILL.md`.
2. Register the local or remote repository with the internal `bbg add-repo-agent` runner.
3. Verify `.bbg/config.json` and `.bbg/repos/<repo>/registration.json`.
4. Continue with `skills/analyze/SKILL.md` so the new repository is included in business and technical architecture knowledge.

## Expected output

- Added repository name, source, branch, inferred type, and stack signals
- Registration state path
- Analyze Skill completion or concrete blocker

## Related

- [analyze](analyze.md)
- [start](start.md)
- [add-repo skill](../skills/add-repo/SKILL.md)
- [analyze skill](../skills/analyze/SKILL.md)
