---
name: agent-orchestration
category: ai
description: Multi-agent patterns covering task decomposition, agent specialization, result aggregation, error handling, and context sharing
---

# Agent Orchestration

## Overview
Load this skill when building multi-agent systems, designing task decomposition strategies, or coordinating specialized AI agents. Single-agent approaches hit limits on complex tasks — orchestration allows you to combine specialized agents that each do one thing well.

## Key Patterns

### Orchestration Topologies
1. **Sequential pipeline** — Agent A → Agent B → Agent C; each agent transforms and passes output forward. Best for: multi-step workflows with clear stages (analyze → plan → implement → review)
2. **Parallel fan-out** — Orchestrator dispatches subtasks to multiple agents simultaneously; aggregates results. Best for: independent subtasks that benefit from specialization
3. **Hierarchical** — Supervisor agent decomposes the task and delegates to worker agents; workers may further delegate. Best for: complex, open-ended tasks requiring dynamic planning
4. **Debate / consensus** — Multiple agents independently solve the same problem; a judge agent selects or synthesizes the best answer. Best for: high-stakes decisions requiring diverse perspectives
5. **Iterative refinement** — Agent A produces output; Agent B critiques it; Agent A refines; repeat until quality threshold. Best for: content generation, code quality, complex reasoning

### Task Decomposition
- Break complex tasks into subtasks that are independently completable and verifiable
- Each subtask should have a clear input specification, output format, and success criteria
- Prefer breadth-first decomposition — identify all subtasks before starting execution
- Limit decomposition depth — more than 3 levels deep signals the task needs redesign
- Include dependency graph — which subtasks must complete before others can start

### Agent Specialization
- Each agent has one clear role: planner, coder, reviewer, researcher, tester
- Define the agent's system prompt with explicit scope boundaries — what it handles and what it does not
- Specialize by: domain (frontend vs backend), capability (search vs generation), or quality attribute (speed vs accuracy)
- Use the right model for each agent — planners need reasoning (Opus/o1); formatters need speed (Haiku/Flash)
- Keep agent count minimal — each agent adds latency, cost, and coordination overhead

### Context Sharing
- **Shared workspace** — All agents read/write to a common state (file system, database, or memory object)
- **Message passing** — Agents communicate through structured messages with defined schemas
- **Context window management** — Summarize upstream outputs before passing to downstream agents; avoid context overflow
- **Minimal context** — Each agent receives only the context it needs for its task; reduce noise
- **Immutable artifacts** — Outputs from each agent are stored and versioned; downstream agents reference specific versions

### Result Aggregation
- Define aggregation strategy before execution: merge, select-best, synthesize, or vote
- Validate each agent's output against schema before aggregation — reject malformed results
- Handle partial results — if 3 of 4 agents succeed, decide whether partial aggregation is acceptable
- Quality scoring — rank agent outputs by confidence, completeness, and correctness before merging
- Conflict resolution — when agents disagree, apply domain-specific rules or escalate to human review

### Error Handling
- **Retry with backoff** — Transient failures (API timeout, rate limit) retry automatically
- **Fallback agents** — If the primary agent fails after retries, route to a fallback agent with a simpler strategy
- **Graceful degradation** — Return partial results with quality indicators rather than failing entirely
- **Circuit breaker** — If an agent type fails repeatedly, stop sending it tasks and route around it
- **Timeout budgets** — Allocate maximum time per agent and for the overall orchestration; enforce strictly
- **Error propagation** — Surface agent-level errors to the orchestrator with enough context to decide next action

### Observability
- Log every agent invocation: task, input summary, output summary, model, tokens, latency, success/failure
- Trace the full orchestration flow — which agent was called when, with what inputs, producing what outputs
- Track cost per orchestration run and per agent type
- Alert on: orchestration timeout, agent failure rate spike, cost anomaly

## Best Practices
- Start with a single agent; add orchestration only when complexity demands it
- Design agents to be stateless — all state lives in the shared workspace or is passed explicitly
- Test each agent in isolation before testing orchestrated flows
- Set hard time and cost budgets for the overall orchestration — runaway agents are expensive
- Human-in-the-loop for high-stakes decisions — agent confidence below threshold triggers human review
- Version agent prompts and orchestration logic together — they are tightly coupled

## Anti-patterns
- Over-engineering — using 5 agents for a task one agent handles well
- Circular dependencies — Agent A waits on Agent B which waits on Agent A
- Unbounded recursion — agents that can spawn more agents without depth limits
- Shared mutable state without coordination — race conditions between concurrent agents
- God orchestrator — putting complex logic in the orchestrator instead of specialized agents
- No timeout — orchestration runs indefinitely when an agent hangs

## Checklist
- [ ] Orchestration topology chosen and documented (pipeline, fan-out, hierarchical, etc.)
- [ ] Task decomposition produces independently verifiable subtasks
- [ ] Each agent has a clear role with explicit scope boundaries
- [ ] Context sharing strategy defined — shared workspace or message passing
- [ ] Result aggregation strategy defined with conflict resolution rules
- [ ] Error handling covers retry, fallback, degradation, and timeout
- [ ] Time and cost budgets set for each agent and overall orchestration
- [ ] Agent outputs validated against schema before aggregation
- [ ] Full orchestration flow is traceable with per-agent logging
- [ ] Each agent tested independently before integration testing


## Related

- **Rules**: [agents](../../rules/common/agents.md)
- **Commands**: [/orchestrate](../../commands/orchestrate.md)
