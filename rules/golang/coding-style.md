# Coding Style: Go

Go-specific coding style rules layered on top of common rules.

## Mandatory

- Follow Effective Go and the Go Code Review Comments wiki — run `gofmt` and `golangci-lint`
- Wrap errors with context using `fmt.Errorf("operation: %w", err)` — preserve the error chain
- Use interface segregation: define small interfaces (1-3 methods) at the consumer site, not provider
- Package names must be lowercase, single-word, no underscores: `user`, `config`, `http`
- Propagate `context.Context` as the first parameter in all functions that do I/O or may cancel
- Return errors as values — never panic for expected failure conditions
- Exported functions and types must have doc comments starting with the name

## Recommended

- Prefer returning `(T, error)` tuples over sentinel errors or panics
- Use `errors.Is()` and `errors.As()` for error checking — never compare error strings
- Define errors as package-level variables: `var ErrNotFound = errors.New("not found")`
- Use table-driven tests as the default testing pattern
- Prefer struct embedding for composition over inheritance-like patterns
- Use `defer` for cleanup (close files, unlock mutexes) — but watch for loop gotchas
- Minimize `init()` usage — prefer explicit initialization in `main()` or constructors
- Use `sync.Once` for one-time initialization instead of `init()`
- Prefer `io.Reader` and `io.Writer` interfaces for streaming data processing

## Forbidden

- `init()` functions that perform I/O, network calls, or have side effects
- Naked returns in functions longer than 5 lines — always name what you're returning explicitly
- `panic()` for recoverable errors — panics are only for truly unrecoverable programmer bugs
- Underscore-prefixed package names or `util`/`common`/`helpers` packages — be specific
- Using `interface{}` (or `any`) when a more specific type is possible
- Mutable package-level variables — use functions that return values instead
- Goroutine leaks — always ensure goroutines can exit (use context cancellation or done channels)

## Examples

```go
// Good: Error wrapping with context
func GetUser(ctx context.Context, id string) (*User, error) {
    user, err := db.FindUser(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return user, nil
}

// Bad: Lost error context
func GetUser(id string) (*User, error) {
    user, err := db.FindUser(context.TODO(), id)
    if err != nil {
        return nil, err  // No context about what failed
    }
    return user, nil
}

// Good: Small consumer-defined interface
type UserStore interface {
    FindByID(ctx context.Context, id string) (*User, error)
}

// Bad: Large provider-defined interface
type Database interface {
    FindUser(...) / CreateUser(...) / DeleteUser(...) / FindOrder(...) // etc.
}
```


## Related

- **Agents**: [go-reviewer](../../agents/go-reviewer.md), [go-build-resolver](../../agents/go-build-resolver.md)
- **Skills**: [golang-patterns](../../skills/golang-patterns/SKILL.md)
- **Commands**: [/go-review](../../commands/go-review.md), [/go-build](../../commands/go-build.md)
