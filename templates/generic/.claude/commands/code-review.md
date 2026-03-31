# /code-review -- Code Quality Review

Read and follow the agent instructions in `agents/code-reviewer.md` and the skill workflow in `skills/code-review-checklist/SKILL.md`.

## Review Checklist

1. **Correctness**: Does the code do what it's supposed to?
2. **Testing**: Are there adequate tests? Do they cover edge cases?
3. **Security**: No hardcoded secrets, input validation, path sanitization
4. **Performance**: No blocking operations, efficient algorithms
5. **Style**: Follows coding standards in `rules/`
6. **DRY**: No duplicated logic
7. **Error handling**: Explicit try/catch, meaningful error messages

## References

- Agent: `agents/code-reviewer.md`
- Skill: `skills/code-review-checklist/SKILL.md`
- Rules: `rules/common/coding-style.md`
