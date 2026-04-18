---
name: doc-gardening
category: ai-workflow
description: Keep repo docs fresh, linked, and agent-readable through repeatable stale-reference scans.
---

# Doc Gardening

## Overview

Use this skill when repo docs start drifting from code or workflow behavior. Doc gardening keeps the repository readable for agents by regularly scanning for stale or missing local references.

## Process

1. Run `bbg doc-garden`.
2. Review missing references first.
3. Review stale references where code changed after the document.
4. Update docs or remove obsolete links.
5. Re-run the scan until the report is clean enough for the current change.

## Rules

- Missing local references are never acceptable in core governance docs
- Stale workflow docs should be updated before major process changes are declared complete
- Repo documentation is a runtime dependency for agent effectiveness, not a side artifact

## Related

- [Doc Garden Command](../../commands/doc-garden.md)
- [Update Docs Command](../../commands/update-docs.md)
- [Harness Engineering Skill](../harness-engineering/SKILL.md)
