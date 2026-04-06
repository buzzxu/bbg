---
name: workflow-orchestration
category: ai-workflow
description: Runtime workflow orchestration -- state machine execution, step retry/resume, SQLite tracking, and preset management
---

# Workflow Orchestration

## Overview

Load this skill when executing multi-step AI workflows from preset definitions. Workflows coordinate multiple agents through a defined sequence of steps with state tracking, retry logic, and SQLite-based observability.

## State Machine

### Step States

```
pending -> in_progress -> completed
        |
        v
      failed -> retrying -> in_progress
        |
        v
      paused -> in_progress (resume)
        |
        v
      aborted
```

### Workflow States

```
pending -> in_progress -> completed
        |
        v
      paused -> in_progress (resume)
        |
        v
      aborted
```

### Transitions

- **pending -> in_progress**: Step/workflow begins execution
- **in_progress -> completed**: Success criteria met
- **in_progress -> failed**: Step throws error or criteria not met
- **failed -> retrying**: Retry count < max_retries
- **retrying -> in_progress**: Retry attempt begins
- **failed -> aborted**: Retry count >= max_retries
- **in_progress -> paused**: User requests pause or timeout
- **paused -> in_progress**: User resumes with `/workflow-resume`

## Execution Protocol

### Starting a Workflow

1. Load workflow definition from `workflows/presets/<name>.yaml`
2. Validate against `workflows/schema.json`
3. Evaluate step conditions (for example `backend_project`) and remove inactive steps
4. Generate a unique `workflow_id` (format: `<name>-<timestamp>`)
5. Insert row into `workflow_instances` with status `pending`
6. Insert rows into `workflow_steps` for each active step with status `pending`
7. Set workflow status to `in_progress`, begin first step

### Executing a Step

1. Set step status to `in_progress`, record `started_at`
2. Verify all `depends_on` steps are `completed`
3. Collect `inputs` from completed step `outputs`
4. Invoke the designated `agent` with the designated `command`
5. Evaluate `success_criteria` -- all must be satisfied
6. On success: set status to `completed`, record `completed_at` and `duration_ms`
7. On failure: increment `retries`, set status to `retrying` or `failed`
8. Update `workflow_instances.completed_steps` count

### Retry Logic

- Maximum retries per step: defined in `config.max_retries`
- Delay between retries: `config.retry_delay_ms`
- On retry: log failure reason, increment retry counter, re-attempt
- After max retries exhausted: set step to `failed`, set workflow to `paused`
- User must decide: fix and `/workflow-resume`, skip (if `allow_skip`), or abort

### Resuming a Workflow

1. Load workflow state from `workflow_instances` where status = `paused`
2. Find the failed/paused step
3. If user fixed the issue: retry the step
4. If user wants to skip: set step to `aborted`, advance to next step (only if `allow_skip: true`)
5. If user wants to abort: set workflow to `aborted`

### Conditional Steps

Steps with a `condition` field are evaluated at workflow start:

- `backend_project`: included only if the project has backend repos (Java, Go, Rust, or Python with Django/FastAPI/Flask)
- Steps whose condition is not met are removed from the execution plan
- Dependencies that reference removed steps are also removed

## SQLite Tracking

All workflow executions are recorded in `.bbg/telemetry.db`:

- Initialize schema: `sqlite3 .bbg/telemetry.db < .bbg/scripts/workflow-schema.sql`
- Query efficiency: `SELECT * FROM v_workflow_efficiency`
- Find bottlenecks: `SELECT * FROM v_step_bottlenecks LIMIT 10`

## Available Presets

| Preset | Steps (frontend) | Steps (backend) | Red Team |
| --- | --- | --- | --- |
| `tdd-feature` | 6 | 8 | Yes |
| `bugfix` | 5 | 5 | No |
| `security-audit` | 4 | 6 | Yes |
| `release-prep` | 5 | 7 | Yes |
| `full-feature` | 7 | 9 | Yes |

## Rules

- Always validate workflow YAML against schema before execution
- Never skip mandatory steps (only skip if `allow_skip: true`)
- Record all state transitions in SQLite
- Log failure reasons for every failed step
- Respect timeout and pause workflow if `timeout_ms` is exceeded
- Conditional steps must be evaluated at start, not mid-execution

## Checklist

- [ ] Workflow loaded and validated against schema
- [ ] Conditions evaluated and inactive steps removed
- [ ] SQLite tracking initialized
- [ ] Each step verified against success criteria
- [ ] Failed steps retried up to max_retries
- [ ] Workflow state persisted after every transition
- [ ] Duration tracked for every step and overall workflow

## Related

- **Skills**: [autonomous-loops](../autonomous-loops/SKILL.md), [agent-orchestration](../agent-orchestration/SKILL.md)
- **Commands**: [/workflow-start](../../commands/workflow-start.md), [/workflow-resume](../../commands/workflow-resume.md), [/workflow-status](../../commands/workflow-status.md)
- **SQL**: [workflow-schema.sql](../../templates/generic/.bbg/scripts/workflow-schema.sql)
