# Agent Pipeline

## Purpose

Defines sequential agent processing pipelines where each agent's output feeds into the next agent's input. Establishes stage boundaries, quality gates between stages, and rollback procedures.

## When to Use

- When a task requires multiple specialized agents in sequence
- When implementing a feature that spans research → design → implementation → review
- When automating a multi-stage quality assurance process

## Pipeline Stages

A typical pipeline follows this pattern:

```
[Research] → [Design] → [Implement] → [Review] → [Verify]
     ↓           ↓           ↓            ↓           ↓
  Context     Spec/Plan    Code+Tests   Feedback    Final Check
```

### Stage Definition

Each stage must define:

1. **Input**: What the stage receives (files, context, specifications)
2. **Agent**: Which agent or agent type handles this stage
3. **Output**: What the stage produces
4. **Quality Gate**: Pass/fail criteria before advancing
5. **Rollback**: What happens if the quality gate fails

### Example Pipeline

```
Stage 1: Research (explore agent)
  Input: User requirement
  Output: Codebase context summary, affected files list
  Gate: All referenced files exist and are readable

Stage 2: Design (planner agent)
  Input: Context summary + requirement
  Output: Implementation plan with task breakdown
  Gate: Plan covers all requirements, no ambiguous steps

Stage 3: Implement (TDD agent)
  Input: Implementation plan
  Output: Code changes with tests
  Gate: All tests pass, build succeeds

Stage 4: Review (code-reviewer agent)
  Input: Code changes
  Output: Review feedback
  Gate: No severity-high issues

Stage 5: Verify (e2e-runner agent)
  Input: Complete changes
  Output: Verification report
  Gate: All checks pass
```

## Quality Gates

Between each stage, verify:

- [ ] Stage output matches expected format
- [ ] No regressions introduced (tests still pass)
- [ ] Output is complete (no TODOs or placeholders)
- [ ] Handoff context is properly structured (see [Agent Handoff](../agent-handoff/SKILL.md))

## Failure Handling

When a quality gate fails:

1. **Retry**: Re-run the current stage with additional context about the failure
2. **Rollback**: Return to the previous stage with failure context
3. **Escalate**: Flag for human intervention if retry and rollback both fail

Maximum retries per stage: 2 (to prevent infinite loops).

## Anti-Patterns

- **Monolith pipeline**: One giant stage that does everything
- **Gate-free pipeline**: No quality checks between stages
- **Rigid ordering**: Not allowing stages to be skipped when unnecessary
- **Silent failures**: Stages that fail without clear error context

## Related

- [Agent Handoff](../agent-handoff/SKILL.md) — context handoff between agents
- [Planner Agent](../../agents/planner.md) — creates implementation plans
- [Code Reviewer Agent](../../agents/code-reviewer.md) — reviews code quality
- [E2E Runner Agent](../../agents/e2e-runner.md) — end-to-end testing
- [Loop Operator Agent](../../agents/loop-operator.md) — autonomous loop management
