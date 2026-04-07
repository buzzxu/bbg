---
name: wiki-compilation
category: knowledge
description: Use when compiling runtime artifacts into durable wiki report and process pages with explicit source tracking and index/log maintenance.
---

# Wiki Compilation

## Overview
Use this skill when telemetry, eval, workflow, or red-team outputs should be compiled into stable wiki knowledge. Compile inputs are derivative artifacts, not raw sources, but they must still be listed in page frontmatter `sources` so compiled pages stay traceable.

## Workflow
1. Select one or more runtime artifacts
2. Read the current wiki index and any relevant report or process pages
3. Synthesize a stable summary from runtime outputs
4. Update or create the target wiki report or process page
5. Update `index.md` and append `log.md`

## Rules
- Treat compile inputs as derivative runtime artifacts rather than raw-source inputs
- Still list derivative artifacts in page frontmatter `sources`
- Prefer updating existing canonical report or process pages before creating adjacent duplicates
- Keep compiled pages readable and stable rather than copying transient command output verbatim
- Update `docs/wiki/index.md` and append `docs/wiki/log.md` whenever compilation changes wiki content

## Related

- [Wiki Compile Command](../../commands/wiki-compile.md)
- [Wiki Maintenance Skill](../wiki-maintenance/SKILL.md)
- [Telemetry Dashboard](../telemetry-dashboard/SKILL.md)
