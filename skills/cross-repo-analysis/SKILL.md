---
name: cross-repo-analysis
category: architecture
description: Analyze inter-repository dependencies, data contracts, and change impact across sub-projects
---

# Cross Repo Analysis

## Overview

Use this skill to understand how repositories interact and where coupling risk exists.

## Workflow

1. Build repository interaction matrix (service-to-service, event, shared package)
2. Identify dependency criticality and failure blast radius
3. Detect contract drift and undocumented assumptions
4. Update `docs/architecture/repo-dependency-graph.md`
5. Add impact notes into impacted `docs/architecture/repos/<repo>.md` files

## Output Model

- Dependency graph (logical)
- Contract registry references
- Coupling risk table
- Suggested decoupling/refactor opportunities

## Rules

- Keep dependency graph current after each new repository is added
- Distinguish compile-time, runtime, and organizational dependencies
- Call out circular dependencies explicitly

## Related

- Commands: `commands/analyze.md`, `commands/analyze-repo.md`
- Skills: `skills/architecture-analysis/SKILL.md`
