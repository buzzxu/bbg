---
name: gin-patterns
category: golang
description: Gin/Echo patterns including middleware, route groups, request binding, error handling, and graceful shutdown
---

# Gin/Echo Patterns

## Overview

Use this skill when building or reviewing HTTP APIs with Gin or Echo frameworks in Go. These patterns cover middleware design, structured routing, input validation, centralized error handling, and production-ready server lifecycle.

## Key Patterns

### Route Groups with Middleware

```go
func SetupRouter(userHandler *UserHandler, authMiddleware gin.HandlerFunc) *gin.Engine {
    r := gin.New()
    r.Use(gin.Recovery(), RequestLogger())

    // Public routes
    public := r.Group("/api/v1")
    {
        public.POST("/login", userHandler.Login)
        public.POST("/register", userHandler.Register)
    }

    // Authenticated routes
    protected := r.Group("/api/v1")
    protected.Use(authMiddleware)
    {
        protected.GET("/users/:id", userHandler.GetUser)
        protected.PUT("/users/:id", userHandler.UpdateUser)
        protected.DELETE("/users/:id", userHandler.DeleteUser)
    }

    return r
}
```

### Request Binding and Validation

```go
type CreateUserRequest struct {
    Name  string `json:"name" binding:"required,min=1,max=100"`
    Email string `json:"email" binding:"required,email"`
    Age   int    `json:"age" binding:"gte=0,lte=150"`
}

func (h *UserHandler) CreateUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    user, err := h.service.Create(c.Request.Context(), req)
    if err != nil {
        _ = c.Error(err) // pass to error middleware
        return
    }
    c.JSON(http.StatusCreated, user)
}
```

### Centralized Error Handling Middleware

```go
type AppError struct {
    Code    int    `json:"-"`
    Message string `json:"error"`
}

func (e *AppError) Error() string { return e.Message }

func ErrorHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()

        if len(c.Errors) == 0 {
            return
        }
        err := c.Errors.Last().Err
        var appErr *AppError
        if errors.As(err, &appErr) {
            c.JSON(appErr.Code, appErr)
        } else {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
            log.Error("unhandled error", "err", err, "path", c.Request.URL.Path)
        }
    }
}
```

### Custom Middleware (Logging, Auth, CORS)

```go
func RequestLogger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path

        c.Next()

        log.Info("request",
            "method", c.Request.Method,
            "path", path,
            "status", c.Writer.Status(),
            "duration", time.Since(start),
            "ip", c.ClientIP(),
        )
    }
}

func JWTAuth(secret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        claims, err := parseJWT(token, secret)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
            return
        }
        c.Set("user_id", claims.Subject)
        c.Next()
    }
}
```

### Graceful Shutdown

```go
func main() {
    router := SetupRouter(/* deps */)

    srv := &http.Server{
        Addr:         ":8080",
        Handler:      router,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 30 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    go func() {
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            log.Fatal("listen error", "err", err)
        }
    }()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    if err := srv.Shutdown(ctx); err != nil {
        log.Fatal("shutdown error", "err", err)
    }
    log.Info("server stopped gracefully")
}
```

## Best Practices

- Use route groups to share middleware across related endpoints
- Validate all input with struct tags — never trust client data
- Use `c.Request.Context()` to propagate cancellation through the call chain
- Set explicit timeouts on `http.Server` (read, write, idle)
- Use `c.Error(err)` and a centralized error middleware instead of per-handler error formatting
- Return structured JSON errors with consistent schema

## Anti-patterns

- Putting business logic in handlers — keep handlers thin, delegate to services
- Using `c.Abort()` without returning — always `return` after abort
- Global variables for dependencies — use constructor injection into handler structs
- Ignoring context cancellation — check `ctx.Err()` in long operations
- Missing graceful shutdown — in-flight requests get terminated abruptly

## Testing Strategy

- Use `httptest.NewRecorder()` with `router.ServeHTTP()` for handler tests
- Test middleware in isolation by creating a minimal `gin.Context`
- Test route groups by asserting that protected routes return 401 without auth
- Use `testify/assert` for response body and status code assertions
- Integration test the full server with `httptest.NewServer`


## Related

- **Agents**: [go-reviewer](../../agents/go-reviewer.md)
- **Rules**: [golang/patterns](../../rules/golang/patterns.md)
- **Commands**: [/go-review](../../commands/go-review.md)
