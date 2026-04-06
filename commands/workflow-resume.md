# /workflow-resume

## Description

Resume a paused or failed workflow from the last incomplete step. Allows retrying failed steps, skipping them (if allowed), or aborting the workflow.

## Usage

```
/workflow-resume
/workflow-resume --workflow-id tdd-feature-20260403T120000
/workflow-resume --skip
/workflow-resume --abort
```

## Process

1. **Find paused workflow** -- Query `workflow_instances` for status = `paused` (most recent if no ID given)
2. **Show status** -- Display current state, completed steps, and the failed/paused step
3. **User choice**:
   - **Retry** (default) -- Re-execute the failed step
   - **Skip** (`--skip`) -- Mark step as `aborted`, move to next (only if `allow_skip: true`)
   - **Abort** (`--abort`) -- Set workflow to `aborted`, stop execution
4. **Continue** -- Resume sequential execution from the current step
5. **Update tracking** -- Record all state changes in SQLite

## Output

Resume report:

- Workflow: <name> (<workflow_id>)
- Paused at step: <step_id> (<step_title>)
- Reason: <failure_reason>
- Action taken: retry | skip | abort
- Result: continued | completed | aborted

## Rules

- Only one workflow can be resumed at a time
- Cannot skip mandatory steps (respect `allow_skip` config)
- If retrying, increment retry count and respect max_retries
- Record the resume action in SQLite
- If the same step fails again after resume, pause again

## Examples

```
/workflow-resume
/workflow-resume --skip
/workflow-resume --abort
```

## Related

- **Skills**: [workflow-orchestration](../skills/workflow-orchestration/SKILL.md)
- **Commands**: [/workflow-start](./workflow-start.md), [/workflow-status](./workflow-status.md)
