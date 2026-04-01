# /e2e

## Description
Generate end-to-end tests using Playwright with Page Object Model pattern. Covers critical user flows and regression scenarios.

## Usage
```
/e2e "user flow description"
/e2e "User registration and login flow"
```

## Process
1. **Identify flows** — Map the critical user journey to test
2. **Design page objects** — Create Page Object Model classes for each page/component
3. **Write test scenarios** — Cover happy path, error cases, edge cases
4. **Add assertions** — Verify visible state, navigation, data persistence
5. **Add fixtures** — Create test data setup and teardown
6. **Run tests** — Execute and verify all scenarios pass
7. **Add to CI** — Ensure tests run in the pipeline

## Output
- Page Object Model files in `tests/e2e/pages/`
- Test spec files in `tests/e2e/specs/`
- Fixture/helper files in `tests/e2e/fixtures/`
- Test execution results
- CI configuration recommendations

## Rules
- Always use Page Object Model — never put selectors in test files
- Use data-testid attributes for selectors when possible
- Each test must be independent and idempotent
- Include setup and teardown for test data
- Cover at least: happy path, validation errors, edge cases
- Keep tests deterministic — no timing dependencies without explicit waits
- Use meaningful test names that describe the user behavior

## Examples
```
/e2e "CLI init command creates governance files"
/e2e "Doctor command detects and fixes missing files"
/e2e "User can add and sync multiple repositories"
```

## Related

- **Agents**: [e2e-runner](../agents/e2e-runner.md)
- **Skills**: [e2e-testing](../skills/e2e-testing/SKILL.md)
- **Rules**: [testing](../rules/common/testing.md)
