# Testing: Common

Universal testing rules that apply across all languages and frameworks.

## Mandatory

- Follow TDD: write the test first (RED), then implement (GREEN), then refactor (IMPROVE)
- Maintain minimum 80% code coverage — measure both line and branch coverage
- Tests must be independent — no test may depend on another test's execution or ordering
- Each test must have a single clear assertion focus (one logical assertion per test)
- Name tests descriptively: `should reject expired tokens` not `test1`
- Use the pattern: Arrange (setup), Act (execute), Assert (verify)
- Clean up all side effects — tests must leave no state behind
- Run the full test suite before committing; all tests must pass

## Recommended

- Test behavior, not implementation — tests should survive refactoring
- Use factories or builders for test data instead of raw object literals
- Prefer fakes and stubs over mocks — mock only at system boundaries
- Write integration tests for critical paths (auth, payments, data persistence)
- Use property-based testing for functions with complex input domains
- Keep test files colocated with source or in a mirrored `tests/` directory
- Name test files consistently: `*.test.ts`, `*_test.go`, `test_*.py`

## Forbidden

- Tests that depend on network, filesystem, or database without isolation
- Shared mutable state between test cases (global variables, singletons)
- Testing private/internal methods directly — test through the public API
- Snapshot tests for logic validation — snapshots are only for UI rendering
- Disabling or skipping tests without an issue reference in the skip message
- Tests that sleep or use hardcoded timeouts — use async waiters instead

## Examples

```
Good: it("should return 404 when user is not found", async () => { ... })
Bad:  it("works", () => { ... })

Good: const user = createTestUser({ role: "admin" });
Bad:  const user = { id: 1, name: "test", role: "admin", email: "t@t.com", ... };

Good: test.skip("flaky on CI — tracking in #456")
Bad:  test.skip("doesn't work")
```


## Related

- **Agents**: [tdd-guide](../../agents/tdd-guide.md), [code-reviewer](../../agents/code-reviewer.md), [e2e-runner](../../agents/e2e-runner.md)
- **Skills**: [tdd-workflow](../../skills/tdd-workflow/SKILL.md), [verification-loop](../../skills/verification-loop/SKILL.md), [e2e-testing](../../skills/e2e-testing/SKILL.md)
- **Commands**: [/tdd](../../commands/tdd.md), [/e2e](../../commands/e2e.md), [/test-coverage](../../commands/test-coverage.md)
