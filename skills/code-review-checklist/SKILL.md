---
name: code-review-checklist
category: operations
description: Structured code review covering security, correctness, performance, readability, test coverage, and feedback best practices
---

# Code Review Checklist

## Overview
Load this skill when reviewing pull requests, preparing code for review, or establishing team review standards. Effective code reviews catch bugs, spread knowledge, and maintain quality — but only when done with focus and structure.

## Workflow
1. **Understand context** — Read the PR description, linked issues, and related design docs before looking at code
2. **High-level pass** — Scan the full diff for architecture, design, and approach concerns
3. **Detailed pass** — Review each file against the checklist below, annotating as you go
4. **Summarize** — Leave an overall review comment with verdict: approve, request changes, or comment
5. **Follow up** — Verify fixes address your feedback; do not rubber-stamp re-reviews

## Key Patterns

### Correctness
- Does the code do what the PR description claims?
- Are edge cases handled — empty inputs, null values, boundary conditions, concurrent access?
- Are error paths handled explicitly — no swallowed exceptions, no silent failures?
- Do state transitions have clear preconditions and postconditions?

### Security
- Is all user input validated and sanitized at system boundaries?
- Are database queries parameterized — no string concatenation?
- Are secrets absent from code, config, test fixtures, and comments?
- Are authorization checks present on every endpoint and data access path?
- Do error messages avoid leaking internal details?

### Performance
- Are there N+1 query patterns or unnecessary database round-trips?
- Are expensive operations (I/O, network, crypto) kept out of hot loops?
- Is pagination implemented for list endpoints?
- Are results cached where appropriate with clear invalidation logic?

### Readability
- Are names descriptive — can you understand the code without reading the implementation?
- Are functions small and focused — doing one thing well?
- Is complex logic accompanied by comments explaining "why", not "what"?
- Is the code consistent with the existing codebase style?

### Test Coverage
- Are there tests for the happy path, edge cases, and error paths?
- Do tests verify behavior, not implementation details?
- Are tests deterministic — no flaky timing or ordering dependencies?
- Is the test-to-code ratio reasonable for the risk level of the change?

### Design
- Does the change follow existing patterns in the codebase?
- Is the change in the right layer (controller vs service vs repository)?
- Are new abstractions justified — is the complexity earned?
- Could the change be smaller or split into incremental PRs?

## Best Practices
- Review within 4 hours for small PRs (<200 lines), within 1 business day for larger ones
- Limit review sessions to 60 minutes — effectiveness drops sharply after that
- Distinguish blocking issues (prefix: `MUST`) from suggestions (prefix: `NIT` or `SUGGESTION`)
- Ask questions before assuming intent — "What happens if X?" is better than "This is wrong"
- Praise good patterns — reinforcement spreads best practices across the team
- Use "we" language — "We should handle the null case" rather than "You forgot to handle null"

## Anti-patterns
- Rubber-stamping — approving without reading the code
- Style nitpicking on non-automated concerns — automate formatting with Prettier/ESLint
- Blocking PRs for days without communication
- Reviewing >500 lines in one sitting — defect detection rate drops to near zero
- Rewriting the PR in review comments — discuss large changes in person first
- Gatekeeping — using reviews to enforce personal preferences rather than team standards

## Checklist
- [ ] PR description explains what, why, and how to test
- [ ] No hardcoded secrets, tokens, or credentials
- [ ] All user inputs validated at system boundaries
- [ ] Error handling is explicit — no swallowed exceptions
- [ ] Edge cases covered: nulls, empty collections, boundaries, concurrency
- [ ] Tests present for happy path, error path, and edge cases
- [ ] No N+1 queries or unbounded list operations
- [ ] Functions are small, named clearly, and do one thing
- [ ] Change is consistent with existing codebase patterns
- [ ] PR is appropriately sized — under 400 lines of logic changes
