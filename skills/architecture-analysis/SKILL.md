---
name: architecture-analysis
category: architecture
description: Maintain living technical architecture documents across multiple repositories with dependency and interface mapping
---

# Architecture Analysis

## Overview

Build and maintain a living technical architecture baseline for all repositories in the workspace.

## Workflow

1. Load repo inventory from `.bbg/config.json`
2. For each repo, extract stack, structure, boundaries, and deployment shape
3. Map interfaces across repos (API, events, shared libraries)
4. Update global technical architecture and dependency graph docs in place
5. Update per-repo architecture doc in `docs/architecture/repos/<repo>.md`
6. Update `docs/architecture/index.md` links and status

## Document Strategy

- Architecture docs are living artifacts, not monthly snapshots
- One repo maps to one architecture file
- Keep a changelog table in each file for traceable evolution

## Required Outputs

- `docs/architecture/technical-architecture.md`
- `docs/architecture/repo-dependency-graph.md`
- `docs/architecture/repos/<repo>.md`
- `docs/architecture/index.md`

## Rules

- Prefer update-in-place over creating duplicate architecture files
- Keep interface contracts explicit and versioned where possible
- Include risks and migration notes when architecture changes

## Related

- Commands: `commands/analyze.md`, `commands/analyze-repo.md`
- Skills: `skills/cross-repo-analysis/SKILL.md`, `skills/business-analysis/SKILL.md`
