---
name: security-review
category: security
description: Security audit checklist covering OWASP Top 10, secrets detection, input validation, output encoding, and dependency scanning
---

# Security Review

## Overview
Load this skill before committing code, reviewing PRs, or working on authentication, authorization, user input handling, or data storage. Every code change is a potential attack surface.

## Workflow
1. **Scan** — Run automated tools: dependency audit, secret detection, SAST
2. **Review** — Manually inspect code against the OWASP checklist below
3. **Validate** — Confirm fixes with tests that exercise attack vectors
4. **Document** — Record any accepted risks with justification

## Patterns

### OWASP Top 10 Checklist
1. **Broken Access Control** — Verify authorization on every endpoint; deny by default
2. **Cryptographic Failures** — Use TLS everywhere; never store plaintext secrets; use bcrypt/argon2 for passwords
3. **Injection** — Parameterize all queries (SQL, NoSQL, LDAP, OS commands); never concatenate user input
4. **Insecure Design** — Threat-model new features; apply least privilege; rate-limit sensitive operations
5. **Security Misconfiguration** — No default credentials; disable debug in production; set security headers
6. **Vulnerable Components** — Run `npm audit` / `pip audit`; pin dependency versions; update regularly
7. **Authentication Failures** — Enforce strong passwords; implement MFA; use secure session management
8. **Data Integrity Failures** — Verify software updates; sign artifacts; validate CI/CD pipeline integrity
9. **Logging Failures** — Log authentication events; never log secrets or PII; monitor for anomalies
10. **SSRF** — Validate and allowlist all outbound URLs; block internal network access from user input

### Secrets Detection
- Scan for: API keys, tokens, passwords, private keys, connection strings
- Check: `.env` files, config files, comments, test fixtures, commit history
- Use: pre-commit hooks with tools like gitleaks or trufflehog
- Store secrets in: environment variables, vault services, or encrypted config — never in code

### Input Validation
- Validate at the system boundary — before any processing
- Use allowlists, not denylists (accept known-good, reject everything else)
- Validate type, length, range, and format
- Sanitize file paths to prevent directory traversal (`../../../etc/passwd`)
- Reject null bytes, control characters, and overlong encodings

### Output Encoding
- HTML-encode all user content rendered in browsers
- Use parameterized queries — never string interpolation for SQL
- Set `Content-Type` headers explicitly
- Apply CSP headers to prevent XSS

## Rules
- Never hardcode secrets, API keys, passwords, or tokens in source code
- Never log sensitive data (passwords, tokens, PII, credit cards)
- Never trust user input — validate at every system boundary
- Never disable TLS verification, even in development
- Always use parameterized queries — no exceptions
- Error messages must never leak stack traces, internal paths, or database details

## Anti-patterns
- Storing passwords with MD5/SHA1 — use bcrypt or argon2
- Rolling your own crypto — use established libraries
- Client-side-only validation — always validate server-side
- Broad CORS (`*`) on authenticated endpoints
- Catching security exceptions and returning 200 OK
- Using `eval()` or dynamic code execution with user input

## Checklist
- [ ] No hardcoded secrets in code, config, or test fixtures
- [ ] All user inputs validated at system boundaries
- [ ] All database queries are parameterized
- [ ] All outputs are properly encoded for their context
- [ ] Authentication and authorization checked on every endpoint
- [ ] Dependencies audited for known vulnerabilities
- [ ] Error messages do not leak internal details
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] Sensitive operations are rate-limited
- [ ] Logging captures security events without exposing secrets


## Related

- **Agents**: [security-reviewer](../../agents/security-reviewer.md)
- **Rules**: [security](../../rules/common/security.md)
- **Commands**: [/security-scan](../../commands/security-scan.md)
