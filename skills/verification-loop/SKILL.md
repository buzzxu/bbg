---
name: verification-loop
category: coding
description: Continuous verification pipeline — build, lint, typecheck, test, coverage, and security scan workflow
---

# Verification Loop

## Overview
Run this loop after every meaningful code change. It catches issues incrementally rather than in bulk at commit time. The loop should be fast enough to run every few minutes during development.

## Workflow

### The Pipeline (run in order)
```
1. BUILD      → Compile/transpile; catch syntax errors
2. LINT       → Static analysis; catch style and pattern violations
3. TYPECHECK  → Type verification; catch type mismatches
4. TEST       → Unit + integration tests; catch behavioral regressions
5. COVERAGE   → Measure test coverage; identify untested code paths
6. SECURITY   → Dependency audit + secret scan; catch vulnerabilities
```

### Step Details

#### 1. Build
- Command: `npm run build` (or project-equivalent)
- Fix: resolve import errors, missing modules, syntax issues
- Must pass before proceeding — everything else depends on compilable code

#### 2. Lint
- Command: `npm run lint` (eslint, biome, or project-equivalent)
- Auto-fix what's safe: `npm run lint -- --fix`
- Manual-fix: unused variables, complexity warnings, naming violations
- Never disable rules globally — use inline exceptions with justification comments

#### 3. Typecheck
- Command: `npx tsc --noEmit` (or equivalent)
- Fix: add missing types, resolve `any` usage, fix interface mismatches
- Never use `@ts-ignore` — use `@ts-expect-error` with explanation if absolutely necessary

#### 4. Test
- Command: `npm test`
- All tests must pass — no skipped tests without a linked issue
- If a test fails: fix the code, not the test (unless the test is wrong)
- Run related test files first for faster feedback: `npm test -- --filter <pattern>`

#### 5. Coverage
- Command: `npm test -- --coverage`
- Threshold: 80% lines, 75% branches minimum
- Review uncovered lines — they represent untested behaviors
- Add tests for critical uncovered paths before proceeding

#### 6. Security
- Command: `npm audit` + secret scanning
- Fix: upgrade vulnerable dependencies, remove hardcoded secrets
- If a vulnerability has no fix available, document the risk and set a reminder

### When to Run
- **Full loop**: before every commit, after rebasing, after dependency changes
- **Partial loop (build+type+test)**: after every meaningful code change
- **Test only**: after small refactors that don't change public interfaces

## Rules
- Never commit with failing steps — fix before proceeding
- Never skip steps — the order catches cascading issues early
- Automate the full loop in CI — local runs are for fast feedback
- Track coverage trends — it should never decrease on a PR
- Fix warnings promptly — they become errors over time

## Anti-patterns
- Running tests only before push — catch issues early with frequent runs
- Ignoring lint warnings because "it still works"
- Disabling type checking for convenience
- Committing with `--no-verify` to skip hooks
- Adding `istanbul ignore` without justification
- Treating CI as the only verification — run locally first

## Checklist
- [ ] Build compiles without errors
- [ ] Lint passes with no new warnings
- [ ] Typecheck passes with no errors
- [ ] All tests pass
- [ ] Coverage meets minimum thresholds (80%+ lines)
- [ ] No new security vulnerabilities in dependencies
- [ ] No hardcoded secrets detected
- [ ] CI pipeline is green


## Related

- **Agents**: [tdd-guide](../../agents/tdd-guide.md)
- **Rules**: [testing](../../rules/common/testing.md)
- **Commands**: [/verify](../../commands/verify.md)
