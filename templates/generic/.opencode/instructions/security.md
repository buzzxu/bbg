# Security Guidelines

Follow the security rules in `rules/common/security.md`.

## Critical Rules

- NEVER hardcode secrets, API keys, passwords, or tokens
- Validate ALL user inputs at system boundaries
- Sanitize file paths to prevent directory traversal attacks
- Use parameterized queries for database access
- Error messages must NOT expose sensitive information
- Review all template outputs for injection risks

## Security Review Process

Use `agents/security-reviewer.md` and `skills/security-review/SKILL.md` before committing security-sensitive changes.

## References

- Rules: `rules/common/security.md`
- Agent: `agents/security-reviewer.md`
- Skill: `skills/security-review/SKILL.md`
