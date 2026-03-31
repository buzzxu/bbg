# /build-fix

## Description
Fix build errors by running the build, categorizing errors, and fixing them one at a time with re-verification after each fix.

## Usage
```
/build-fix
/build-fix --strict
```

## Process
1. **Run build** — Execute `npm run build` and capture all errors
2. **Categorize errors** — Group by type: type errors, import errors, syntax errors, config errors
3. **Prioritize** — Fix blocking errors first (syntax → imports → types → warnings)
4. **Fix one at a time** — Make the smallest change to fix each error
5. **Re-verify** — Run `npm run build` after each fix to confirm resolution
6. **Check for cascades** — Some fixes resolve multiple errors; re-count after each fix
7. **Final verification** — Run full build + tests to confirm everything passes

## Output
For each error fixed:
- Error message and location
- Root cause analysis
- Fix applied (with diff)
- Remaining error count

Final summary:
- Total errors found and fixed
- Build status (pass/fail)
- Any remaining issues that need manual intervention

## Rules
- Never fix more than one error at a time without re-verifying
- Always run the build after each fix — never assume a fix works
- Prefer fixing root causes over symptoms (one fix may resolve many errors)
- Do not change test files to fix build errors unless the test is wrong
- If a fix requires a design decision, ask the user

## Examples
```
/build-fix
/build-fix --strict    # Also treat warnings as errors
```

## Related

- **Agents**: [build-error-resolver](../agents/build-error-resolver.md), [typescript-build-resolver](../agents/typescript-build-resolver.md), [python-build-resolver](../agents/python-build-resolver.md), [go-build-resolver](../agents/go-build-resolver.md), [java-build-resolver](../agents/java-build-resolver.md), [rust-build-resolver](../agents/rust-build-resolver.md), [cpp-build-resolver](../agents/cpp-build-resolver.md)
- **Skills**: [ci-cd-patterns](../skills/ci-cd-patterns/SKILL.md)
- **Rules**: [coding-style](../rules/common/coding-style.md)
