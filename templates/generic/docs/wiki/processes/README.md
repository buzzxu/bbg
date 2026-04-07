---
title: Example Page
type: process
status: active
sources:
  - docs/raw/example.md
last_updated: 2026-04-07
tags:
  - example
related:
  - docs/wiki/index.md
---

# Processes

Store repeatable workflows and operating procedures here.

## Required Frontmatter

Use this schema for every process page:

```md
---
title: Example Page
type: process
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
Update pages in place when new material extends the same stable process instead of creating duplicates.

## Lifecycle

Create a new page when the topic is genuinely distinct.
Update an existing page when new material extends the same topic.
Mark a page `stale` when sources changed and the page needs review.
Mark a page `superseded` when a new page replaces it.
