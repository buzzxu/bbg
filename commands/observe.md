# /observe

## Description

Create or summarize observation sessions for UI, logs, metrics, and traces so agent verification artifacts stay organized.

## Usage

```
/observe start "checkout latency"
/observe start "login regression" --env login-regression
/observe report checkout-latency
```

## Process

1. Start a new observation session or attach one to an existing task environment.
2. Capture screenshots, DOM snapshots, logs, metrics, and traces into the prepared directories.
3. Summarize what was captured before handing off or closing the task.
4. Reuse the same session while the task environment remains active.

## Rules

- Observation sessions should stay scoped to a concrete task or investigation
- Prefer attaching observation sessions to task environments when available
- Keep artifact notes in sync with captured files

## Related

- [Task Env Command](./task-env.md)
- [E2E Command](./e2e.md)
- [Agent Observability Skill](../skills/agent-observability/SKILL.md)
