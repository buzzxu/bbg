# /hermes-candidates

## Description

Review local Hermes candidate objects before they are distilled into draft wiki/process outputs or resolved as local-only, rejected, or superseded.

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
5. **Prepare local distillation** - Distill strong local candidates into draft wiki/process outputs before any canonical promotion review.

## Focus

- pending candidates
- candidate evidence links
- low-confidence candidates
- rejected or superseded candidate history
- local-only distillation readiness
- K7B skill/rule draft readiness

Canonical promotion beyond the local project draft workflow is out of scope for K7A.
Candidate memory is queryable but not canonical.

## Related

- [Hermes Evaluation Skill](../skills/hermes-evaluation/SKILL.md)
- [Hermes Log Command](./hermes-log.md)
- [Wiki Promote Command](./wiki-promote.md)
