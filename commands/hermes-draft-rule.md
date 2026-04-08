# /hermes-draft-rule

## Description

Generate and review local rule drafts from evaluated Hermes candidates with recurring policy/process evidence.

## Usage

```
/hermes-draft-rule
/hermes-draft-rule --candidate <candidate_id>
/hermes-draft-rule --draft <rules/local/<name>.md>
```

## Process

1. Select an evaluated candidate that implies a durable rule boundary.
2. Draft a local rule output without editing canonical/global rule assets directly.
3. Link the draft to candidate evidence and review rationale.
4. Keep the draft in local review state until separately promoted.

## Rules

- Generate local rule drafts only
- Do not auto-promote draft rules into canonical/global assets
- Require evidence links before review handoff

## Related

- [Hermes Distill Command](./hermes-distill.md)
- [Hermes Draft Skill Command](./hermes-draft-skill.md)
- [Hermes Rule Drafting Skill](../skills/hermes-rule-drafting/SKILL.md)
