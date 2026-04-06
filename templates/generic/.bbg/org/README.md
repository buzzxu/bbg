# Organization-Level Governance (Reserved)

> **Status: RESERVED -- Not yet functional**
>
> This directory contains schema definitions for organization-level governance.
> These files define the future data structures for cross-repo policy management
> and reporting. They are deployed by `bbg init` but have no runtime effect.

## Purpose

When fully implemented, organization-level governance will enable:

- **Centralized Policy Management** -- Define security policies, coding standards,
  and workflow rules at the organization level, with automatic propagation to all
  member projects.
- **Cross-Repo Reporting** -- Aggregate evaluation results, telemetry metrics, and
  compliance data across all projects in an organization.
- **Team-Level Overrides** -- Allow teams within an organization to customize policies
  within the boundaries set by organization-level rules.

## Policy Merge Protocol

When organization-level governance is active, policies merge with the following
priority (highest to lowest):

1. **Project-level** `policy.json` explicit overrides
2. **Team-level** `team_overrides`
3. **Organization-level** `base_policy`
4. **BBG default** policy

### Merge Rules

| Field                 | Strategy                                            |
| --------------------- | --------------------------------------------------- |
| `blockedCommands`     | Union -- org blacklist cannot be removed by projects |
| `protectedPaths`      | Union -- projects can only add more restrictions     |
| `sensitiveOperations` | Take the highest risk level                         |
| `commandPolicies`     | `requiredApproval: true` cannot be downgraded       |

## Files in This Directory

| File                      | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `org-policy-schema.json`  | JSON Schema for organization-level policy docs |
| `org-report-schema.json`  | JSON Schema for cross-repo report data format  |
| `org-config.example.json` | Example org configuration (non-functional)     |

## Related

- `.bbg/scripts/org-schema.sql` -- Reserved SQLite tables for org data
- `.bbg/config.json` -> `organization` field (optional, reserved)
