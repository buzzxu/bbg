# Cross Audit Policy

## Purpose

Cross-audit reduces single-model blind spots by running an independent second pass with a different AI model and reconciling findings before release.

## Trigger Conditions

- Security-sensitive changes
- High-impact production releases
- Conflicting outcomes from code review and security scan
- Explicit user request

## Model Selection Rules

1. Primary and cross-audit models must be different
2. If primary model is unknown, use `model-route` recommendation for cross pass
3. Prefer stronger model class for security-heavy scope

## Scope

Default scope:

- Code review findings
- Security scan findings
- Red-team findings (backend projects)

## Reconciliation Categories

- `agreed`
- `primary-only`
- `cross-only`
- `conflict`

## Release Decision

- `BLOCK`: unresolved critical conflicts or open critical findings
- `CONDITIONAL`: medium/high conflicts pending owner action
- `PASS`: no unresolved critical/high conflicts

## Output Location

- `docs/reports/YYYY/MM/cross-audit-report-<slug>.md`
