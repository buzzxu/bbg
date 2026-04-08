# /hermes-query

## Description

Answer questions using the K8 local Hermes memory router: local canonical wiki memory before local candidate memory, and raw/runtime artifacts only when the local layers are insufficient.

## Usage

```
/hermes-query "What is the current rollout process?"
/hermes-query "Which local draft explains this repeated failure?"
/hermes-query "What evidence supports this candidate process change?"
```

## Query Order

1. Read local canonical wiki memory first
2. Check local candidate draft memory when canonical pages are missing or incomplete
3. Consult raw/runtime artifacts only when the local layers still leave a gap
4. Keep canonical promotion separate from query answering

## Process

1. Start with canonical wiki/process pages that already answer the question.
2. Use local Hermes draft candidates only when canonical memory is missing, incomplete, or explicitly under review.
3. Read the smallest supporting run/evaluation/artifact evidence needed to resolve the remaining gap.
4. Answer with the highest-trust local memory available and state whether the result came from canonical or candidate memory.
5. State whether raw/runtime evidence resolved the answer when fallback reaches that layer.

## Rules

- Prefer local canonical wiki memory before local candidate memory
- Prefer local memory before raw/runtime evidence
- Candidate memory can inform answers but does not become canonical by being queried
- intake records are not a canonical memory layer
- Verification/promotion records do not bypass canonical local routing layers
- Keep promotion and routing separate

## Related

- [Wiki Query Command](./wiki-query.md)
- [Hermes Candidates Command](./hermes-candidates.md)
- [Hermes Memory Router Skill](../skills/hermes-memory-router/SKILL.md)
