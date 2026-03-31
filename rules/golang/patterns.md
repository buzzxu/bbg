# Patterns: Go

Go-specific design patterns and idiomatic practices.

## Mandatory

- Use the functional options pattern for configurable constructors with many optional params
- Implement graceful shutdown using `context.Context` with cancellation and `signal.NotifyContext`
- Use middleware chains for HTTP request processing (logging, auth, rate limiting, recovery)
- Always pass `context.Context` through the call chain — never store it in structs
- Use `sync.WaitGroup` or `errgroup.Group` to coordinate goroutine completion

## Recommended

- **Functional Options**: Use `func WithTimeout(d time.Duration) Option` pattern for clean APIs
- **Middleware Chain**: Compose `func(http.Handler) http.Handler` for cross-cutting concerns
- **Worker Pool**: Use a fixed number of goroutines reading from a shared channel for bounded concurrency
- **Circuit Breaker**: Wrap external service calls to fail fast when the service is unavailable
- **Repository Pattern**: Abstract data access behind interfaces for testability
- **Builder Pattern**: Use method chaining for constructing complex query or config objects
- Use `errgroup.Group` with context for parallel tasks that should cancel on first error
- Use `sync.Pool` for frequently allocated/deallocated objects in hot paths
- Prefer channels for communication between goroutines; mutexes for protecting shared state

## Forbidden

- Goroutines without a cancellation mechanism — always accept `context.Context` or a done channel
- Unbuffered channels as semaphores — use buffered channels or `semaphore.Weighted`
- `sync.Mutex` embedded in a struct that is passed by value — always use pointer receivers
- Returning channels from functions without documenting who closes them
- Using `reflect` in hot paths — it's slow; use type switches or generics instead
- Global `http.DefaultClient` — always create clients with explicit timeouts

## Examples

```go
// Good: Functional options
type Server struct {
    port    int
    timeout time.Duration
}
type Option func(*Server)

func WithPort(p int) Option     { return func(s *Server) { s.port = p } }
func WithTimeout(d time.Duration) Option { return func(s *Server) { s.timeout = d } }

func NewServer(opts ...Option) *Server {
    s := &Server{port: 8080, timeout: 30 * time.Second}
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Good: Graceful shutdown
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()
srv := &http.Server{Addr: ":8080"}
go func() { srv.ListenAndServe() }()
<-ctx.Done()
shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
srv.Shutdown(shutdownCtx)

// Good: Worker pool
func process(ctx context.Context, jobs <-chan Job, results chan<- Result) {
    for job := range jobs {
        select {
        case <-ctx.Done():
            return
        case results <- job.Execute():
        }
    }
}
```
