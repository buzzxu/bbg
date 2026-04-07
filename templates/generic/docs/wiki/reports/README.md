---
title: Example Page
type: report
status: active
sources:
  - docs/raw/example.md
last_updated: 2026-04-07
tags:
  - example
related:
  - docs/wiki/index.md
---

# Reports

Store synthesized findings, investigations, and status summaries here.

## Required Frontmatter

Use this schema for every report page:

```md
---
title: Example Page
type: report
status: active
sources:
  - docs/raw/example.md
last_updated: 2026-04-07
tags:
  - example
related:
  - docs/wiki/index.md
---
```

`status` may be `active`, `draft`, `stale`, or `superseded`.
`sources` is required.
Update pages in place when new material extends the same stable report instead of creating duplicates.

## Lifecycle

Create a new page when the topic is genuinely distinct.
Update an existing page when new material extends the same topic.
Mark a page `stale` when sources changed and the page needs review.
Mark a page `superseded` when a new page replaces it.
