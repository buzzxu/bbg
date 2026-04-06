# /workflow-status

## Description

Check the status of active, paused, or recently completed workflows. Shows step-by-step progress, timing data, and identifies bottlenecks.

## Usage

```
/workflow-status
/workflow-status --workflow-id tdd-feature-20260403T120000
/workflow-status --history
/workflow-status --bottlenecks
```

## Process

1. **Query workflows** -- Read from `workflow_instances` table
   - Default: show active/paused workflows
   - `--history`: show recent completed/aborted workflows
   - `--bottlenecks`: query `v_step_bottlenecks` view
2. **Display status** -- For each workflow:
   - Name, ID, status, started_at
   - Progress: X/Y steps completed
   - Current step (if in_progress or paused)
   - Duration so far
3. **Step detail** -- List each step with:
   - Status, duration, retries, agent
   - Failure reason (if failed)
4. **Efficiency stats** (with `--history`):
   - Query `v_workflow_efficiency` view
   - Show completion rate and average duration per workflow type

## Output

Active workflow:

```
Workflow: tdd-feature (tdd-feature-20260403T120000)
Status: in_progress | 4/6 steps completed | 45.2s elapsed
Steps:
  [x] plan (planner) -- 8.1s
  [x] write-test (tdd-guide) -- 12.3s
  [x] implement (tdd-guide) -- 15.8s
  [>] refactor (code-reviewer) -- in progress (9.0s)
  [ ] security-review (security-reviewer) -- pending
  [ ] commit (tdd-guide) -- pending
```

Bottleneck report:

```
Step Bottlenecks (by avg duration):
implement (tdd-guide) -- avg 18.5s, 3 retries across 5 runs
refactor (code-reviewer) -- avg 12.1s, 0 retries across 5 runs
```

## Rules

- Read-only operation -- never modify workflow state
- Show all active workflows by default
- Include timing data for completed steps
- Flag steps with high retry counts as potential issues

## Examples

```
/workflow-status
/workflow-status --history
/workflow-status --bottlenecks
```

## Related

- **Skills**: [workflow-orchestration](../skills/workflow-orchestration/SKILL.md)
- **Commands**: [/workflow-start](./workflow-start.md), [/workflow-resume](./workflow-resume.md)
