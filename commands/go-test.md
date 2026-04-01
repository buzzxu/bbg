# /go-test

## Description
Go-specific TDD workflow using table-driven tests, test helpers, and the standard testing package. Enforces RED-GREEN-IMPROVE cycle with Go idioms.

## Usage
```
/go-test "function or behavior to test"
/go-test "ParseConfig should handle missing fields"
```

## Process
1. **Understand behavior** — Clarify the function or behavior under test
2. **RED phase** — Write a failing table-driven test:
   - Define test cases with name, input, expected output
   - Use `t.Run()` for subtests
   - Run `go test ./...` to confirm failure
3. **GREEN phase** — Implement minimum code to pass:
   - No extra logic beyond what tests require
   - Run `go test ./...` to confirm pass
4. **IMPROVE phase** — Refactor test and implementation:
   - Extract test helpers with `t.Helper()`
   - Add edge case test rows to the table
   - Run `go test -race ./...` to check for data races
5. **Repeat** — Add more test cases for additional behaviors

## Output
After each cycle:
- Table-driven test with all test cases
- Implementation code
- `go test` output at each phase
- Coverage report: `go test -cover`

## Rules
- Always use table-driven tests for multiple cases
- Use `t.Helper()` for test helper functions
- Use `t.Parallel()` where safe for faster execution
- Test error cases, not just happy paths
- Use `testdata/` directory for fixture files
- Run with `-race` flag to detect race conditions
- Use `t.Cleanup()` for teardown, not manual defer in tests

## Examples
```
/go-test "Handler should return 404 for unknown routes"
/go-test "ParseConfig handles empty YAML gracefully"
/go-test "Cache expires entries after TTL"
```

## Related

- **Agents**: [go-reviewer](../agents/go-reviewer.md)
- **Skills**: [golang-testing](../skills/golang-testing/SKILL.md), [tdd-workflow](../skills/tdd-workflow/SKILL.md)
- **Rules**: [testing](../rules/golang/testing.md)
