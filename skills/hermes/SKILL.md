---
name: hermes
category: internal
visibility: internal
description: Internal Hermes learning dispatcher for query, candidates, distill, draft, verify, and promote operations; do not expose as a user-facing entrypoint, invoke from Analyze/Start/Review/Deliver flows
---

# Hermes Skill

Use this skill internally when Analyze, Start, Review, or Deliver needs to query local knowledge, distill reusable learnings, draft skills/rules, verify candidates, or promote trusted knowledge.

Do not present Hermes as a primary user-facing entrypoint. Users can ask to "沉淀经验/更新知识库"; the active workflow decides whether Hermes is needed.

## Workflow

1. Choose the Hermes kind:
   - `query`
   - `candidates`
   - `distill`
   - `draft-skill`
   - `draft-rule`
   - `verify`
   - `promote`
2. Run the internal runner when you need local-memory context:
   - `bbg hermes-agent query "<topic>"`
   - `bbg hermes-agent candidates "<topic>"`
   - `bbg hermes-agent distill "<topic>"`
   - `bbg hermes-agent draft-skill "<topic>"`
   - `bbg hermes-agent draft-rule "<topic>"`
   - `bbg hermes-agent verify "<topic>"`
   - `bbg hermes-agent promote "<topic>"`
3. Read returned references before drafting or promoting anything.
4. Keep drafts separate from canonical governance until verification and promotion are complete.

## Rules

- Query canonical wiki and promoted memory before candidate memory.
- Do not promote unverified Hermes drafts.
- Keep source evidence attached to every distilled learning.

## Related

- [Hermes memory router](../hermes-memory-router/SKILL.md)
- [Hermes distillation](../hermes-distillation/SKILL.md)
- [Hermes verification](../hermes-verification/SKILL.md)
- [Hermes query command](../../commands/hermes-query.md)
