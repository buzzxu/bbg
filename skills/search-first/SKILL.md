---
name: search-first
category: coding
description: Research-before-coding workflow — understand existing code, find patterns, check for duplicates before writing
---

# Search First

## Overview
Load this skill before writing any new code. The most common source of technical debt is writing code that already exists or contradicts existing patterns. Searching first prevents duplication, maintains consistency, and builds understanding.

## Workflow

### Step 1: Understand the Request
- Restate the task in your own words
- Identify what components are affected (files, modules, APIs)
- Determine if this is new functionality or modification of existing behavior

### Step 2: Search for Existing Solutions
- **Function search**: grep for function names related to the task
- **Pattern search**: find how similar problems were solved elsewhere in the codebase
- **Utility search**: check `src/utils/` and shared modules for reusable helpers
- **Test search**: find existing tests that cover related behavior
- **Dependency search**: check if an installed dependency already provides this capability

### Step 3: Map the Context
- Trace the call chain: who calls this code? What calls does it make?
- Identify the data flow: where does input come from? Where does output go?
- Check for conventions: naming patterns, error handling style, logging format
- Read the relevant tests to understand expected behavior

### Step 4: Plan the Change
- Decide: extend existing code or create new modules?
- Identify reusable utilities — extract shared logic, don't duplicate
- Determine test strategy based on existing test patterns
- Document dependencies between your change and existing code

### Step 5: Implement with Consistency
- Follow patterns discovered in steps 2-3
- Reuse existing utilities instead of writing new ones
- Match the naming conventions, error handling, and code organization
- Write tests that follow the existing test style

## Search Techniques

### Finding Existing Implementations
```
# Search for similar function names
grep -r "functionName\|relatedConcept" src/

# Find files by feature area
find src/ -name "*feature*" -o -name "*related*"

# Search for patterns in tests
grep -r "describe.*FeatureName\|it.*should" tests/

# Check utilities for reusable helpers
ls src/utils/
```

### Finding Conventions
- Look at 3+ examples of similar code to identify the pattern
- Check recent commits for the latest accepted style
- Read the project's AGENTS.md or style guide
- Review existing tests for assertion patterns and structure

## Rules
- Never write a utility function without checking `src/utils/` first
- Never create a new pattern when an existing pattern covers the case
- Always trace the call chain before modifying a function
- Always read existing tests before writing new ones
- If you find duplicate code during search, flag it for refactoring

## Anti-patterns
- Starting to code immediately without reading existing code
- Creating a new helper function that duplicates an existing utility
- Using a different error handling pattern than the rest of the codebase
- Writing tests in a different style than existing tests
- Ignoring existing abstractions and working at a lower level

## Checklist
- [ ] Searched for existing implementations of similar functionality
- [ ] Checked `src/utils/` for reusable helpers
- [ ] Identified and followed existing code patterns and conventions
- [ ] Traced the call chain to understand impact of changes
- [ ] Read existing tests to understand expected behavior and test style
- [ ] No duplicated logic — reused existing utilities where possible
- [ ] Planned the change before writing code
