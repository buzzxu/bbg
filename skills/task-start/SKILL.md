---
name: task-start
category: internal
visibility: internal
description: Internal BBG task intake skill for turning a requirement into a confirmed spec and execution path; do not expose as a user-facing entrypoint, invoke from Start when clarification/spec capture is needed
---

# Task Start Skill

Use this skill from `.bbg/harness/skills/start/SKILL.md` when a feature, bugfix, refactor, or other requirement needs clarification and a confirmed spec before implementation.

Do not present this as a user-facing skill. Users should ask to start work; Start decides whether task intake is needed.

## Workflow

1. Read the requirement from the user message or file.
2. Use `.bbg/harness/skills/deep-interview/SKILL.md` if the requirement is ambiguous, risky, or cross-module.
3. Confirm the crystallized requirement with the user before implementation.
4. Run the internal runner to write traceable artifacts:
   - `bbg task-start-agent "<confirmed requirement>"`
   - `bbg task-start-agent --file <path>`
   - Optional: `--workflow <preset>`, `--profile quick|standard|deep`, `--no-auto-wiki`
5. Read the generated spec and wiki path, then continue with `.bbg/harness/skills/start/SKILL.md` or the selected workflow.

## Rules

- Do not start implementation from vague requirement text.
- Preserve requirement provenance in the saved spec.
- Use dated folders for generated specs and delivery artifacts.

## Related

- [task-start command](../../commands/task-start.md)
- [task intake](../task-intake/SKILL.md)
- [deep interview](../deep-interview/SKILL.md)
- [start skill](../start/SKILL.md)
