---
name: golang-patterns
category: golang
description: Go idioms including error handling, interfaces, goroutines, channels, context propagation, and table-driven tests
---

# Go Patterns

## Overview

Use this skill when writing or reviewing Go code. These patterns emphasize Go's philosophy of simplicity, explicit error handling, composition over inheritance, and safe concurrency.

## Key Patterns

### Error Handling with Wrapping

```go
import (
    "errors"
    "fmt"
)

var ErrNotFound = errors.New("not found")

func GetUser(id string) (*User, error) {
    user, err := db.FindByID(id)
    if err != nil {
        return nil, fmt.Errorf("GetUser(%s): %w", id, err) // wrap with context
    }
    if user == nil {
        return nil, fmt.Errorf("user %s: %w", id, ErrNotFound)
    }
    return user, nil
}

// Caller checks sentinel
if errors.Is(err, ErrNotFound) {
    http.Error(w, "not found", http.StatusNotFound)
}
```

### Interfaces — Small and Consumer-Defined

```go
// Define interfaces where they are USED, not where they are implemented
type UserReader interface {
    GetUser(ctx context.Context, id string) (*User, error)
}

type UserService struct {
    repo UserReader // depends on interface, not concrete type
}

func NewUserService(repo UserReader) *UserService {
    return &UserService{repo: repo}
}

func (s *UserService) FindUser(ctx context.Context, id string) (*User, error) {
    return s.repo.GetUser(ctx, id)
}
```

### Context Propagation

```go
func (s *Server) handleRequest(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Add values via middleware, read here
    userID := auth.UserIDFromContext(ctx)

    // Pass context through the call chain — always first parameter
    user, err := s.users.GetUser(ctx, userID)
    if err != nil {
        if ctx.Err() != nil {
            return // client disconnected, stop work
        }
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(user)
}
```

### Goroutines with errgroup

```go
import "golang.org/x/sync/errgroup"

func FetchAll(ctx context.Context, urls []string) ([]Response, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([]Response, len(urls))

    for i, url := range urls {
        g.Go(func() error {
            resp, err := fetch(ctx, url)
            if err != nil {
                return fmt.Errorf("fetch %s: %w", url, err)
            }
            results[i] = resp // safe: each goroutine writes to its own index
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### Channels for Fan-Out/Fan-In

```go
func process(ctx context.Context, items <-chan Item) <-chan Result {
    out := make(chan Result)
    go func() {
        defer close(out)
        for item := range items {
            select {
            case <-ctx.Done():
                return
            case out <- transform(item):
            }
        }
    }()
    return out
}
```

### Functional Options Pattern

```go
type Server struct {
    addr    string
    timeout time.Duration
}

type Option func(*Server)

func WithAddr(addr string) Option    { return func(s *Server) { s.addr = addr } }
func WithTimeout(d time.Duration) Option { return func(s *Server) { s.timeout = d } }

func NewServer(opts ...Option) *Server {
    s := &Server{addr: ":8080", timeout: 30 * time.Second}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

## Best Practices

- Accept interfaces, return structs — keeps dependencies explicit
- Always pass `context.Context` as the first parameter
- Handle every error — never use `_ = someFunc()` for errors
- Use `errgroup` over raw goroutines + WaitGroup for concurrent work
- Prefer table-driven tests with subtests (`t.Run`)
- Use `defer` for cleanup immediately after resource acquisition

## Anti-patterns

- Goroutine leaks — always ensure goroutines can exit (via context or channel close)
- Large interfaces — keep interfaces 1-3 methods; split if they grow
- `init()` functions with side effects — make initialization explicit
- Returning `interface{}` / `any` — use generics or concrete types
- Panicking in library code — return errors; let the caller decide

## Testing Strategy

- Use table-driven tests with `t.Run` for subtest isolation
- Use `httptest.NewServer` for HTTP handler tests
- Mock interfaces with hand-written stubs or `gomock`
- Use `t.Parallel()` for independent tests
- Run `go vet` and `golangci-lint` in CI alongside tests
