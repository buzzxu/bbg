---
name: client-delivery
category: documentation
description: Generate client-facing implementation reports with effort-hours summary and optional SVG flow diagrams
---

# Client Delivery

## Overview

Create customer-readable implementation documentation after completion and audit.

## Workflow

1. Gather source artifacts (confirmed requirement, implementation summary, audits)
2. Draft client-oriented implementation narrative
3. Build effort-hours section by phase (analysis/design/dev/test/review/docs)
4. Generate SVG diagrams for architecture and flow where useful
5. Save report in `docs/delivery/YYYY/MM/`
6. Update delivery index for quick lookup

## Timeout Interaction

When workflow ends, prompt for delivery generation with 10-second timeout:

- response in 10 seconds => generate
- no response => skip

## Regeneration

Support regeneration from:

- completed task id
- confirmed requirement spec path

## Rules

- Use customer-facing language and avoid internal-only terminology
- Exclude secrets and sensitive internals
- Keep references to verifiable artifacts

## Related

- Commands: `commands/deliver.md`, `commands/task-start.md`
- Skills: `skills/wiki-compilation/SKILL.md`
