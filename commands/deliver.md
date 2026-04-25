# /deliver

## Description

Use the Deliver Skill to generate a client-facing implementation package after task completion and audits. Do not ask the user to run a public `bbg deliver` CLI command.

## Usage

```

The skill may call `bbg deliver-agent` internally for deterministic report scaffolding.
/deliver
/deliver --task TASK-2026-04-09-001
/deliver --spec docs/specs/2026/04/notification-system.md
/deliver --include-svg
```

## Options

| Flag            | Default                 | Description                                |
| --------------- | ----------------------- | ------------------------------------------ |
| `--task`        | latest completed        | Task/workflow identifier                   |
| `--spec`        | inferred                | Confirmed requirement spec path            |
| `--include-svg` | `true`                  | Include SVG architecture and flow diagrams |
| `--hours`       | auto-estimated          | Override total effort hours                |
| `--out`         | `docs/delivery/YYYY/MM` | Output folder                              |

## Process

1. Collect requirement, implementation, review, and audit artifacts
2. Build customer-readable implementation narrative
3. Generate effort-hours breakdown by phase
4. Render optional SVG diagrams (architecture and business flow)
5. Save delivery package and update delivery index

## Output

- Delivery report: `docs/delivery/YYYY/MM/<slug>-delivery.md`
- Diagram files: `docs/delivery/YYYY/MM/diagrams/*.svg`
- Optional reusable report copy: `docs/reports/YYYY/MM/delivery-report-<slug>.md`

## Timeout Rule (Workflow Prompt)

When used at workflow end, prompt user:

`Need client delivery report? Reply within 10 seconds (default: no).`

- If user confirms within 10 seconds: generate report
- If no response within 10 seconds: skip
- Report can be generated later from `--task` or `--spec`

## Rules

- Delivery reports are customer-facing; avoid internal jargon and sensitive data
- Keep provenance to requirement and audit artifacts
- Use dated folders (`YYYY/MM`) for delivery outputs

## Related

- **Skills**: [deliver](../skills/deliver/SKILL.md), [client-delivery](../skills/client-delivery/SKILL.md), [wiki-compilation](../skills/wiki-compilation/SKILL.md)
- **Commands**: [/task-start](./task-start.md), [/workflow-status](./workflow-status.md)
