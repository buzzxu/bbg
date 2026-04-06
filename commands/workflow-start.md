# /workflow-start

## Description

Start a predefined workflow from available presets. Loads the workflow definition, evaluates conditions, initializes SQLite tracking, and begins sequential step execution.

## Usage

```
/workflow-start tdd-feature
/workflow-start bugfix
/workflow-start security-audit
/workflow-start release-prep
/workflow-start full-feature
```

## Process

1. **Load preset** -- Read workflow YAML from `workflows/presets/<name>.yaml`
2. **Validate** -- Check against `workflows/schema.json`
3. **Evaluate conditions** -- Remove steps where `condition` is not met (for example red-team steps for non-backend projects)
4. **Initialize tracking** -- Create `workflow_instances` and `workflow_steps` rows in SQLite
5. **Execute steps** -- Run each step sequentially:
   - Check dependencies are satisfied
   - Invoke the designated agent with the designated command
   - Verify success criteria
   - Record results in SQLite
6. **Handle failures** -- Retry up to `max_retries`, then pause for user input
7. **Complete** -- Set workflow status to `completed`, record total duration

## Output

Per step:

- Step N/total: "Step Title" (agent: agent-name)
- Status: completed | failed | retrying
- Duration: Xms

Final:

- Workflow: completed | paused | aborted
- Total duration
- Steps: X/Y completed
- SQLite records updated

## Rules

- Validate preset exists before starting
- Never run steps out of dependency order
- Always record state transitions in SQLite
- Pause and report if a step fails after max retries
- Respect workflow timeout_ms

## Examples

```
/workflow-start tdd-feature
/workflow-start security-audit
/workflow-start full-feature
```

## Related

- **Skills**: [workflow-orchestration](../skills/workflow-orchestration/SKILL.md)
- **Commands**: [/workflow-resume](./workflow-resume.md), [/workflow-status](./workflow-status.md)
