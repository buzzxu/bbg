---
name: coding-standards
category: coding
description: Language-agnostic coding standards for naming, file organization, immutability, error handling, DRY, and SOLID principles
---

# Coding Standards

## Overview
Apply these standards to every code change. They ensure consistency, maintainability, and readability across any language or framework. Load this skill before writing or reviewing code.

## Workflow
1. **Before writing code** — Review existing naming conventions in the project
2. **While writing** — Apply the rules below to every function, variable, and file
3. **After writing** — Self-review against the checklist before submitting

## Patterns

### Naming
- Variables: descriptive nouns (`userCount`, not `n` or `data`)
- Functions: verb phrases (`calculateTotal`, `fetchUserById`)
- Booleans: prefix with `is`, `has`, `should`, `can` (`isActive`, `hasPermission`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- Files: lowercase with hyphens (`detect-stack.ts`, not `detectStack.ts`)

### File Organization
- One concept per file — a file should have a single reason to change
- Group by feature, not by type (prefer `user/controller.ts` over `controllers/user.ts`)
- Keep files under 200 lines; extract when exceeding this threshold
- Index files only re-export — never contain logic

### Immutability
- Never mutate function arguments — create new objects with spread or structuredClone
- Use `const` by default; `let` only when reassignment is unavoidable
- Prefer `map`/`filter`/`reduce` over `for` loops that mutate accumulators
- Return new state from functions — never modify external variables

### Error Handling
- Handle errors at system boundaries — never silently swallow exceptions
- Use typed errors with context: `new AppError('USER_NOT_FOUND', { userId })`
- Fail fast on invalid input — validate at entry points
- Log errors with structured context, not just the message string
- Never expose internal details in user-facing error messages

### DRY & SOLID
- Extract shared logic into utility modules — never duplicate across files
- Single Responsibility: each function does one thing (<50 lines)
- Open/Closed: extend via composition, not modification of existing code
- Dependency Inversion: depend on abstractions (interfaces), not concretions
- If you copy-paste code, stop and extract a shared function

## Rules
- Every function must have explicit return types in TypeScript
- No magic numbers — extract to named constants
- No nested callbacks deeper than 2 levels — use async/await or extract functions
- All public APIs must have JSDoc/docstring comments
- Unused code must be deleted, not commented out

## Anti-patterns
- God files with 500+ lines handling multiple concerns
- Generic names like `data`, `info`, `temp`, `result` without context
- Mutating shared state or function parameters
- Catch-all error handlers that log and continue silently
- Premature abstraction — don't create interfaces until you have 2+ implementations

## Checklist
- [ ] All names are descriptive and follow conventions
- [ ] No file exceeds 200 lines
- [ ] No function exceeds 50 lines
- [ ] No mutable shared state
- [ ] All errors are explicitly handled with context
- [ ] No duplicated logic — shared code is extracted to utilities
- [ ] No magic numbers or strings — all extracted to constants
- [ ] No unused code left in the codebase
