---
name: bbg-add-repo
description: Use when the user asks an AI coding tool to add or register a repository, add a local child project, add a remote Git repository, update BBG workspace repo configuration, or mentions bbg add-repo, add repo skill, 添加子项目, 添加仓库, or 注册仓库.
---

# BBG Add Repo Bridge

<!-- BBG:BEGIN MANAGED -->
This is a project-local BBG bridge skill. It delegates to the repository-local BBG Add Repo workflow.

When this skill triggers:

1. Confirm the current workspace contains `.bbg/config.json`.
2. Read `AGENTS.md`.
3. Read `RULES.md`.
4. Read `.bbg/harness/skills/add-repo/SKILL.md` from the current workspace.
5. Follow that repository-local skill exactly.
6. Do not ask the user to run a public `bbg add-repo` command.
7. Continue into `.bbg/harness/skills/analyze/SKILL.md` when the repository-local skill requires follow-up analysis.

If `.bbg/harness/skills/add-repo/SKILL.md` is missing, tell the user to run `bbg init`, `bbg upgrade`, or `bbg repair-adapters` in the target workspace.
<!-- BBG:END MANAGED -->
