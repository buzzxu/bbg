# /policy-exception

## Description

Request or grant a time-limited exception to a policy rule. Exceptions allow temporary bypasses for specific operations on specific targets, with mandatory expiry dates and audit trail. Use when legitimate work is blocked by a policy rule.

## Usage

```
/policy-exception request --rule protectedPaths --target "src/migrations/**" --reason "Sprint 12 schema migration"
/policy-exception grant --id EXC-001 --expires "2026-04-10" --granted-by "@tech-lead"
/policy-exception list
/policy-exception revoke --id EXC-001
```

## Process

### Requesting an Exception

1. **Identify the rule** - Which policy rule needs an exception (`protectedPaths`, `sensitiveOperations`, `commandPolicies`)
2. **Specify the target** - Exact file path or glob pattern the exception covers
3. **Provide reason** - Why this exception is needed (mandatory, recorded in audit trail)
4. **Generate exception ID** - Create a unique `EXC-XXX` identifier
5. **Record** - Add to `.bbg/policy/exceptions.json` with `used: 0` and no expiry (pending grant)

### Granting an Exception

1. **Verify pending exception** - Look up the exception by ID
2. **Set expiry** - Exceptions MUST have an expiry date (no indefinite exceptions)
3. **Record grantor** - Who approved this exception
4. **Activate** - Update the exception record with `granted_by` and `expires_at`
5. **Audit** - Record the grant in the policy_exceptions SQLite table

### Listing Exceptions

1. **Read exceptions.json** - Show all active, pending, and expired exceptions
2. **Show usage** - How many times each exception has been used
3. **Flag expired** - Highlight any exceptions past their expiry date

### Revoking an Exception

1. **Find by ID** - Look up the exception
2. **Remove from active list** - Move to revoked status
3. **Record** - Audit the revocation

## Output

```
Exception Requested:
ID: EXC-003
Rule: protectedPaths
Target: src/migrations/**
Reason: Sprint 12 schema migration
Status: PENDING - needs grant with /policy-exception grant --id EXC-003

Active Exceptions:
EXC-001 protectedPaths src/auth/* expires 2026-04-10 used 3x granted by @lead
EXC-003 protectedPaths src/migrations/** PENDING - not yet granted
```

## Rules

- Every exception MUST have a reason - no blank reasons allowed
- Granted exceptions MUST have an expiry date - no indefinite bypasses
- `block`-level actions CANNOT have exceptions - blocked commands stay blocked
- Exception IDs must be unique and sequential within the project
- All exception lifecycle events are recorded in the SQLite audit table
- Expired exceptions are kept in the file for audit history (not deleted)

## Examples

```
/policy-exception request --rule protectedPaths --target "*.env*" --reason "Adding staging env config"
/policy-exception grant --id EXC-004 --expires "2026-04-15" --granted-by "@security-lead"
/policy-exception list # Show all exceptions
/policy-exception revoke --id EXC-004 # Revoke before expiry
```

## Related

- **Skills**: [policy-enforcement](../skills/policy-enforcement/SKILL.md)
- **Commands**: [/policy-check](./policy-check.md), [/security-scan](./security-scan.md)
