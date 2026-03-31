# /security-scan

## Description
Scan the codebase for security vulnerabilities including hardcoded secrets, dependency issues, injection risks, and insecure configurations.

## Usage
```
/security-scan
/security-scan src/
/security-scan --deep
```

## Process
1. **Secret detection** — Scan for API keys, tokens, passwords, private keys in source
2. **Dependency audit** — Check for known vulnerabilities in dependencies
3. **Input validation** — Verify user inputs are validated at system boundaries
4. **Path traversal** — Check file operations for path traversal vulnerabilities
5. **Injection risks** — Look for template injection, command injection, SQL injection
6. **Configuration review** — Check for insecure defaults, debug modes, permissive CORS
7. **Error leakage** — Ensure error messages don't expose internal details
8. **Generate report** — Categorize findings by severity (critical/high/medium/low)

## Output
Security report with:
- **Critical** — Hardcoded secrets, known vulnerable dependencies
- **High** — Missing input validation, injection risks
- **Medium** — Insecure configurations, error message leakage
- **Low** — Missing security headers, informational findings
- Remediation steps for each finding

## Rules
- Check ALL file types, not just source code (configs, scripts, templates)
- Verify .gitignore covers sensitive files (.env, credentials, keys)
- Cross-reference with OWASP Top 10 categories
- Never output actual secret values in the report — mask them
- Flag any use of eval(), Function(), or child_process without sanitization

## Examples
```
/security-scan
/security-scan src/templates/
/security-scan --deep    # Include node_modules audit
```

## Related

- **Agents**: [security-reviewer](../agents/security-reviewer.md)
- **Skills**: [security-review](../skills/security-review/SKILL.md), [security-hardening](../skills/security-hardening/SKILL.md), [secrets-management](../skills/secrets-management/SKILL.md)
- **Rules**: [security](../rules/common/security.md)
