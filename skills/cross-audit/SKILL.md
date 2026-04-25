---
name: cross-audit
category: internal
visibility: internal
description: Internal second-pass audit skill for high-risk changes, conflicting reviews, or explicit audit requests; do not expose as a primary user-facing entrypoint
---

# Cross Audit

## Overview

Use this skill internally after primary review to reduce single-model blind spots. It runs an independent second pass with a different model and merges both outputs into one adjudicated report.

## When To Use

- High-impact releases
- Security-sensitive changes
- Conflicting review outcomes
- Compliance-heavy domains requiring stronger audit confidence

## Workflow

1. Collect primary audit artifacts (code review, security scan, red team if available)
2. Select a different model for cross pass
3. Re-run equivalent scope independently
4. Normalize findings into a comparable schema
5. Diff findings and classify each issue:
   - `agreed`
   - `primary-only`
   - `cross-only`
   - `conflict`
6. Adjudicate conflicts with rationale and final owner
7. Publish consolidated report to `docs/reports/YYYY/MM/`

## Finding Normalization

Each finding should include:

- id
- category
- severity
- file_path
- evidence
- recommendation
- status

## Decision Policy

- Any unresolved critical conflict => `BLOCK`
- No critical/high unresolved conflicts => `PASS`
- Open medium conflicts or incomplete evidence => `CONDITIONAL`

## Rules

- Cross model must not be the same as primary model
- Never drop single-source findings without explicit rationale
- Keep traceability to original artifacts and commit references
- Record adjudication owner for every conflict

## Output

- `docs/reports/YYYY/MM/cross-audit-report-<slug>.md`
- Summary metrics: agreement rate, conflict count, blocked findings

## Related

- Commands: `.bbg/harness/commands/cross-audit.md`, `.bbg/harness/commands/code-review.md`, `.bbg/harness/commands/security-scan.md`
- Skills: `.bbg/harness/skills/code-review-checklist/SKILL.md`, `.bbg/harness/skills/security-review/SKILL.md`
