# /security-scan -- Security Review

Read and follow the agent instructions in `agents/security-reviewer.md` and the skill workflow in `skills/security-review/SKILL.md`.

## Scan Checklist

1. **Secrets**: Check for hardcoded API keys, passwords, tokens, connection strings
2. **Input validation**: Verify all user inputs are validated at system boundaries
3. **Path traversal**: Check file path handling for directory traversal attacks
4. **Injection**: SQL injection, command injection, template injection
5. **Error leakage**: Ensure error messages don't expose sensitive information
6. **Dependencies**: Check for known vulnerabilities in dependencies
7. **Authentication**: Verify auth flows handle edge cases correctly
8. **Authorization**: Check for privilege escalation paths

## References

- Agent: `agents/security-reviewer.md`
- Skill: `skills/security-review/SKILL.md`
- Rules: `rules/common/security.md`
