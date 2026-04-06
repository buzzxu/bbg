---
name: policy-enforcement
category: governance
description: Risk classification, approval workflows, permission boundaries, and audit trail for AI development operations
---

# Policy Enforcement

## Overview

Use this skill when you need to evaluate operations against security and risk policies before execution. Policy enforcement classifies every operation by risk level, applies the appropriate action (allow, warn, require-approval, block), manages time-limited exceptions, and records all decisions for audit.

## Risk Assessment Flow

Every operation goes through this evaluation pipeline:

```
Operation request -> Path matching -> Operation classification -> Risk grading -> Policy decision
-> allow: execute directly
-> warn: output warning + execute + record decision
-> require-approval: pause for human confirmation + record decision
-> block: reject + record decision
```

## Workflow

### Step 1: Load Policy Configuration

- Read `.bbg/policy/policy.json` for risk levels, protected paths, sensitive operations, blocked commands, and command policies
- Read `.bbg/policy/exceptions.json` for active exceptions
- Validate both files exist and parse correctly
- If policy files are missing, warn and use default permissive policy

### Step 2: Classify the Operation

Determine the operation type from the action being performed:

| Operation Type         | Trigger                                                 |
| ---------------------- | ------------------------------------------------------- |
| `fileDelete`           | Removing files from the project                         |
| `configChange`         | Modifying configuration files                           |
| `dependencyAdd`        | Adding new packages or dependencies                     |
| `dependencyRemove`     | Removing packages or dependencies                       |
| `schemaChange`         | Modifying database schemas or migrations                |
| `migrationChange`      | Creating or modifying migration files                   |
| `cicdChange`           | Modifying CI/CD pipeline configurations                 |
| `securityConfigChange` | Changing authentication, authorization, or secrets      |

### Step 3: Evaluate Risk Level

1. **Path matching** - Check if the target file matches any `protectedPaths.patterns` using glob matching
2. **Operation classification** - Look up the operation type in `sensitiveOperations`
3. **Blocked command check** - Match against `blockedCommands.patterns` (exact substring match)
4. **Risk grading** - Take the highest risk level from all matching rules:
   - If path matches `protectedPaths` -> use `protectedPaths.riskLevel`
   - If operation matches `sensitiveOperations` -> use the configured level
   - If command matches `blockedCommands` -> action is `block` (overrides risk level)
   - Multiple matches -> highest risk wins (`block > high > medium > low`)

### Step 4: Check for Exceptions

Before applying the policy decision:

1. Check `.bbg/policy/exceptions.json` for an active exception matching the policy rule and target
2. Verify the exception has not expired (`expires_at` is in the future or null)
3. If a valid exception exists, downgrade the action (e.g., `require-approval` -> `warn`)
4. Mark the exception as used (`used` counter incremented)

### Step 5: Apply Policy Decision

Based on the risk level, look up the action in `riskLevels`:

| Action             | Behavior                                                        |
| ------------------ | --------------------------------------------------------------- |
| `allow`            | Execute immediately, record in audit log                        |
| `warn`             | Display warning with risk details, execute, record              |
| `require-approval` | Display risk details, pause for human `yes/no`, record decision |
| `block`            | Reject with explanation, record in audit log, do not execute    |

### Step 6: Record Decision

Write every policy evaluation to the audit trail:

```sql
INSERT INTO policy_decisions (session_id, operation, target, risk_level, action_taken, approved, exception_id, reason)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);
```

Record regardless of outcome - allowed, warned, approved, rejected, or blocked operations all get logged.

### Step 7: Analyze Policy Effectiveness

Periodically review the `v_policy_effectiveness` view to identify:

- Policies that are too strict (high rejection rate after approval prompts)
- Policies that are too lenient (operations that should be caught)
- Exception patterns that suggest a rule needs adjustment
- Risk levels that never trigger (dead rules)

## Hook Enhancement Notes

The following hook enhancements integrate policy enforcement at the hook level. These are complex modifications documented here for reference - actual hook file changes should be done carefully in a dedicated effort.

### pre-edit-check.js Enhancements

- Before allowing file edits, check if the target path matches `protectedPaths.patterns`
- If match found, evaluate risk level and apply policy action
- For `require-approval` paths, the hook should output a warning and suggest using `/policy-exception` to get a time-limited bypass

### security-scan.js Enhancements

- Before allowing shell commands, check against `blockedCommands.patterns`
- If match found, block the command and record the attempt
- Check operation type against `sensitiveOperations` for dependency and schema changes

## Rules

- Never skip policy evaluation - even "trivial" operations must be classified
- Record all decisions including allows - the audit trail must be complete
- Exceptions must have an expiry - indefinite exceptions defeat the purpose
- Policy files must be committed to version control - they are governance content
- The `block` action cannot be overridden by exceptions - blocked commands stay blocked
- Risk levels only escalate during evaluation - never downgrade from a higher match

## Anti-patterns

- Disabling policy checks "temporarily" and forgetting to re-enable
- Creating broad exceptions that cover too many operations
- Ignoring the effectiveness view - policies must be tuned over time
- Treating `warn` as `allow` - warnings should be reviewed and acted on
- Hardcoding policy rules instead of reading from `policy.json`

## Checklist

- [ ] Policy files exist and parse correctly (`.bbg/policy/policy.json`, `.bbg/policy/exceptions.json`)
- [ ] SQL schema initialized (`sqlite3 .bbg/telemetry.db < .bbg/scripts/policy-schema.sql`)
- [ ] All operations are classified before execution
- [ ] Risk levels are evaluated correctly (highest match wins)
- [ ] Policy decisions are recorded in the audit trail
- [ ] Exceptions have expiry dates and are tracked
- [ ] Effectiveness view is reviewed periodically
- [ ] Blocked commands cannot be bypassed

## Related

- **Commands**: [/policy-check](../../commands/policy-check.md), [/policy-exception](../../commands/policy-exception.md)
- **Skills**: [security-review](../security-review/SKILL.md), [secrets-management](../secrets-management/SKILL.md)
- **Rules**: [security](../../rules/common/security.md)
