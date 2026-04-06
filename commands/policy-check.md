# /policy-check

## Description

Check current operations and files against the project's policy configuration. Reports risk levels, protected path violations, and blocked command patterns. Use this to verify policy compliance before committing changes.

## Usage

```
/policy-check
/policy-check --path src/auth/config.ts
/policy-check --operation schemaChange
/policy-check --all
```

## Process

1. **Load policy** - Read `.bbg/policy/policy.json` and validate structure
2. **Load exceptions** - Read `.bbg/policy/exceptions.json` for active exceptions
3. **Identify targets** - Determine which files or operations to check:
   - `--path`: Check a specific file path against protected patterns
   - `--operation`: Check a specific operation type against sensitive operations
   - `--all`: Scan all staged/modified files against all policy rules
   - No flags: Check recently modified files
4. **Evaluate risk** - For each target, run the full risk assessment:
   - Path matching against `protectedPaths.patterns`
   - Operation classification against `sensitiveOperations`
   - Blocked command pattern matching
5. **Check exceptions** - Note any active exceptions that apply
6. **Report** - Display results with risk levels and required actions

## Output

```
Policy Check Results:
[HIGH] src/migrations/001_add_users.sql - protectedPaths match (**/migrations/**)
Action: require-approval
[MEDIUM] package.json - dependencyAdd detected
Action: warn
[BLOCK] "DROP TABLE users" found in script.sql
Action: block - cannot proceed

Active Exceptions:
EXC-001: migrations/* - granted by @lead, expires 2026-04-10

Summary: 1 high, 1 medium, 1 blocked - resolve blocked items before proceeding
```

## Rules

- Always load the latest policy.json - never cache between invocations
- Report ALL matches, not just the highest risk
- Show active exceptions that would apply to flagged items
- Exit with non-zero status if any `block` actions are found
- Include the specific pattern that matched for each result

## Examples

```
/policy-check # Check recent changes
/policy-check --path .env.production # Check specific file
/policy-check --operation schemaChange # Check operation type
/policy-check --all # Full policy audit
```

## Related

- **Skills**: [policy-enforcement](../skills/policy-enforcement/SKILL.md), [security-review](../skills/security-review/SKILL.md)
- **Commands**: [/policy-exception](./policy-exception.md), [/security-scan](./security-scan.md)
