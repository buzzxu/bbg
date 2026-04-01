# /go-review

## Description
Go-specific code review focusing on idiomatic Go patterns, error handling, concurrency safety, and standard library usage.

## Usage
```
/go-review [file or directory]
/go-review cmd/server/main.go
/go-review internal/
```

## Process
1. **Error handling** — Verify errors are checked, wrapped with context, not silently ignored
2. **Naming** — Check Go naming conventions (camelCase, exported vs unexported, acronyms)
3. **Concurrency** — Review goroutine safety, channel usage, mutex patterns, race conditions
4. **Interface design** — Small interfaces, accept interfaces return structs, io.Reader/Writer usage
5. **Resource management** — Verify defer for cleanup, proper Close() calls, context propagation
6. **Standard library** — Prefer stdlib over third-party when reasonable
7. **Package design** — Check package naming, avoid circular deps, proper visibility
8. **Testing** — Table-driven tests, test helpers, benchmark presence

## Output
Go-specific findings:
- Error handling gaps (unchecked errors, missing context wrapping)
- Concurrency issues (data races, goroutine leaks)
- Naming and convention violations
- Package design recommendations
- Overall Go code health score

## Rules
- Every error must be handled — `_ = foo()` is never acceptable for errors
- Errors should be wrapped with `fmt.Errorf("context: %w", err)`
- Check for goroutine leaks (goroutines without cancellation)
- Verify `context.Context` is the first parameter where applicable
- Flag `init()` functions — they should be rare and justified
- Check `go.mod` for unnecessary dependencies

## Examples
```
/go-review cmd/server/main.go
/go-review internal/handlers/
/go-review ./...
```

## Related

- **Agents**: [go-reviewer](../agents/go-reviewer.md)
- **Skills**: [golang-patterns](../skills/golang-patterns/SKILL.md), [gin-patterns](../skills/gin-patterns/SKILL.md)
- **Rules**: [coding-style](../rules/golang/coding-style.md), [patterns](../rules/golang/patterns.md)
