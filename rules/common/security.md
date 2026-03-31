# Security: Common

Security rules that apply to all languages, frameworks, and deployment targets.

## Mandatory

- Never hardcode secrets, API keys, tokens, passwords, or connection strings
- Store secrets in environment variables or a secrets manager (Vault, AWS SSM, etc.)
- Validate all user input at system boundaries — never trust external data
- Sanitize file paths to prevent directory traversal (`../` attacks)
- Use parameterized queries for all database operations — never string-concatenate SQL
- Error messages must not leak stack traces, internal paths, or system details to users
- Pin dependency versions and run `npm audit` / `pip audit` / `cargo audit` in CI
- Enforce HTTPS for all external communication — never allow plaintext HTTP
- Log security-relevant events (auth failures, privilege escalations) for auditing

## Recommended

- Follow the principle of least privilege for all service accounts and tokens
- Rotate secrets on a regular schedule — automate rotation where possible
- Use allowlists over denylists for input validation
- Implement rate limiting on all public-facing endpoints
- Review OWASP Top 10 quarterly and verify coverage for each item
- Use Content Security Policy (CSP) headers on all web responses
- Enable automated dependency vulnerability scanning in CI (Dependabot, Snyk)
- Encrypt sensitive data at rest, not just in transit

## Forbidden

- Secrets in source code, config files, or environment variable defaults in code
- Disabling TLS verification (`--insecure`, `verify=False`, `rejectUnauthorized: false`)
- Using `eval()`, `exec()`, or equivalent dynamic code execution with user input
- Logging sensitive data (passwords, tokens, PII) at any log level
- Using deprecated or broken cryptographic algorithms (MD5, SHA1 for security, DES)
- Committing `.env` files, private keys, or certificate files to version control

## Examples

```
Good: const apiKey = process.env.API_KEY;
Bad:  const apiKey = "sk-live-abc123xyz";

Good: db.query("SELECT * FROM users WHERE id = $1", [userId]);
Bad:  db.query(`SELECT * FROM users WHERE id = ${userId}`);

Good: return { error: "Authentication failed" };
Bad:  return { error: `Login failed for ${email}: ${err.stack}` };
```


## Related

- **Agents**: [code-reviewer](../../agents/code-reviewer.md), [security-reviewer](../../agents/security-reviewer.md)
- **Skills**: [security-review](../../skills/security-review/SKILL.md), [security-hardening](../../skills/security-hardening/SKILL.md), [secrets-management](../../skills/secrets-management/SKILL.md)
- **Commands**: [/security-scan](../../commands/security-scan.md)
