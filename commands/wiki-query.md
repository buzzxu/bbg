# /wiki-query

## Description
Answer questions using the wiki as the primary knowledge source, falling back to raw material only when the wiki does not provide enough evidence.

## Usage
```
/wiki-query "What is the current rollout process?"
/wiki-query "Which decisions explain this architecture?"
/wiki-query "What changed after the last incident review?"
```

## Process
1. **Start at the index** — Read `docs/wiki/index.md` first to locate the relevant wiki pages
2. **Read minimal wiki evidence** — Read only the wiki pages needed to answer the question accurately
3. **Answer wiki-first** — Form the response from wiki content before consulting raw sources
4. **Escalate only if needed** — Read raw sources only when the wiki is missing evidence, incomplete, or conflicting
5. **Cite wiki pages** — Name the wiki pages used so the answer is traceable
6. **Suggest promotion** — If the answer has lasting value that is not yet captured well in the wiki, recommend promoting that knowledge into the wiki

## Output
- Direct answer to the question
- Wiki pages consulted
- Any raw sources consulted, if needed
- Recommendation for wiki promotion when the answer should become durable documentation

## Rules
- Always consult `docs/wiki/index.md` before anything else
- Prefer wiki evidence over raw-source re-interpretation
- Cite the wiki pages used in the answer
- Use raw sources only to fill gaps or resolve uncertainty
- Suggest wiki promotion when the answer reveals durable knowledge that should persist

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
