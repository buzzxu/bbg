---
name: bbg-resume
description: Use when the user asks an AI coding tool to resume a BBG task, continue previous work, recover task context, switch AI tools while preserving BBG state, or mentions bbg resume, resume skill, 继续任务, 恢复任务, or 接着做.
---

# BBG Resume Bridge

<!-- BBG:BEGIN MANAGED -->
This is a project-local BBG bridge skill. It delegates to the repository-local BBG Resume workflow.

When this skill triggers:

1. Confirm the current workspace contains `.bbg/config.json`.
2. Read `AGENTS.md`.
3. Read `RULES.md`.
4. Read `.bbg/harness/skills/resume/SKILL.md` from the current workspace.
5. Follow that repository-local skill exactly.
6. Do not ask the user to run a public `bbg resume` command.
7. Rehydrate structured BBG task artifacts before editing code.

If `.bbg/harness/skills/resume/SKILL.md` is missing, tell the user to run `bbg init`, `bbg upgrade`, or `bbg repair-adapters` in the target workspace.
<!-- BBG:END MANAGED -->
