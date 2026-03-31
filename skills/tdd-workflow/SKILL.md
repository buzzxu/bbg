---
name: tdd-workflow
category: testing
description: Test-driven development methodology with RED-GREEN-IMPROVE cycle, test-first development, coverage targets, and mocking strategies
---

# TDD Workflow

## Overview
Use this skill when implementing new features, fixing bugs, or refactoring. TDD ensures every line of code is justified by a failing test, prevents regressions, and produces better-designed APIs.

## Workflow

### Phase 1: RED — Write a Failing Test
1. Identify the smallest unit of behavior to implement
2. Write a test that describes the expected behavior
3. Run the test — confirm it fails for the right reason
4. If it passes, the behavior already exists — move on or refine the test

### Phase 2: GREEN — Make It Pass
1. Write the minimum code to make the failing test pass
2. Do not optimize, refactor, or add extra features
3. Run all tests — the new test must pass, no existing tests break
4. If tests break, fix the implementation, not the tests (unless tests are wrong)

### Phase 3: IMPROVE — Refactor with Confidence
1. Remove duplication in both test and production code
2. Improve naming, extract functions, simplify logic
3. Run all tests after every change — they must stay green
4. Stop refactoring when the code clearly expresses intent

### Repeat
- Pick the next smallest behavior and return to RED
- Commit after each GREEN-IMPROVE cycle

## Patterns

### Test Structure (AAA)
```
Arrange — Set up test data and dependencies
Act     — Execute the function under test
Assert  — Verify the expected outcome
```

### Mocking Strategy
- Mock at system boundaries only: filesystem, network, database, clock
- Never mock the module under test
- Prefer fakes (in-memory implementations) over mocks for repositories
- Use dependency injection to make mocking natural
- Reset all mocks between tests to prevent leakage

### Coverage Targets
- Line coverage: 80% minimum, 90%+ for critical paths
- Branch coverage: every `if`/`else` and `switch` case exercised
- Focus on behavior coverage, not line counting — uncovered lines indicate untested behavior

### Test Naming
- Format: `should <expected behavior> when <condition>`
- Example: `should return 404 when user does not exist`
- Group related tests with `describe` blocks by function or feature

## Rules
- Never write production code without a failing test first
- Tests must be independent — no shared mutable state between tests
- Tests must be fast — mock slow I/O, use in-memory alternatives
- One assertion per test (logical assertion — multiple `expect` calls are fine if testing one behavior)
- Delete tests that no longer describe real behavior

## Anti-patterns
- Writing tests after implementation (test-after is verification, not design)
- Testing implementation details instead of behavior
- Large integration tests where unit tests suffice
- Mocking everything — over-mocking makes tests brittle
- Skipping the IMPROVE phase — accumulates technical debt
- Test names that describe code (`test function X`) instead of behavior

## Checklist
- [ ] Wrote a failing test before writing production code
- [ ] Test fails for the expected reason (not a syntax error)
- [ ] Implementation is the minimum to pass the test
- [ ] All existing tests still pass
- [ ] Refactored both production and test code
- [ ] No test depends on execution order or shared state
- [ ] Mocks are only at system boundaries
- [ ] Coverage meets 80%+ threshold
