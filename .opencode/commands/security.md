---
description: Scan for security vulnerabilities and OWASP compliance
---

Perform a security review.

Follow the workflow in `agents/security-reviewer.md` and `skills/security-review/SKILL.md`:

1. Scan for hardcoded secrets (API keys, tokens, passwords) — see `skills/secrets-management/SKILL.md`
2. Check input validation at CLI boundaries — see `rules/common/security.md`
3. Verify file path sanitization in template rendering
4. Review template outputs for injection risks
5. Check dependencies for known vulnerabilities — see `skills/dependency-audit/SKILL.md`
6. Ensure error messages don't leak sensitive information
7. Check language-specific security rules in `rules/<language>/security.md`

Report as CRITICAL / HIGH / MEDIUM / LOW.
