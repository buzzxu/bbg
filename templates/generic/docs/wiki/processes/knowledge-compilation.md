---
title: Knowledge Compilation
type: process
status: active
sources:
  - docs/wiki/log.md
last_updated: 2026-04-07
tags:
  - knowledge
  - process
related:
  - docs/wiki/index.md
---

# Knowledge Compilation

## Inputs

- Telemetry summaries and exported report artifacts
- Eval comparison outputs and saved eval reports
- Workflow summaries and report artifacts
- Red-team reports

## Compilation Steps

1. Select the runtime artifacts that support a durable update
2. Read the current wiki index and any candidate canonical pages
3. Synthesize a stable summary into a report or process page
4. Update frontmatter `sources`, `status`, and `last_updated`
5. Update the wiki index and append the wiki log

## Refresh Rules

- Refresh pages in place when they remain canonical
- Mark pages `stale` when newer evidence exists but the page still needs review
- Mark pages `superseded` when a new page replaces the current destination
