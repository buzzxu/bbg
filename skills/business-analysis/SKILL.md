---
name: business-analysis
category: architecture
description: Maintain living business architecture and capability mapping across repositories and domains
---

# Business Analysis

## Overview

Connect technical modules to business capabilities, owners, and process outcomes.

## Workflow

1. Identify business capabilities served by each repository
2. Map key entities, states, and business events
3. Capture upstream/downstream dependencies between business modules
4. Update `docs/architecture/business-architecture.md` in place
5. Reflect major module insights in `docs/architecture/repos/<repo>.md`

## Required Sections

- Capability map
- Ownership map
- Critical business flows
- Failure and escalation paths
- Change impact surface

## Rules

- Business architecture docs are living documents; keep single source of truth
- Separate assumptions from confirmed behavior
- Keep stakeholder language understandable for non-engineering readers

## Related

- Commands: `commands/analyze.md`, `commands/analyze-repo.md`
- Skills: `skills/deep-interview/SKILL.md`, `skills/architecture-analysis/SKILL.md`
