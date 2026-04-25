---
name: model-route
category: internal
visibility: internal
description: Internal BBG model/profile routing skill for cost, speed, and quality tradeoffs; do not expose as a user-facing entrypoint, invoke from Analyze/Start/Cross Audit flows only
---

# Model Route Skill

Use this skill internally when deciding which model class or execution profile should handle a task.

Do not present this as a user-facing skill. Model choice depends on current AI tool capabilities and task context, so the AI should make the recommendation inside the active workflow.

## Workflow

1. Classify the task by domain, complexity, context size, risk, and target languages.
2. Run the internal runner if local telemetry or repo language guidance is useful:
   - `bbg model-route-agent "<task>"`
   - `bbg model-route-agent "<task>" --prefer cost|speed|quality`
   - `bbg model-route-agent --list`
3. Combine runner output with current tool constraints. Do not hardcode vendor-specific model names in BBG governance.
4. Recommend a profile: `fast`, `balanced`, or `premium`, with rationale and downgrade/upgrade triggers.

## Rules

- Security, architecture, cross-repo, and high-ambiguity tasks default to `premium`.
- Small docs or mechanical edits default to `fast`.
- Java/Rust multi-file implementation usually needs at least `premium` or a strong coding model.
- User model selection remains inside Claude, Codex, Gemini, Cursor, or OpenCode.

## Related

- [model-route command](../../commands/model-route.md)
- [LLM cost optimization](../llm-cost-optimization/SKILL.md)
- [agent orchestration](../agent-orchestration/SKILL.md)
- [harness engineering](../harness-engineering/SKILL.md)
