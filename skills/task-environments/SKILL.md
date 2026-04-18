---
name: task-environments
category: ai-workflow
description: Create isolated git worktree task environments with dedicated verification artifacts.
---

# Task Environments

## Overview

Use this skill when a task needs isolation, reproducibility, or richer runtime verification. A task environment creates a dedicated worktree plus organized artifact directories so agents can validate work without polluting the main workspace.

## Process

1. Start a task environment with `bbg task-env start`.
2. Work inside the generated worktree for code, app runtime, and verification.
3. Store screenshots, logs, metrics, and traces in the matching artifact directories.
4. Keep notes in the environment note file so handoffs stay lightweight.
5. Finish the environment once the task is complete.

## Rules

- One active environment per task is the default
- Prefer environment-local verification artifacts over ad hoc temp files
- Close finished environments to avoid stale worktrees

## Related

- [Task Env Command](../../commands/task-env.md)
- [Observe Command](../../commands/observe.md)
- [Harness Engineering Skill](../harness-engineering/SKILL.md)
