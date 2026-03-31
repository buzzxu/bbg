# /build-fix -- Build Error Resolution

Read and follow the agent instructions in `agents/build-error-resolver.md`.

## Steps

1. Run the build command and capture the full error output
2. Analyze each error message to identify root causes
3. Fix errors one at a time, starting with the most fundamental (e.g., missing imports before type errors)
4. Re-run the build after each fix to verify progress
5. Run tests to ensure fixes don't break existing functionality
6. Repeat until the build succeeds cleanly

## Common Patterns

- Missing imports: Add the required import statement
- Type errors: Fix type annotations or add type assertions
- Module resolution: Check file extensions (.js for ESM) and paths
- Circular dependencies: Refactor to break the cycle

## References

- Agent: `agents/build-error-resolver.md`
- Skill: `skills/verification-loop/SKILL.md`
