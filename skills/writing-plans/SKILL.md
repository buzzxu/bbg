---
name: writing-plans
category: planning
description: Structured implementation planning — break complex tasks into ordered, testable steps before writing code
---

# Writing Plans

## Overview
Load this skill before implementing any complex feature or refactoring that involves more than 2-3 files. A well-written plan prevents wasted work, ensures nothing is missed, and makes progress visible. Plans are the foundation for TDD and subagent-driven development workflows.

## When to Write a Plan

- New feature touching 3+ files
- Refactoring that crosses module boundaries
- Bug fix requiring changes in multiple layers
- Any task where the approach is not immediately obvious

## Workflow

### Step 1: Understand the Requirements
- Read the spec, issue, or user request carefully
- Identify acceptance criteria — what does "done" look like?
- List questions and resolve ambiguity before planning
- Check for constraints: backward compatibility, performance, security

### Step 2: Analyze the Codebase
- Search for existing patterns related to the task
- Map the affected files and their dependencies
- Identify shared utilities that can be reused
- Note any existing tests that cover the area

### Step 3: Design the Task Breakdown
- Break the work into discrete, ordered tasks
- Each task should produce a working, testable commit
- Order tasks by dependency — later tasks assume earlier ones are complete
- Keep tasks small enough to hold in context (1-3 files per task)

### Step 4: Write the Plan Document
- Use checkbox syntax for tracking: `- [ ] Step N: description`
- For each task, specify:
  - **Files to create or modify** (with line numbers if modifying)
  - **Exact changes** (code snippets, not vague descriptions)
  - **Expected test results** (what passes, what fails)
  - **Commit message**
- Include a "File Structure" section listing all new/modified files

### Step 5: Self-Review the Plan
- Does every task produce a working state? No broken intermediate commits.
- Are tasks ordered correctly? No forward dependencies.
- Is anything missing? Cross-check against requirements.
- Are the code snippets accurate? Verify against actual file contents.
- Is the plan specific enough for someone else (or a subagent) to execute?

## Plan Template

```markdown
# [Feature/Task] Implementation Plan

**Goal:** [One sentence describing what this plan achieves]
**Tech Stack:** [Languages, frameworks, tools]
**Current state:** [What exists now — test counts, known issues]

---

## File Structure

### New files to create
| File | Responsibility |

### Existing files to modify
| File | Change |

---

## Task N: [Task Name]

**Files:**
- Create: `path/to/new-file.ts`
- Modify: `path/to/existing-file.ts:30-45`

- [ ] **Step 1: [Description]**
  [Exact code or instructions]

- [ ] **Step 2: [Description]**
  [Exact code or instructions]

- [ ] **Step N: Run tests**
  Expected: [specific result]

- [ ] **Step N+1: Commit**
  `git add -A && git commit -m "type: description"`
```

## Quality Checklist

- [ ] Every task has explicit file paths
- [ ] Every task ends with a test step and commit
- [ ] Tasks are ordered by dependency
- [ ] No task modifies more than 3 files
- [ ] Code snippets match actual codebase patterns
- [ ] Edge cases and error handling are addressed
- [ ] Plan is executable by someone with no prior context

## Related

- **Agents**: [planner](../../agents/planner.md), [architect](../../agents/architect.md)
- **Rules**: [patterns](../../rules/common/patterns.md), [coding-style](../../rules/common/coding-style.md)
- **Commands**: [/plan](../../commands/plan.md)
