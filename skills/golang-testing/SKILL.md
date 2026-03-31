---
name: golang-testing
category: golang
description: Go testing including table tests, testify, httptest, benchmarks, fuzzing, golden files, and test helpers
---

# Go Testing

## Overview

Use this skill when writing or reviewing Go tests. These patterns cover idiomatic test structure, HTTP testing, benchmarking, fuzz testing, and test helper design.

## Key Patterns

### Table-Driven Tests

```go
func TestParseSize(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    int64
        wantErr bool
    }{
        {name: "bytes", input: "100B", want: 100},
        {name: "kilobytes", input: "2KB", want: 2048},
        {name: "megabytes", input: "1MB", want: 1_048_576},
        {name: "invalid", input: "abc", wantErr: true},
        {name: "empty", input: "", wantErr: true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseSize(tt.input)
            if tt.wantErr {
                require.Error(t, err)
                return
            }
            require.NoError(t, err)
            assert.Equal(t, tt.want, got)
        })
    }
}
```

### HTTP Handler Tests with httptest

```go
func TestGetUser(t *testing.T) {
    repo := &mockUserRepo{
        users: map[string]*User{"1": {ID: "1", Name: "Alice"}},
    }
    handler := NewUserHandler(repo)

    req := httptest.NewRequest(http.MethodGet, "/users/1", nil)
    rec := httptest.NewRecorder()

    handler.ServeHTTP(rec, req)

    assert.Equal(t, http.StatusOK, rec.Code)

    var user User
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &user))
    assert.Equal(t, "Alice", user.Name)
}
```

### Test Helpers with t.Helper()

```go
func createTestUser(t *testing.T, db *sql.DB, name string) *User {
    t.Helper() // errors report at the caller's line, not here
    user := &User{Name: name, Email: name + "@test.com"}
    _, err := db.Exec("INSERT INTO users (name, email) VALUES (?, ?)", user.Name, user.Email)
    require.NoError(t, err)
    t.Cleanup(func() {
        db.Exec("DELETE FROM users WHERE email = ?", user.Email)
    })
    return user
}
```

### Golden File Tests

```go
func TestRenderTemplate(t *testing.T) {
    got := RenderReport(sampleData)
    golden := filepath.Join("testdata", t.Name()+".golden")

    if *update {
        os.WriteFile(golden, []byte(got), 0644)
    }

    want, err := os.ReadFile(golden)
    require.NoError(t, err)
    assert.Equal(t, string(want), got)
}

// Run with: go test -update to refresh golden files
var update = flag.Bool("update", false, "update golden files")
```

### Benchmarks

```go
func BenchmarkSort(b *testing.B) {
    data := generateRandomSlice(10_000)
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        cp := make([]int, len(data))
        copy(cp, data)
        sort.Ints(cp)
    }
}

// Run: go test -bench=BenchmarkSort -benchmem
// Output: BenchmarkSort-8  5000  230456 ns/op  81920 B/op  1 allocs/op
```

### Fuzz Testing (Go 1.18+)

```go
func FuzzParseJSON(f *testing.F) {
    // Seed corpus
    f.Add([]byte(`{"name":"Alice"}`))
    f.Add([]byte(`{}`))
    f.Add([]byte(`null`))

    f.Fuzz(func(t *testing.T, data []byte) {
        var result map[string]any
        err := json.Unmarshal(data, &result)
        if err != nil {
            return // invalid input is fine, just don't panic
        }
        // Re-encode and verify roundtrip
        encoded, err := json.Marshal(result)
        require.NoError(t, err)
        require.NotEmpty(t, encoded)
    })
}

// Run: go test -fuzz=FuzzParseJSON -fuzztime=30s
```

### Integration Test with Build Tags

```go
//go:build integration

package store_test

func TestPostgresStore(t *testing.T) {
    dsn := os.Getenv("TEST_DATABASE_URL")
    if dsn == "" {
        t.Skip("TEST_DATABASE_URL not set")
    }
    db, err := sql.Open("postgres", dsn)
    require.NoError(t, err)
    t.Cleanup(func() { db.Close() })
    // ... test against real database
}
```

## Best Practices

- Use `t.Run` subtests — they enable parallel execution and selective test runs
- Call `t.Helper()` in every test helper function
- Use `t.Cleanup()` instead of `defer` for resource cleanup in helpers
- Use `t.Parallel()` for tests that don't share mutable state
- Keep `testdata/` directories for golden files and fixture data
- Use `testify/require` for fatal assertions, `testify/assert` for non-fatal

## Anti-patterns

- Testing unexported functions directly — test through the public API
- Sharing state between test cases without proper isolation
- Skipping error checks in test setup — use `require.NoError`
- Benchmarks that include setup time — call `b.ResetTimer()` after setup
- Tests that depend on execution order — each test must be independent

## Testing Strategy

- Run `go test ./...` on every commit; `-race` flag in CI
- Use `-count=1` to disable test caching during development
- Fuzz critical parsers and decoders for at least 30 seconds in CI
- Benchmark before and after performance-sensitive changes
- Use build tags to separate unit and integration tests
