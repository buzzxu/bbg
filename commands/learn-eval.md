# /learn-eval

## Description
Extract patterns from the current session, evaluate their quality and applicability with confidence scoring, then save validated patterns as reusable skills.

## Usage
```
/learn-eval
/learn-eval --min-confidence 0.7
/learn-eval --dry-run
```

## Process
1. **Extract candidates** — Identify all potential patterns from the session
2. **Score each pattern** — Evaluate on four dimensions (0.0-1.0):
   - **Specificity** — How concrete and actionable is it?
   - **Reusability** — How often would this apply across projects?
   - **Correctness** — Is the pattern actually correct and complete?
   - **Novelty** — Does it add new knowledge beyond existing skills?
3. **Calculate confidence** — Weighted average of dimension scores
4. **Filter** — Keep patterns above the confidence threshold (default 0.7)
5. **Deduplicate** — Merge similar patterns, discard redundant ones
6. **Save** — Write high-confidence patterns to `skills/` with metadata
7. **Report** — Show all candidates with scores and save/discard decisions

## Output
For each candidate pattern:
- Name and description
- Dimension scores and overall confidence
- Decision: SAVE / DISCARD / REVIEW (borderline)
- Saved skill file path (if saved)

Summary:
- Total candidates / saved / discarded / needs-review

## Rules
- Be honest about confidence — do not inflate scores
- Patterns from error recovery are often the most valuable
- A pattern that only applies to one project scores low on reusability
- Always include the session context where the pattern was discovered
- Borderline patterns (0.5-0.7) should be flagged for human review

## Examples
```
/learn-eval                         # Extract and evaluate all patterns
/learn-eval --min-confidence 0.8    # Higher quality threshold
/learn-eval --dry-run               # Show scores without saving
```

## Related

- **Skills**: [continuous-learning](../skills/continuous-learning/SKILL.md)
