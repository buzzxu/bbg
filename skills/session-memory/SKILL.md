---
name: session-memory
category: ai-workflow
description: Long-task session memory - persist decisions across steps and sessions using structured summaries and SQLite storage
---

# Session Memory

## Overview
Use this skill during multi-step tasks that span long conversations or multiple sessions. AI context windows are finite - when a long task requires many steps, earlier decisions get pushed out of context. This skill maintains a decision chain that preserves critical choices, rationale, and outcomes to ensure continuity after compaction or session restart.

## Prerequisites
- SQLite database at `.bbg/telemetry.db` with session tables (from `.bbg/scripts/context-schema.sql`)
- Fallback: decisions can be written to `.bbg/context/session-decisions.json` if SQLite is unavailable

## Decision Record Format
Each key step produces a structured record:

```json
{
  "step": "Step 3: Choose database schema",
  "decision": "Use single table with JSON columns instead of normalized schema",
  "reason": "Fewer migrations needed and data shape varies per event type",
  "outcome": "Created events table with 7 columns including JSON details blob"
}
```

## Workflow

### Step 1: Initialize Session Memory
At the start of a long task, create a session ID and record task start in `session_decisions`.

### Step 2: Record Decisions at Key Steps
Record decisions after significant choice points (approach selection, architectural choices, major blockers, milestone pivots). Avoid recording routine edits.

### Step 3: Restore Session on Resume
When resuming, load the decision chain first by querying `session_decisions` by `task_id` ordered by timestamp.

### Step 4: Cross-Session Continuity
For tasks spanning sessions:
1. End of session: persist all decisions.
2. Start of next session: query decisions for the active task.
3. Rebuild context from decisions and load only files needed for the next step.

### Step 5: Complete the Task
Record a final completion decision with `outcome = complete`.

## Memory Compaction
Before compaction:
1. Persist all unrecorded decisions.
2. After compaction, restore decision chain from storage.
3. Continue from the latest decision state instead of replaying full history.

## File Association Tracking
Link files to tasks in `file_associations` so resuming can focus on recently modified or created files.

## Rules
- Record decisions only at meaningful choice points
- Always include the reason - the why matters more than the what
- Persist decisions before compaction
- On resume, load decisions before loading files
- Keep decision text concise
- Never delete decision history

## Anti-patterns
- Recording every micro-edit as a decision
- Recording decisions without rationale
- Waiting until session end to persist decisions
- Reloading all prior files instead of using decision chain
- Omitting outcomes

## Checklist
- [ ] Session ID established and recorded
- [ ] Decisions recorded at each key choice point
- [ ] All decisions include step, decision, reason, and outcome
- [ ] Decisions persisted to SQLite (or JSON fallback)
- [ ] Session restoration tested from decision chain alone
- [ ] File associations tracked for modified/created files
- [ ] Task marked complete when finished

## Related
- **Commands**: [/context-refresh](../../commands/context-refresh.md), [/sessions](../../commands/sessions.md), [/checkpoint](../../commands/checkpoint.md)
- **Skills**: [context-loading](../context-loading/SKILL.md), [strategic-compact](../strategic-compact/SKILL.md)
