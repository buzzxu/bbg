# /model-route

## Description
Use the Model Route Skill to select the optimal execution profile for the current task based on complexity, domain, and cost-performance tradeoffs. Do not ask the user to run a public `bbg model-route` CLI command.

## Usage
```
/model-route "task description"
/model-route --list
/model-route "Fix type error in utils" --prefer cost
```

The skill may call `bbg model-route-agent` internally to incorporate repo-local telemetry and language hints.

## Process
1. **Analyze task** — Classify the task by:
   - **Complexity**: simple (one file) / moderate (multi-file) / complex (architectural)
   - **Domain**: code generation, review, debugging, documentation, planning
   - **Context needs**: small (single function) / medium (single module) / large (whole codebase)
   - **Precision required**: high (security, types) / medium (features) / low (docs, formatting)
2. **Match to model profiles**:
   - **Fast/cheap**: Simple fixes, formatting, docs → Haiku/GPT-4o-mini
   - **Balanced**: Feature implementation, reviews → Sonnet/GPT-4o
   - **Premium**: Architecture, security, complex debugging → Opus/o1
3. **Consider context window** — Route to larger context models for codebase-wide tasks
4. **Recommend** — Suggest optimal model with reasoning

## Output
```
Task: "Fix type error in utils"
Classification: simple complexity, debugging domain
Recommended: claude-sonnet (balanced speed + accuracy)
Reason: Single-file type fix needs accuracy but not deep reasoning
Alternative: claude-haiku (faster, may miss nuance)
```

## Rules
- Always consider cost-performance tradeoff, not just capability
- Simple tasks should never be routed to premium models
- Security and architecture tasks should always use premium models
- Consider the user's --prefer flag (cost, speed, quality)
- Update routing heuristics based on observed model performance
- Default to balanced model when uncertain

## Examples
```
/model-route "Implement JWT authentication"          # → Premium (security)
/model-route "Fix typo in README"                    # → Fast (simple)
/model-route "Refactor database layer" --prefer cost # → Balanced
/model-route --list                                  # Show all model profiles
```

## Related

- **Agents**: [harness-optimizer](../agents/harness-optimizer.md)
- **Skills**: [model-route](../skills/model-route/SKILL.md), [llm-cost-optimization](../skills/llm-cost-optimization/SKILL.md)
