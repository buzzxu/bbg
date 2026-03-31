# /code-review

## Description
Perform a comprehensive code review checking security, patterns, testing, and style. Produces actionable findings categorized by severity.

## Usage
```
/code-review [file or directory]
/code-review src/commands/init.ts
/code-review src/analyzers/
```

## Process
1. **Read the code** — Analyze all files in scope, understanding intent and flow
2. **Security check** — Look for injection, secrets, path traversal, unsafe inputs
3. **Pattern check** — Verify adherence to project patterns and architecture
4. **Error handling** — Ensure errors are caught, logged, and handled explicitly
5. **Testing check** — Verify test coverage exists and tests are meaningful
6. **Style check** — TypeScript strict compliance, naming conventions, file organization
7. **Performance check** — Identify blocking operations, memory leaks, redundant work
8. **Report findings** — Categorize as critical/warning/suggestion with file:line references

## Output
A structured review report:
- **Critical** — Must fix before merge (security, data loss, crashes)
- **Warning** — Should fix (error handling gaps, missing tests, pattern violations)
- **Suggestion** — Nice to have (naming, readability, minor optimizations)
- Summary with total finding counts per category

## Rules
- Always reference specific file paths and line numbers
- Provide concrete fix suggestions, not just problem descriptions
- Check against project rules in AGENTS.md and CLAUDE.md
- Flag DRY violations with references to the duplicate code
- Verify imports use .js extensions for ESM compatibility

## Examples
```
/code-review src/commands/init.ts
/code-review src/analyzers/
/code-review src/
```
