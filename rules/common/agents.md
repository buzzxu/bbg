# Agent Delegation: Common

Rules for when and how to delegate work to specialized subagents.

## Mandatory

- Define clear scope boundaries for each agent — an agent must know what it owns
- Read-only agents must never have access to write tools (file creation, git commit, deployment)
- Write agents must validate all changes before applying them — preview then execute
- Every agent invocation must have a defined exit condition — no open-ended loops
- Agents must report their results back to the orchestrator — never silently succeed or fail
- Limit agent tool access to the minimum required for the task (principle of least privilege)
- Agent output must be deterministic for the same input — avoid non-reproducible behavior

## Recommended

- **Delegate to planner agent** for: complex features requiring multi-step implementation plans
- **Delegate to code-reviewer** for: after writing code, before committing changes
- **Delegate to tdd-guide** for: new features and bug fixes requiring test-first approach
- **Delegate to security-reviewer** for: code touching auth, payments, user data, or secrets
- **Delegate to build-error-resolver** for: compilation failures and type errors
- **Delegate to refactor-cleaner** for: code maintenance and DRY violation cleanup
- Prefer narrow-scope agents over broad ones — split large tasks into subtasks
- Use read-only agents for analysis tasks (review, audit, planning) before write agents execute
- Set token/time budgets for agent runs to prevent runaway execution

## Forbidden

- Agents that both plan and execute without human review in between
- Granting agents access to production systems or deployment pipelines
- Agent chains longer than 3 deep — flatten the orchestration instead
- Agents that modify their own instructions or tool permissions at runtime
- Using a general-purpose agent when a specialized agent exists for the task
- Agents that skip verification steps (tests, type checks) after making changes

## Examples

```
Good: orchestrator → planner (read-only) → human review → coder (write) → reviewer (read-only)
Bad:  orchestrator → super-agent (plans, writes, reviews, deploys all at once)

Good: Agent scope: "Fix type errors in src/analyzers/ — run build to verify"
Bad:  Agent scope: "Fix the project"

Good: security-reviewer runs with: [read, grep, glob] tools only
Bad:  security-reviewer runs with: [read, write, bash, deploy] tools
```


## Related

- **Skills**: [agent-orchestration](../../skills/agent-orchestration/SKILL.md)
- **Commands**: [/orchestrate](../../commands/orchestrate.md)
