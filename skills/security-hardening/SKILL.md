---
name: security-hardening
category: security
description: Production security hardening covering HTTP headers, CSP, CORS, rate limiting, DDoS protection, WAF rules, and penetration testing
---

# Security Hardening

## Overview
Load this skill when preparing applications for production deployment, configuring HTTP security, setting up rate limiting, or planning penetration tests. Defense in depth means applying security at every layer — network, transport, application, and data.

## Key Patterns

### HTTP Security Headers
1. **Content-Security-Policy (CSP)** — Whitelist allowed content sources; block inline scripts by default; use nonces for necessary inline code
2. **Strict-Transport-Security (HSTS)** — `max-age=31536000; includeSubDomains; preload` — force HTTPS for all connections
3. **X-Content-Type-Options** — `nosniff` — prevent MIME type sniffing
4. **X-Frame-Options** — `DENY` or `SAMEORIGIN` — prevent clickjacking
5. **Referrer-Policy** — `strict-origin-when-cross-origin` — limit referrer leakage
6. **Permissions-Policy** — Disable unused browser features: camera, microphone, geolocation

### CORS Configuration
- Never use `Access-Control-Allow-Origin: *` on authenticated endpoints
- Whitelist specific origins — validate against an explicit allowlist
- Restrict allowed methods and headers to what the API actually uses
- Set `Access-Control-Max-Age` to cache preflight responses (e.g., 3600 seconds)
- Never reflect the Origin header back without validation — this is equivalent to wildcard

### Rate Limiting
- Apply per-IP and per-user rate limits on all endpoints
- Stricter limits on authentication, registration, and password reset endpoints
- Use token bucket or sliding window algorithm — not fixed windows (burst at boundary)
- Return `429 Too Many Requests` with `Retry-After` header
- Rate limit at the API gateway or reverse proxy, not just application code

### DDoS Protection
- Use a CDN/edge provider (Cloudflare, AWS Shield, Akamai) as the first line of defense
- Configure geographic and IP reputation filtering at the edge
- Enable connection rate limiting and SYN flood protection at the load balancer
- Auto-scale behind the protection layer — absorb legitimate traffic spikes
- Maintain a DDoS runbook with provider contact information and escalation steps

### WAF Rules
- Enable OWASP Core Rule Set (CRS) as baseline protection
- Add custom rules for application-specific attack patterns
- Log-only mode first — review false positives before enforcing
- Regularly update rule sets — new attack patterns emerge continuously
- Test WAF rules against known payloads (SQLi, XSS, path traversal) after changes

### Penetration Testing
- Test quarterly or after major features; use OWASP Testing Guide as methodology
- Scope: authentication flows, API endpoints, file upload, payment processing
- Test both authenticated and unauthenticated attack surfaces
- Automate recurring checks with DAST tools (OWASP ZAP, Burp Suite)
- Track findings to resolution — retest to confirm fixes

## Best Practices
- Apply security headers via reverse proxy or middleware — not per-endpoint
- CSP in report-only mode first — collect violations before enforcing
- Defense in depth — WAF + rate limiting + application validation + output encoding
- Automate security header verification in CI with tools like Mozilla Observatory
- Review TLS configuration — disable TLS 1.0/1.1, weak ciphers, and export-grade crypto
- Maintain an asset inventory — you cannot secure what you do not know about

## Anti-patterns
- Relying on WAF alone without application-level security — WAFs are bypassable
- Overly permissive CORS that reflects any origin
- Rate limits only on the frontend — attackers bypass UI entirely
- CSP with `unsafe-inline` and `unsafe-eval` — negates most XSS protection
- Security headers on the main domain but not on subdomains or APIs
- Penetration test once and never again — the attack surface changes with every deploy

## Checklist
- [ ] All HTTP security headers configured and verified (CSP, HSTS, X-Frame-Options)
- [ ] CORS restricted to specific allowed origins, methods, and headers
- [ ] Rate limiting applied to all endpoints with stricter limits on auth flows
- [ ] TLS 1.2+ enforced with strong cipher suites
- [ ] CDN/edge DDoS protection active with geographic filtering
- [ ] WAF enabled with OWASP CRS baseline and custom rules
- [ ] Security headers automated in CI (Mozilla Observatory or equivalent)
- [ ] Penetration test completed within last quarter
- [ ] All pen test findings tracked to resolution and retested
- [ ] DDoS response runbook documented with escalation contacts
