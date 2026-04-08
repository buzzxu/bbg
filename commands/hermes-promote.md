# /hermes-promote

## Description

record promotion decisions for verified candidates into BBG-global target scopes.

## Usage

```
/hermes-promote --candidate <intake_candidate_id> --status approved --target bbg-global-skill
/hermes-promote --candidate <intake_candidate_id> --status rejected
```

## Rules

- Promotion decisions must reference verification results
- K10 records promotion decisions; it does not auto-edit global assets
- Deferred decisions remain reviewable for later passes
- K11 may consume promotion evidence but does not auto-promote assets

## Related

- [Hermes Verify Command](./hermes-verify.md)
- [Hermes Promotion Skill](../skills/hermes-promotion/SKILL.md)
