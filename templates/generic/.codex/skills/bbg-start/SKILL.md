---
name: bbg-start
description: Use when the user asks an AI coding tool to start BBG-governed implementation work, start a task, begin a requirement workflow, create a governed task session, or mentions bbg start, start skill, 开始需求, 开始任务, or 启动开发流程.
---

# BBG Start Bridge

<!-- BBG:BEGIN MANAGED -->
This is a project-local BBG bridge skill. It delegates to the repository-local BBG Start workflow.

When this skill triggers:

1. Confirm the current workspace contains `.bbg/config.json`.
2. Read `AGENTS.md`.
3. Read `RULES.md`.
4. Read `.bbg/harness/skills/start/SKILL.md` from the current workspace.
5. Follow that repository-local skill exactly.
6. Do not ask the user to run a public `bbg start` command.
7. Keep task state, planning, verification, and Hermes lookup tied to the BBG task artifacts.

If `.bbg/harness/skills/start/SKILL.md` is missing, tell the user to run `bbg init`, `bbg upgrade`, or `bbg repair-adapters` in the target workspace.
<!-- BBG:END MANAGED -->
