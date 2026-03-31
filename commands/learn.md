# /learn

## Description
Extract reusable patterns, decisions, and techniques from the current session and save them as skills for future sessions.

## Usage
```
/learn
/learn "pattern name"
/learn --from-session
```

## Process
1. **Review session** — Analyze what was done in the current session
2. **Identify patterns** — Find reusable techniques, workflows, and decisions
3. **Extract knowledge** — Formalize patterns into structured skill definitions:
   - When to apply (trigger conditions)
   - What to do (step-by-step process)
   - What to avoid (anti-patterns)
   - Example usage
4. **Check for duplicates** — Compare against existing skills in `skills/`
5. **Save skills** — Write to `skills/` directory as markdown files
6. **Validate** — Ensure the skill is specific enough to be actionable

## Output
- List of patterns identified with confidence levels
- New skill files created in `skills/`
- Updated skill index if applicable
- Recommendations for manual review

## Rules
- Only extract patterns that appeared at least twice or solved a significant problem
- Skills must be specific and actionable, not vague guidelines
- Include concrete examples from the actual session
- Cross-reference with existing AGENTS.md rules to avoid duplication
- Tag skills with relevant languages, frameworks, and domains

## Examples
```
/learn                              # Extract all patterns from session
/learn "error-boundary-pattern"     # Extract a specific named pattern
/learn --from-session               # Review full session history
```
