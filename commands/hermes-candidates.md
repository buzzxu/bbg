# /hermes-candidates

## Description

Review local Hermes candidate objects before they are refined into canonical local knowledge.

## Usage

```
/hermes-candidates
/hermes-candidates --status pending
/hermes-candidates --confidence low
/hermes-candidates --candidate <candidate_id>
```

## Process

1. **Select candidate scope** - Start with pending candidates unless a status, confidence, or specific candidate filter is provided.
2. **Review candidate summaries** - Inspect candidate type, source run, rationale, confidence, and review status.
3. **Check evidence links** - Verify that linked artifacts and evaluations support the candidate well enough for review.
4. **Separate outcomes** - Distinguish ready, low-confidence, rejected, and superseded candidates.
5. **Prepare local disposition** - Mark candidates for local refinement, rejection, or supersession after evidence review.

## Focus

- pending candidates
- candidate evidence links
- low-confidence candidates
- rejected or superseded candidate history
- local-only refinement readiness

Promotion beyond the local project is out of scope for K6.

## Related

- [Hermes Evaluation Skill](../skills/hermes-evaluation/SKILL.md)
- [Hermes Log Command](./hermes-log.md)
- [Wiki Promote Command](./wiki-promote.md)
