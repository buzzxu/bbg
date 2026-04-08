# /wiki-query

## Description
Answer questions using the wiki as the primary knowledge source, falling back to raw material only when the wiki does not provide enough evidence.

## Usage
```
/wiki-query "What is the current rollout process?"
/wiki-query "Which decisions explain this architecture?"
/wiki-query "What changed after the last incident review?"
```

## Query Order
1. Read `docs/wiki/index.md`
2. Prefer compiled report or process pages created by `/wiki-compile` or `/wiki-refresh` when they exist and are not marked `stale` or `superseded`
3. Check local candidate draft memory only when canonical wiki memory is missing or incomplete
4. Answer from wiki evidence first
5. Read raw sources only when the wiki is missing or ambiguous
6. Suggest promotion only if the answer adds durable project knowledge

## Process
1. **Start at the index** — Read `docs/wiki/index.md` first to locate the relevant wiki pages
2. **Prefer maintained compiled pages** — Use compiled report or process pages first when they already answer the question and are not marked `stale` or `superseded`
3. **Read minimal wiki evidence** — Read only the wiki pages needed to answer the question accurately
4. **Answer wiki-first** — Form the response from wiki content before consulting raw sources
5. **Escalate only if needed** — Read raw sources only when the wiki is missing evidence, incomplete, or ambiguous
6. **Cite wiki pages** — Name the wiki pages used so the answer is traceable
7. **Classify the answer** — Decide whether the result is ephemeral troubleshooting context or durable project knowledge
8. **Create candidate updates when confidence is limited** — Record a candidate update instead of forcing an immediate canonical edit when the answer looks durable but still needs review
9. **Suggest promotion only for durable knowledge** — Recommend promotion when the answer is likely to be asked again, explains a decision/process/recurring pattern, or synthesizes multiple sources into a stable conclusion

## Output
- Direct answer to the question
- Wiki pages consulted
- Any raw sources consulted, if needed
- Answer classification: ephemeral or durable
- Recommendation for wiki promotion only when the answer should become durable documentation

## Rules
- Always consult `docs/wiki/index.md` before anything else
- Prefer wiki evidence over raw-source re-interpretation
- Prefer canonical wiki memory before local candidate draft memory
- Cite the wiki pages used in the answer
- Use raw sources only to fill gaps or resolve ambiguity
- Separate answering the question from deciding whether to promote the result
- Prefer creating a candidate update when a durable answer needs review before canonical promotion
- Suggest wiki promotion only when the answer reveals durable knowledge that should persist

## Promotion Heuristics
Promote the answer into the wiki when it:

- is likely to be asked again
- explains a decision, process, or recurring pattern
- synthesizes multiple sources into a stable conclusion

Do not treat every useful answer as a promotion candidate. Ephemeral one-off troubleshooting notes should go to `docs/wiki/log.md`, not necessarily a formal wiki page.

## Examples
```
/wiki-query "What are the supported release steps?"
/wiki-query "Why was the plugin merge flow introduced?"
/wiki-query "What incidents changed our testing policy?"
```

## Related

- [Wiki Query Skill](../skills/wiki-query/SKILL.md)
- [Wiki Ingest Command](./wiki-ingest.md)
- [Wiki Lint Command](./wiki-lint.md)
- [Wiki Promote Command](./wiki-promote.md)
