# Backend Red Team Playbook

A comprehensive attack handbook for AI-driven red team testing of backend APIs. Based on OWASP API Security Top 10 (2023) and OWASP Web Security Testing Guide (WSTG).

## How to Use This Playbook

1. Start with `/red-team` command or the red-team step in a workflow preset
2. Use this playbook as the reference for Round 1 (systematic sweep)
3. Each category lists: description, check procedure, example payloads, and expected indicators
4. Score all findings using the severity table at the end

---

## Domain 1: Authentication & Authorization (AA)

### AA-01: Broken Object-Level Authorization (BOLA/IDOR)

**Description:** Attacker accesses resources belonging to other users by manipulating object IDs in requests.

**Check Procedure:**

1. Authenticate as User A, note resource IDs
2. Authenticate as User B
3. Replace User B resource IDs with User A IDs
4. Check if User B can access/modify User A resources

**Indicators of Vulnerability:**

- HTTP 200 for another user resource
- Data from another user visible in response body
- Modification succeeds without ownership check

### AA-02: Broken Authentication

**Description:** Weak authentication allows credential stuffing, brute force, or token abuse.

**Check Procedure:**

1. Test login endpoint for rate limiting
2. Attempt credential stuffing with common passwords
3. Check token entropy and expiration validation
4. Verify password reset flow for info leakage

### AA-03: Broken Function-Level Authorization

**Description:** Regular user can access admin endpoints.

**Check Procedure:**

1. Identify admin-only endpoints
2. Authenticate as regular user
3. Attempt admin operations with regular token

### AA-04: Broken Object Property-Level Authorization

**Description:** API accepts protected fields (mass assignment).

**Check Procedure:**

1. Send create/update with extra fields (`role`, `verified`, `balance`)
2. Verify whether those fields are persisted

---

## Domain 2: Input Validation & Injection (IV)

### IV-01: SQL Injection

**Description:** User input reaches SQL unsafely.

### IV-02: NoSQL Injection

**Description:** Query operators are injectable.

### IV-03: Command Injection

**Description:** User input reaches shell execution.

### IV-04: SSRF

**Description:** Server can be coerced to request internal targets.

### IV-05: Path Traversal

**Description:** File path parameters escape intended directories.

---

## Domain 3: Business Logic (BL)

### BL-01: Race Conditions
Exploit TOCTOU and concurrency gaps.

### BL-02: Workflow Bypass
Skip required process steps.

### BL-03: Rate Limit Bypass
Bypass rate limits using headers/path variants.

---

## Domain 4: Resource & Configuration (RC)

### RC-01: Unrestricted Resource Consumption
Oversized/deep payloads and expensive operations.

### RC-02: Server Misconfiguration
Debug endpoints, default credentials, stack traces.

### RC-03: Improper Inventory Management
Undocumented/deprecated/shadow endpoints.

### RC-04: Unsafe API Consumption
Risky upstream integrations and redirects.

---

## Domain 5: Data Security (DS)

### DS-01: Excessive Data Exposure
Responses include sensitive or unnecessary fields.

### DS-02: Sensitive Data in Logs
Credentials/tokens/PII appear in logs.

### DS-03: Insecure Data Storage
Weak/no encryption for sensitive fields.

---

## Domain 6: Session & Token (ST)

### ST-01: JWT Vulnerabilities
Algorithm confusion, weak keys, expiry failures.

### ST-02: Session Fixation/Hijacking
Predictable IDs, missing cookie flags, stale sessions.

---

## Severity Scoring Reference

| Severity | Score | Criteria |
| --- | --- | --- |
| Critical | 9.0-10.0 | RCE, full data breach, auth bypass with no privileges |
| High | 7.0-8.9 | Major exposure, privilege escalation, SSRF to internal |
| Medium | 4.0-6.9 | Limited exposure, auth required, business logic flaws |
| Low | 0.1-3.9 | Minor disclosure or constrained impact |
| Info | 0.0 | Best-practice observation |

## Report Generation

After completing both rounds, generate a report using `docs/reports/red-team-report-TEMPLATE.md`.

## Related

- **Skills**: [red-team-test](../../skills/red-team-test/SKILL.md), [security-review](../../skills/security-review/SKILL.md)
- **Commands**: [/red-team](../../commands/red-team.md), [/security-scan](../../commands/security-scan.md)
