# Security: Go

Go-specific security rules for services and applications.

## Mandatory

- Use `database/sql` with parameterized queries (`$1`, `?`) — never concatenate SQL strings
- Validate all user input at handler boundaries — use struct tags or a validation library
- Use `crypto/rand` for generating secrets and tokens — never `math/rand`
- Set explicit timeouts on `http.Client` and `http.Server` — the zero value means no timeout
- Configure TLS with `tls.Config{MinVersion: tls.VersionTLS12}` — never allow TLS 1.0/1.1
- Use `html/template` (auto-escaping) for HTML output — never `text/template` for web responses
- Implement rate limiting on public endpoints — use `golang.org/x/time/rate` or middleware

## Recommended

- Use `golang.org/x/crypto/bcrypt` or `argon2` for password hashing — never raw SHA/MD5
- Use `net/http` `MaxBytesReader` to limit request body size — prevent resource exhaustion
- Use `securecookie` or signed JWTs for session management — never trust unsigned cookies
- Run `govulncheck` in CI to detect known vulnerabilities in dependencies
- Use `gosec` linter for automated security scanning of Go source code
- Prefer `crypto/ed25519` or `crypto/ecdsa` over RSA for new key generation
- Set `GOMAXPROCS` appropriately in containerized environments (use `automaxprocs`)
- Sanitize error messages returned to clients — log full details server-side only

## Forbidden

- `fmt.Sprintf` for building SQL queries — always use parameterized queries
- `math/rand` for security-sensitive values (tokens, passwords, nonces)
- `http.ListenAndServe` without TLS in production — use `ListenAndServeTLS` or a TLS proxy
- Disabling TLS certificate verification: `InsecureSkipVerify: true`
- `os/exec.Command` with unsanitized user input — validate and restrict allowed commands
- Serving user-uploaded files without content-type validation and `Content-Disposition` headers
- Storing secrets in Go source files or `go:embed` directives

## Examples

```go
// Good: Parameterized query
row := db.QueryRowContext(ctx, "SELECT name FROM users WHERE id = $1", userID)

// Bad: SQL injection
row := db.QueryRowContext(ctx, fmt.Sprintf("SELECT name FROM users WHERE id = '%s'", userID))

// Good: Secure random token
token := make([]byte, 32)
if _, err := crypto_rand.Read(token); err != nil {
    return fmt.Errorf("generate token: %w", err)
}

// Bad: Predictable token
token := fmt.Sprintf("%d", math_rand.Int63())

// Good: HTTP client with timeout
client := &http.Client{Timeout: 10 * time.Second}

// Bad: No timeout (waits forever)
client := &http.Client{}
```


## Related

- **Agents**: [go-reviewer](../../agents/go-reviewer.md)
- **Skills**: [golang-patterns](../../skills/golang-patterns/SKILL.md), [security-review](../../skills/security-review/SKILL.md)
- **Commands**: [/go-review](../../commands/go-review.md), [/security-scan](../../commands/security-scan.md)
