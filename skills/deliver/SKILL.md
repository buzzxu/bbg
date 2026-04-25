---
name: deliver
category: documentation
visibility: user
description: AI-driven delivery report workflow for producing customer-facing implementation summaries and artifacts when the user asks for delivery/customer-facing reports; use instead of a public bbg deliver CLI command
---

# Deliver Skill

Use this skill when the user wants a customer-facing delivery report after implementation, review, or release preparation.

Do not ask the user to run `bbg deliver`. Delivery requires AI judgment about audience, scope, evidence, and sensitive information.

## Workflow

1. Gather requirement specs, implementation notes, review/audit reports, and verification evidence.
2. Draft the customer-facing narrative using `.bbg/harness/skills/client-delivery/SKILL.md`.
3. Run the internal runner if deterministic report scaffolding or diagrams are useful:
   - `bbg deliver-agent`
   - `bbg deliver-agent --task <task-id>`
   - `bbg deliver-agent --spec <path>`
   - Optional: `--no-include-svg`, `--hours <value>`
4. Review generated content for business clarity and sensitive information before presenting it.

## Rules

- Avoid internal-only jargon unless the customer needs it.
- Keep provenance to specs, commits, tests, and audit artifacts.
- Do not include secrets, credentials, private operational details, or unsupported claims.

## Related

- [client delivery](../client-delivery/SKILL.md)
- [deliver command](../../commands/deliver.md)
- [wiki compilation](../wiki-compilation/SKILL.md)
- [cross audit](../cross-audit/SKILL.md)
