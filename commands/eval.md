# /eval

## Description
Evaluate code or changes against defined quality criteria. Produces a scored assessment with specific findings and improvement recommendations.

## Usage
```
/eval [file or directory]
/eval src/commands/init.ts
/eval --criteria security,performance,readability
```

## Process
1. **Define criteria** — Use defaults or user-specified criteria:
   - **Correctness** — Does the code do what it claims?
   - **Security** — Are there vulnerability risks?
   - **Performance** — Are there efficiency concerns?
   - **Readability** — Is the code clear and well-structured?
   - **Testability** — Can this code be easily tested?
   - **Maintainability** — Will this be easy to change later?
2. **Analyze code** — Read and understand the code in scope
3. **Score each criterion** — Rate 1-5 with specific evidence:
   - 5: Excellent — exemplary code
   - 4: Good — minor improvements possible
   - 3: Adequate — some issues to address
   - 2: Below standard — significant issues
   - 1: Poor — major rework needed
4. **Calculate overall** — Weighted average of all criteria
5. **Report** — Display scorecard with evidence and recommendations

## Output
Evaluation scorecard:
| Criterion | Score | Evidence |
|-----------|-------|----------|
| Correctness | 4/5 | Handles most edge cases |
| Security | 3/5 | Missing input validation on line 42 |

Overall score: X.X/5.0
Top recommendations for improvement.

## Rules
- Every score must be backed by specific code references
- Be objective — apply the same standard to all code
- Compare against project conventions in AGENTS.md
- Include both strengths and weaknesses
- Recommendations must be actionable with clear steps

## Examples
```
/eval src/commands/init.ts
/eval src/analyzers/ --criteria correctness,testability
/eval --criteria security    # Security-focused evaluation
```

## Related

- **Agents**: [harness-optimizer](../agents/harness-optimizer.md)
- **Skills**: [eval-harness](../skills/eval-harness/SKILL.md)
