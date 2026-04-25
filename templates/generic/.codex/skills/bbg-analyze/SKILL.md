---
name: bbg-analyze
description: Use when the user asks an AI coding tool to run BBG Analyze, analyze a BBG-managed workspace, analyze business architecture, analyze technical architecture, perform focused business-function analysis, or mentions bbg analyze, analyze skill, 项目分析, 业务分析, 技术架构分析, or 指定业务点分析.
---

# BBG Analyze Bridge

<!-- BBG:BEGIN MANAGED -->
This is a project-local BBG bridge skill. It does not replace the repository-local canonical BBG skill.

When this skill triggers:

1. Confirm the current workspace contains `.bbg/config.json`.
2. Read `AGENTS.md`.
3. Read `RULES.md`.
4. Read `.bbg/harness/skills/analyze/SKILL.md` from the current workspace.
5. Follow that repository-local skill exactly.
6. Do not ask the user to run a public `bbg analyze` command.
7. Use BBG internal runners only when the repository-local skill instructs you to do so.

If `.bbg/harness/skills/analyze/SKILL.md` is missing, tell the user to run `bbg init`, `bbg upgrade`, or `bbg repair-adapters` in the target workspace.
<!-- BBG:END MANAGED -->
