# /plan

## Description
Create a structured implementation plan for a feature or change. Analyzes the codebase to identify affected files, dependencies, and potential risks, then breaks the work into ordered tasks.

## Usage
```
/plan "feature description"
/plan "Fix authentication timeout handling"
```

## Process
1. **Clarify scope** — Parse the feature description and ask clarifying questions if ambiguous
2. **Analyze codebase** — Identify relevant files, modules, and dependencies
3. **Map impact** — Determine which files need changes, which tests need updates
4. **Identify risks** — Note breaking changes, migration needs, security implications
5. **Break into tasks** — Create ordered, atomic tasks with clear acceptance criteria
6. **Estimate complexity** — Rate each task (small/medium/large) and flag blockers
7. **Output plan** — Write the plan as a TODO list with dependencies noted

## Output
A structured plan with:
- Summary of the feature and approach
- List of affected files with change descriptions
- Ordered task list with complexity ratings
- Risk assessment and mitigation strategies
- Test plan covering new and regression tests

## Rules
- Always search the codebase before planning — never assume structure
- Include test tasks for every implementation task
- Flag any tasks that require user decisions
- Prefer incremental changes over big-bang rewrites
- Reference existing patterns in the codebase

## Examples
```
/plan "Add user authentication with JWT tokens"
/plan "Refactor database layer to support PostgreSQL"
/plan "Add CSV export to the reporting module"
```

## Related

- **Agents**: [planner](../agents/planner.md), [architect](../agents/architect.md)
- **Skills**: [writing-plans](../skills/writing-plans/SKILL.md), [search-first](../skills/search-first/SKILL.md), [api-design](../skills/api-design/SKILL.md)
- **Rules**: [patterns](../rules/common/patterns.md), [coding-style](../rules/common/coding-style.md)
