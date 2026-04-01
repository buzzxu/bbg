# Agent Handoff

## Purpose

Defines how to hand off work between specialized agents in a multi-agent workflow. Ensures context is preserved, state is captured, and the receiving agent has everything needed to continue work effectively.

## When to Use

- When one agent completes a phase and another needs to continue
- When switching from research/analysis to implementation
- When escalating from a general agent to a specialist
- When splitting work across domain boundaries

## Handoff Protocol

### 1. Pre-Handoff Checklist

Before handing off to another agent:

- [ ] Summarize what was accomplished
- [ ] List open questions or unresolved issues
- [ ] Document the current state of all modified files
- [ ] Specify what the next agent should do (not how)
- [ ] Include any constraints or decisions already made

### 2. Context Package

Structure the handoff context as:

```
## Handoff Context

### Completed Work
- [What was done, with file paths and line numbers]

### Current State
- [Build status, test status, any errors]

### Open Items
- [What still needs to be done]

### Decisions Made
- [Key decisions and their rationale]

### Constraints
- [Any rules, patterns, or restrictions to follow]
```

### 3. Receiving Agent Checklist

The receiving agent should:

- [ ] Read the full handoff context
- [ ] Verify the current state matches what was described
- [ ] Run tests/build to confirm baseline
- [ ] Ask clarifying questions before starting work
- [ ] Acknowledge the handoff before proceeding

## Anti-Patterns

- **Context-free handoff**: Telling the next agent "continue where I left off" without context
- **Assumption handoff**: Assuming the next agent knows the codebase or previous decisions
- **Incomplete state**: Handing off with uncommitted changes or failing tests
- **Over-specification**: Telling the next agent exactly how to implement (removes their expertise)

## Related

- [Agent Pipeline](../agent-pipeline/SKILL.md) — sequential multi-agent processing
- [Planner Agent](../../agents/planner.md) — plans multi-step implementations
- [Loop Operator Agent](../../agents/loop-operator.md) — manages autonomous loops
