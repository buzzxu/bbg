---
name: bbg-deliver
description: Use when the user asks an AI coding tool to prepare a BBG delivery report, customer-facing summary, implementation delivery artifact, release handoff, or mentions bbg deliver, deliver skill, 交付报告, 客户报告, or 交付总结.
---

# BBG Deliver Bridge

<!-- BBG:BEGIN MANAGED -->
This is a project-local BBG bridge skill. It delegates to the repository-local BBG Deliver workflow.

When this skill triggers:

1. Confirm the current workspace contains `.bbg/config.json`.
2. Read `AGENTS.md`.
3. Read `RULES.md`.
4. Read `.bbg/harness/skills/deliver/SKILL.md` from the current workspace.
5. Follow that repository-local skill exactly.
6. Do not ask the user to run a public `bbg deliver` command.
7. Review generated content for business clarity, evidence, and sensitive information before presenting it.

If `.bbg/harness/skills/deliver/SKILL.md` is missing, tell the user to run `bbg init`, `bbg upgrade`, or `bbg repair-adapters` in the target workspace.
<!-- BBG:END MANAGED -->
