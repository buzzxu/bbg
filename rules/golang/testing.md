# Testing: Go

Go-specific testing rules using the standard library and common tools.

## Mandatory

- Use table-driven tests as the default pattern — each case is a struct in a slice
- Use `t.Run(name, func)` for subtests — each table case gets its own subtest
- Use `t.Helper()` in all test helper functions — ensures correct line numbers in failure output
- Use `t.Parallel()` for tests that can run concurrently — speed up the test suite
- Use `httptest.NewServer()` or `httptest.NewRecorder()` for HTTP handler tests — never real servers
- Test error cases explicitly: verify both the error value and that the result is zero/nil
- Name test functions: `TestFunctionName_Scenario_ExpectedBehavior`

## Recommended

- Use `testify/assert` and `testify/require` for readable assertions — `require` for fatal checks
- Use `t.Cleanup()` for teardown instead of `defer` — it runs after subtests complete
- Use `testing.B` benchmarks for performance-critical code — run with `go test -bench=.`
- Use `go test -fuzz` for fuzz testing input parsers and validators (Go 1.18+)
- Use golden files for complex output comparison: store expected output in `testdata/`
- Use `t.TempDir()` for filesystem tests — automatically cleaned up after test
- Create `testutil` packages for shared test helpers — keep them in `internal/`
- Use build tags (`//go:build integration`) to separate unit and integration tests
- Use `go-cmp` (`cmp.Diff`) for detailed struct comparison in failure messages

## Forbidden

- Tests that depend on network services without `httptest` or mocks
- `os.Getenv()` in tests without `t.Setenv()` — it's not safe for parallel tests
- Shared mutable state between test functions — each test must be independent
- `time.Sleep()` in tests — use channels, `sync.WaitGroup`, or `t.Deadline()` instead
- Testing unexported functions by placing tests in the same package (white-box) as default
- Skipping tests without `t.Skip("reason")` — never comment out test code

## Examples

```go
// Good: Table-driven test
func TestParseAge(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    int
        wantErr bool
    }{
        {name: "valid age", input: "25", want: 25, wantErr: false},
        {name: "negative", input: "-1", want: 0, wantErr: true},
        {name: "non-numeric", input: "abc", want: 0, wantErr: true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            got, err := ParseAge(tt.input)
            if tt.wantErr {
                require.Error(t, err)
                return
            }
            require.NoError(t, err)
            assert.Equal(t, tt.want, got)
        })
    }
}

// Bad: Single case, no subtests
func TestParseAge(t *testing.T) {
    result, _ := ParseAge("25")
    if result != 25 {
        t.Fatal("wrong")
    }
}
```
