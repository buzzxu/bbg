---
name: add-repo
category: workspace
visibility: user
description: AI-driven BBG repository registration for adding local or remote sub-projects to a target workspace, then continuing with Analyze Skill for business and technical understanding; use instead of a public bbg add-repo CLI command
---

# Add Repo Skill

Use this skill when the user wants to add/register a new repository or existing local sub-project into a BBG-managed workspace.

Do not ask the user to run `bbg add-repo`. Add Repo is an AI workflow. The CLI only provides an internal runner.

## Core Rule

- The internal command is `bbg add-repo-agent`. It is for this skill only and should not be presented as the user-facing entrypoint.
- Default behavior is non-interactive: infer repo type, stack, branch, and description from repository evidence.
- Never overwrite an existing repo registration unless the user explicitly requested replacement.
- After successful registration, continue with `.bbg/harness/skills/analyze/SKILL.md` for the new repository or affected workspace.

## Workflow

1. Confirm `.bbg/config.json` exists. If missing, tell the user to initialize the workspace first.
2. Determine the repository source from the user request or workspace evidence:
   - Existing local child repo: use a direct child path such as `./backend`.
   - Remote repo: use the Git URL.
3. Inspect enough evidence to choose a generic repo type:
   - `backend`, `frontend-web`, `frontend-h5`, `frontend-pc`, or `other`.
4. Run the internal runner:
   - Local repo: `bbg add-repo-agent ./repo-dir --type <type> --description "<short evidence-based description>" --yes`
   - Remote repo: `bbg add-repo-agent <git-url> --branch <branch> --type <type> --description "<short evidence-based description>" --yes`
5. Read `.bbg/repos/<repo>/registration.json` and `.bbg/config.json` to verify registration state.
6. Invoke Analyze Skill for the new repo:
   - Full new repo analysis: `bbg analyze-agent --repo <repo>`
   - Focused business analysis: `bbg analyze-agent "<focus query>" --repo <repo>`
7. Complete the AI analysis loop required by `.bbg/harness/skills/analyze/SKILL.md` before reporting completion.

## Output Expectations

Return a concise Chinese summary by default unless the workspace language says otherwise:

- Added repo name, source, branch, inferred type, and stack signals.
- Whether registration replaced an existing entry.
- Analyze Skill status and where the generated docs/knowledge were written.
- Any unresolved blockers with concrete next action.

## Evidence Rules

- Prefer real files: package manifests, build files, routes/controllers/pages, API clients, migrations, README files, and git remotes.
- Do not hardcode project-specific business names or directories.
- If the repo has ambiguous business meaning, state the ambiguity and let the Analyze Skill resolve it through evidence-backed analysis.

## Related

- [analyze skill](../analyze/SKILL.md)
- [workflow orchestration](../workflow-orchestration/SKILL.md)
- [add-repo command](../../commands/add-repo.md)
