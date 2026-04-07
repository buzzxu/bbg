---
name: wiki-maintenance
category: knowledge
description: Use when refreshing compiled wiki pages from newer runtime evidence and deciding whether pages remain canonical, stale, or superseded.
---

# Wiki Maintenance

## Overview
Use this skill when existing compiled report or process pages need to be refreshed from newer runtime evidence. The goal is to keep canonical pages current, mark lifecycle changes explicitly, and record maintenance in the wiki log.

## Workflow
1. Identify candidate wiki pages for refresh
2. Compare current page scope against newer runtime artifacts
3. Update in place if the page remains canonical
4. Mark `stale` or `superseded` when the page no longer reflects current evidence
5. Record updates in `log.md`

## Rules
- Start from the current canonical wiki page before re-reading lower-level runtime evidence
- Prefer in-place refresh when the page remains the right durable destination
- Mark pages `stale` or `superseded` instead of silently leaving outdated conclusions active
- Keep page frontmatter `sources` aligned with the runtime artifacts used during refresh
- Append `docs/wiki/log.md` whenever refresh work changes maintained wiki content

## Related

- [Wiki Refresh Command](../../commands/wiki-refresh.md)
- [Wiki Lint Skill](../wiki-lint/SKILL.md)
- [Wiki Compilation Skill](../wiki-compilation/SKILL.md)
