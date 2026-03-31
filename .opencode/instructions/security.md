# Security Guidelines

For comprehensive security rules, see `rules/common/security.md` and language-specific rules in `rules/<language>/security.md`.

## Must Never
- Hardcode secrets, API keys, tokens, or passwords
- Include absolute file paths in outputs or error messages
- Use `eval()` or `new Function()`
- Trust external data without validation
- Silently swallow errors

## Input Validation
- Validate all CLI arguments at boundaries
- Sanitize file paths (prevent path traversal)
- Check template paths against the manifest

## Template Safety
- Handlebars escapes by default — use `{{{triple}}}` only when explicitly safe
- Scaffold `<!-- AI-FILL -->` markers must be validated before use
- Never interpolate unsanitized input into shell commands

## Before Any Commit
- No hardcoded secrets (grep for API keys, passwords, tokens)
- All user inputs validated
- Error messages don't leak sensitive data
- File path operations are safe

## Automated Security
- Pre-edit hooks detect secrets and debug statements (`hooks/scripts/pre-edit-check.js`)
- Security scan hooks block dangerous patterns (`hooks/scripts/security-scan.js`)
- Use `commands/security-scan.md` for on-demand security scanning
- Use `agents/security-reviewer.md` for security-focused reviews

## Extended Resources
- Security review skill: `skills/security-review/SKILL.md`
- Secrets management: `skills/secrets-management/SKILL.md`
- Security hardening: `skills/security-hardening/SKILL.md`
- Dependency audit: `skills/dependency-audit/SKILL.md`
