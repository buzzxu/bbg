---
name: autonomous-loops
category: ai-workflow
description: Autonomous loop patterns — sequential pipelines, PR review loops, DAG orchestration, and error recovery
---

# Autonomous Loops

## Overview
Load this skill when designing or implementing AI agent workflows that operate with minimal human intervention. Autonomous loops enable agents to plan, execute, verify, and iterate on tasks independently while maintaining quality and safety guardrails.

## Patterns

### Sequential Pipeline
The simplest loop — steps execute in order with verification between each:
```
Plan → Implement → Verify → Fix → Verify → Commit
```
- Each step has clear entry/exit criteria
- Verification gates prevent bad output from propagating
- Failures loop back to the previous step (not the beginning)
- Maximum 3 retry loops before escalating to human

### Plan-Execute-Verify Loop
```
1. PLAN    — Break task into subtasks, identify files, estimate changes
2. EXECUTE — Implement one subtask at a time
3. VERIFY  — Run build + test + lint after each subtask
4. FIX     — If verification fails, fix and re-verify (max 3 attempts)
5. COMMIT  — Commit passing changes before moving to next subtask
6. REPEAT  — Move to next subtask
```
- Commit after each verified subtask — never accumulate large uncommitted changes
- Each subtask should be independently valuable and revertible
- Track progress with a todo list — mark items as completed

### PR Review Loop
Automated review cycle for pull requests:
```
1. ANALYZE  — Read PR diff, understand changes and intent
2. CHECK    — Run verification pipeline (build, test, lint, security)
3. REVIEW   — Apply code review rules to each changed file
4. COMMENT  — Post review comments with specific, actionable feedback
5. WAIT     — Wait for author to address comments
6. RE-CHECK — Verify fixes address the comments
7. APPROVE  — Approve when all checks pass and comments are resolved
```

### DAG Orchestration
For complex tasks with dependencies between subtasks:
```
Task A (independent) ──┐
Task B (independent) ──┼──→ Task D (depends on A, B)
Task C (independent) ──┘         │
                                 ▼
                          Task E (depends on D)
```
- Identify independent tasks that can run in parallel
- Map dependencies explicitly — never assume execution order
- Each node has its own verification step
- Failed nodes don't block independent branches

### Error Recovery
```
Level 1: Retry     — Same approach, fresh attempt (transient failures)
Level 2: Alternate — Different approach to same goal (logic failures)
Level 3: Partial   — Complete what's possible, skip blocked items
Level 4: Escalate  — Report to human with context and options
```
- Always capture error context: what failed, what was attempted, what state we're in
- Retry with exponential backoff for transient failures (network, rate limits)
- After 3 retries, switch to alternate approach
- Never loop infinitely — set maximum iterations and escalate

### Guard Rails
Safety mechanisms for autonomous operation:
- **Scope guard**: never modify files outside the defined scope
- **Destructive action guard**: confirm before deleting files, dropping tables, force-pushing
- **Token budget guard**: compact or stop before exceeding context limits
- **Time guard**: set maximum wall-clock time for autonomous operations
- **Quality gate**: every change must pass verification before proceeding
- **Rollback point**: commit frequently so every change is revertible

## Workflow Design Principles

### Incremental Progress
- Break large tasks into small, independently verifiable steps
- Commit after each successful step — never accumulate risk
- Each step should leave the codebase in a working state

### Observability
- Log what's being done at each step
- Track progress with a visible todo list
- Report verification results (pass/fail/skip) clearly
- On failure, report: what happened, what was tried, what's needed

### Determinism
- Same input should produce same plan
- Random or non-deterministic behavior makes debugging impossible
- Seed random operations when they can't be avoided

## Rules
- Every loop must have a maximum iteration count — never loop infinitely
- Every step must have verification before proceeding
- Commit after each verified subtask — never accumulate large changes
- Capture error context at every failure point
- Escalate to human after Level 3 recovery fails
- Never modify files outside the defined task scope

## Anti-patterns
- Infinite retry loops without escalation
- Accumulating large changes without intermediate commits
- No verification between steps — errors cascade
- Ignoring failures and continuing ("best effort" in production)
- No progress tracking — impossible to know where a loop stopped
- Autonomous destructive actions without confirmation

## Checklist
- [ ] Loop has maximum iteration count
- [ ] Each step has verification gate
- [ ] Error recovery follows the 4-level strategy
- [ ] Progress tracked with visible todo list
- [ ] Intermediate commits after each verified step
- [ ] Guard rails prevent out-of-scope changes
- [ ] Failure context captured for debugging
- [ ] Escalation path defined for unrecoverable errors


## Related

- **Agents**: [loop-operator](../../agents/loop-operator.md)
- **Commands**: [/loop-start](../../commands/loop-start.md), [/loop-status](../../commands/loop-status.md)
