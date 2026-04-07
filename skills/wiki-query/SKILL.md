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
- Escalate to `docs/raw/` only when the wiki is missing evidence, incomplete, or ambiguous
- Keep any raw-source use narrow and specific to the gap

### Step 5: Distinguish answering from promotion
- Finish the answer before deciding whether any wiki update is needed
- Keep the recommendation separate so a correct answer does not automatically imply promotion

### Step 6: Classify whether the answer is ephemeral or durable
- Treat the answer as durable when it is likely to be asked again
- Treat the answer as durable when it explains a decision, process, or recurring pattern
- Treat the answer as durable when it synthesizes multiple sources into a stable conclusion
- Treat one-off troubleshooting notes as ephemeral by default; add them to `docs/wiki/log.md` rather than forcing a formal page

### Step 7: Recommend the promotion target only for durable answers
- Suggest `concept` for stable definitions or recurring patterns
- Suggest `decision` for rationale or tradeoff records
- Suggest `report` for synthesized findings or investigations
- Suggest `process` for repeatable operational steps

## Output
- Direct answer to the question
- Wiki pages used as evidence
- Raw sources consulted, if any
- Answer classification: ephemeral or durable
- Suggested wiki promotion only when the answer has lasting value

## Rules
- Always read `docs/wiki/index.md` first
- Prefer the minimum relevant wiki pages over broad wiki scans
- Cite wiki pages used in the answer
- Read raw sources only to close evidence gaps or resolve ambiguity
- Separate answering the question from deciding whether to promote the result
- Suggest promotion only when useful knowledge is not yet durable in the wiki

## Query Order
1. Read `docs/wiki/index.md`
2. Read the minimum relevant wiki pages
3. Answer from wiki evidence first
4. Read raw sources only when the wiki is missing or ambiguous
5. Suggest promotion only if the answer adds durable project knowledge

## Promotion Heuristics
Promotion is appropriate when the answer:

- is likely to be asked again
- explains a decision, process, or recurring pattern
- synthesizes multiple sources into a stable conclusion

Ephemeral one-off troubleshooting notes should go to `docs/wiki/log.md`, not necessarily a formal wiki page.

## Related

- [Wiki Query Command](../../commands/wiki-query.md)
- [Wiki Ingestion Skill](../wiki-ingestion/SKILL.md)
- [Wiki Lint Skill](../wiki-lint/SKILL.md)
