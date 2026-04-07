# /hermes-distill

## Description

Select evaluated Hermes candidates that are ready to be distilled into local wiki or process drafts.

## Usage

```
/hermes-distill
/hermes-distill --candidate <candidate_id>
/hermes-distill --type wiki
/hermes-distill --status pending
```

## Process

1. Review evaluated Hermes candidates with enough evidence to distill locally.
2. Choose whether the draft belongs in a wiki page or process page.
3. Prepare the local draft path and rationale before changing any canonical page.
4. Mark the candidate as distilled only after the draft output is linked.

## Focus

- evaluated local candidates
- wiki draft targets
- process draft targets
- evidence-backed local distillation

## Related

- [Hermes Candidates Command](./hermes-candidates.md)
- [Hermes Refine Command](./hermes-refine.md)
- [Hermes Distillation Skill](../skills/hermes-distillation/SKILL.md)
