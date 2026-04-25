---
name: workflow
category: internal
visibility: internal
description: Internal BBG orchestration skill for plan, review, TDD, and security routing; do not expose as a user-facing entrypoint, invoke from Start/Resume/Task Start workflows only
---

# Workflow Skill

Use this skill from `.bbg/harness/skills/start/SKILL.md`, `.bbg/harness/skills/resume/SKILL.md`, or `.bbg/harness/skills/task-start/SKILL.md` when the AI needs canonical plan/review/TDD/security routing.

Do not present this as a user-facing skill. Users should ask to start or continue work; this skill is an internal router.

## Workflow

1. Choose the workflow kind: `plan`, `review`, `tdd`, or `security`.
2. Run the internal runner if you need canonical repo guidance and Hermes recommendations:
   - `bbg workflow-agent plan "<task>"`
   - `bbg workflow-agent review "<task>"`
   - `bbg workflow-agent tdd "<task>"`
   - `bbg workflow-agent security "<task>"`
3. Read the returned command spec, references, decisions, and next actions.
4. Execute the workflow in the AI session instead of only summarizing the runner output.

## Rules

- The runner provides routing and references; the AI performs the actual reasoning and execution.
- Query Hermes when the runner recommends prior local knowledge.
- Preserve verification evidence for any workflow that changes code or governance assets.

## Related

- [workflow orchestration](../workflow-orchestration/SKILL.md)
- [TDD workflow](../tdd-workflow/SKILL.md)
- [security review](../security-review/SKILL.md)
- [plan command](../../commands/plan.md)
