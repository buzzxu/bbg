---
name: wiki-query
category: knowledge
description: Use when answering questions from project knowledge and the response should start from docs/wiki before consulting raw source material.
---

# Wiki Query

## Overview
Use this skill to answer questions from the wiki before falling back to raw sources. The goal is to minimize re-interpretation, cite the wiki pages used, and identify durable answers that should be promoted back into the wiki.

## Workflow

### Step 1: Read the index first
- Start with `docs/wiki/index.md`
- Use it to locate the smallest relevant set of wiki pages

### Step 2: Read the minimum relevant wiki pages
- Read only the pages needed to answer accurately
- Prefer direct evidence over broad exploratory reading

### Step 3: Answer with wiki-first evidence
- Build the answer from wiki content first
- Cite the wiki pages used so the answer stays traceable

### Step 4: Read raw sources only if needed
- Escalate to `docs/raw/` only when the wiki is missing evidence, incomplete, or conflicting
- Keep any raw-source use narrow and specific to the gap

### Step 5: Suggest promotion when appropriate
- Recommend updating the wiki when the answer reveals durable knowledge
- Call out where the wiki should be expanded, clarified, or corrected

## Output
- Direct answer to the question
- Wiki pages used as evidence
- Raw sources consulted, if any
- Suggested wiki promotion when the answer has lasting value

## Rules
- Always read `docs/wiki/index.md` first
- Prefer the minimum relevant wiki pages over broad wiki scans
- Cite wiki pages used in the answer
- Read raw sources only to close evidence gaps or resolve conflicts
- Suggest promotion when useful knowledge is not yet durable in the wiki

## Related

- [Wiki Query Command](../../commands/wiki-query.md)
- [Wiki Ingestion Skill](../wiki-ingestion/SKILL.md)
- [Wiki Lint Skill](../wiki-lint/SKILL.md)
