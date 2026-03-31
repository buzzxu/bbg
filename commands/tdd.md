# /tdd

## Description
Execute a strict Test-Driven Development workflow: write a failing test first (RED), implement the minimum code to pass (GREEN), then refactor for quality (IMPROVE). Enforces the TDD cycle discipline.

## Usage
```
/tdd "feature or behavior to implement"
/tdd "User can reset their password via email"
```

## Process
1. **Understand the requirement** — Clarify what behavior needs to be tested
2. **RED phase** — Write a failing test that describes the expected behavior
   - Run the test to confirm it fails for the right reason
   - Test must be specific and isolated
3. **GREEN phase** — Write the minimum code to make the test pass
   - No extra logic, no premature abstractions
   - Run the test to confirm it passes
4. **IMPROVE phase** — Refactor both test and implementation
   - Remove duplication, improve naming, extract helpers
   - Run tests again to ensure nothing broke
5. **Repeat** — If more behaviors are needed, start a new RED cycle

## Output
After each cycle:
- The failing test (RED) with test runner output
- The implementation (GREEN) with passing test output
- The refactored code (IMPROVE) with all tests passing
- Summary of what was implemented and what remains

## Rules
- NEVER write implementation before the test
- NEVER write more implementation than needed to pass the current test
- ALWAYS run the test at each phase transition
- One behavior per cycle — keep cycles small
- Use the project's existing test framework (vitest for this project)

## Examples
```
/tdd "detectStack should identify Python projects by pyproject.toml"
/tdd "doctor command should warn when AGENTS.md is missing"
/tdd "Template rendering should escape HTML in user inputs"
```
