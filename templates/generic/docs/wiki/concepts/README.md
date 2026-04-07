---
title: Example Page
type: concept
status: active
sources:
  - docs/raw/example.md
last_updated: 2026-04-07
tags:
  - example
related:
  - docs/wiki/index.md
---

# Concepts

Store durable definitions, domain models, and shared vocabulary here.

## Required Frontmatter

Use this schema for every concept page:

```md
---
title: Example Page
type: concept
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
Update pages in place when new material extends the same stable concept instead of creating duplicates.

## Lifecycle

Create a new page when the topic is genuinely distinct.
Update an existing page when new material extends the same topic.
Mark a page `stale` when sources changed and the page needs review.
Mark a page `superseded` when a new page replaces it.
