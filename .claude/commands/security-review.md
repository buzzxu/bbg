Perform a security review of the codebase:

1. **Secrets**: Scan for hardcoded API keys, tokens, passwords, connection strings
2. **Input Validation**: Check all user inputs at system boundaries (CLI args, file paths)
3. **Path Traversal**: Verify file path sanitization in template rendering and file operations
4. **Injection**: Check template outputs for injection risks (Handlebars, shell commands)
5. **Dependencies**: Review `package.json` for known vulnerable packages
6. **Error Handling**: Ensure error messages don't leak sensitive information

Report findings as:
- CRITICAL: Must fix immediately (secrets, injection, path traversal)
- HIGH: Fix before next release (missing validation, unsafe defaults)
- MEDIUM: Address in backlog (best practice improvements)
- LOW: Nice to have (defense in depth)
