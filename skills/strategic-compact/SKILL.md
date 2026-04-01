---
name: strategic-compact
category: ai-workflow
description: Context management — when to compact, what to preserve, how to summarize effectively for AI agents
---

# Strategic Compact

## Overview
Use this skill when managing long AI agent conversations or autonomous loops. Context windows are finite. Strategic compaction preserves critical information while freeing space for new work. Poor compaction loses important decisions; no compaction wastes tokens on irrelevant history.

## Workflow

### Step 1: Assess — Should You Compact?
Compact when:
- Context usage exceeds 60% of the window
- The conversation has shifted to a new task area
- Repeated information is consuming significant space
- Agent responses are becoming less accurate (context overflow symptoms)

Do NOT compact when:
- Actively debugging a complex issue (you'll lose the investigation trail)
- In the middle of a multi-step refactor (you'll lose the plan)
- Recent decisions haven't been committed or documented yet

### Step 2: Identify — What Must Be Preserved?
**Always preserve:**
- Current task and its requirements
- Active todo list and progress status
- Key architectural decisions made in this session
- File paths and line numbers being actively worked on
- Error messages and their resolutions that are still relevant
- Uncommitted changes and their purpose

**Safe to discard:**
- Exploratory searches that found nothing useful
- Tool output that's already been processed and acted on
- Verbose file contents that have been summarized
- Completed tasks with committed results
- Repeated failed attempts where the final solution was found

### Step 3: Summarize — How to Compact Effectively
- Lead with the current state: what's done, what's in progress, what's next
- Summarize decisions as "decided X because Y" — preserve the rationale
- List active files with their purpose, not their full contents
- Keep error patterns as "symptom → fix" pairs
- Preserve the todo list verbatim — it's the execution plan

### Step 4: Verify — Post-Compact Validation
- Can you still execute the current task without re-reading files?
- Are all uncommitted changes tracked and understood?
- Is the todo list complete and current?
- Are key decisions recorded with their rationale?

## Patterns

### Compact Summary Template
```
## Current State
- Task: [what we're doing and why]
- Progress: [what's done, what's in progress]
- Branch: [current git branch]

## Active Files
- path/to/file.ts — [purpose and current state]

## Key Decisions
- Decided X because Y
- Chose approach A over B because Z

## Todo
- [x] Completed item
- [ ] Current item (in progress)
- [ ] Next item

## Context
- [Any error patterns, conventions, or constraints discovered]
```

### Token Budget Allocation
- 20% — Preserved context (decisions, active state)
- 10% — Todo list and plan
- 70% — Available for new work (tool calls, file reads, code generation)

## Rules
- Never compact in the middle of an active debugging session
- Always preserve uncommitted changes and their purpose
- Always preserve the rationale for decisions, not just the decision
- Verify post-compact that you can continue the current task
- Use structured summaries, not prose paragraphs

## Anti-patterns
- Compacting too aggressively — losing decisions that need to be remade
- Never compacting — wasting tokens on irrelevant history
- Preserving raw file contents instead of summaries
- Losing the todo list during compaction
- Compacting without verifying you can still continue the task

## Checklist
- [ ] Context usage warrants compaction (>60% or task shift)
- [ ] Current task and requirements are preserved
- [ ] Todo list is preserved verbatim
- [ ] Key decisions preserved with rationale
- [ ] Active file paths and purposes preserved
- [ ] Uncommitted changes tracked
- [ ] Post-compact verification passed


## Related

- **Commands**: [/sessions](../../commands/sessions.md)
