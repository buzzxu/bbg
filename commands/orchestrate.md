# /orchestrate

## Description
Coordinate multiple agents for complex tasks that span several domains (e.g., implement feature + write tests + update docs + security review). Breaks work into parallel and sequential phases.

## Usage
```
/orchestrate "task description"
/orchestrate "Add authentication with tests, docs, and security review"
```

## Process
1. **Decompose task** — Break the complex task into domain-specific subtasks
2. **Assign agents** — Map each subtask to the best-fit agent:
   - Code changes → planner + implementation
   - Testing → tdd-guide
   - Security → security-reviewer
   - Docs → update-docs
   - Quality → code-reviewer
3. **Plan execution order** — Identify:
   - Parallel phases (independent subtasks)
   - Sequential phases (dependent subtasks)
   - Verification gates (must pass before next phase)
4. **Execute phases** — Run each phase, collecting results
5. **Aggregate results** — Combine all outputs into unified report
6. **Final verification** — Run quality gate across all changes

## Output
Orchestration report:
- Task decomposition with agent assignments
- Phase execution timeline
- Per-agent results and findings
- Aggregated quality metrics
- Final verification status

## Rules
- Never parallelize tasks that modify the same files
- Always run tests between implementation and review phases
- Security review must be the last step before completion
- If any phase fails critically, halt and report before continuing
- Keep the user informed of progress between phases

## Examples
```
/orchestrate "Add CSV export with validation, tests, and docs"
/orchestrate "Refactor auth module: migrate, test, review, document"
/orchestrate "Fix security vulnerabilities and verify fixes"
```
