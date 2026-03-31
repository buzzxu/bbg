---
inclusion: auto
description: Security rules and vulnerability prevention guidelines
---

# Security -- Kiro Steering

Follow the security rules in `rules/common/security.md`.

## Critical Rules

- NEVER hardcode secrets, API keys, passwords, or tokens
- Validate ALL user inputs at system boundaries
- Sanitize file paths to prevent directory traversal attacks
- Use parameterized queries for database access
- Error messages must NOT expose sensitive information
- Review all template outputs for injection risks

## Security Review

Use `agents/security-reviewer.md` and `skills/security-review/SKILL.md` for structured security reviews.
