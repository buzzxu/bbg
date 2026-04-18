---
name: agent-observability
category: ai-workflow
description: Organize UI, log, metric, and trace artifacts so agents can verify behavior directly.
---

# Agent Observability

## Overview

Use this skill when a task depends on direct runtime evidence. Observation sessions help agents collect UI artifacts, logs, metrics, and traces in one place so verification is tied to evidence rather than memory.

## Process

1. Start an observation session with `bbg observe start`.
2. Attach the session to a task environment when one exists.
3. Save screenshots, DOM snapshots, logs, metrics, and traces into the prepared directories.
4. Review the artifact counts and notes with `bbg observe report`.

## Rules

- Evidence should be captured in the observation session, not left in random temp folders
- Prefer one observation session per investigation
- Observation sessions support verification; they do not replace promotion or learning review

## Related

- [Observe Command](../../commands/observe.md)
- [E2E Testing Skill](../e2e-testing/SKILL.md)
- [Harness Engineering Skill](../harness-engineering/SKILL.md)
