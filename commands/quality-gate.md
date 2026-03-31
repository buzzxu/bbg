# /quality-gate

## Description
Run the full quality gate — build, tests, lint, typecheck, and security scan — in sequence. All checks must pass for the gate to be green. Used before commits, PRs, and releases.

## Usage
```
/quality-gate
/quality-gate --fix
/quality-gate --skip lint
```

## Process
1. **Build** — Run `npm run build` and verify clean compilation
2. **Typecheck** — Run `tsc --noEmit` for type safety verification
3. **Tests** — Run `npm test` and verify all tests pass
4. **Lint** — Run linter (if configured) and check for violations
5. **Security** — Run secret scan and dependency audit
6. **Report** — Display gate results with pass/fail for each check

## Output
```
Quality Gate Results:
  [PASS] Build        — compiled in 1.2s
  [PASS] Typecheck    — 0 errors
  [PASS] Tests        — 45 passed, 0 failed
  [SKIP] Lint         — no linter configured
  [PASS] Security     — no secrets detected, 0 vulnerable deps

Gate Status: PASSED (4/4 checks passed, 1 skipped)
```

If any check fails:
- Detailed error output for each failing check
- Suggested fix actions
- If `--fix` is passed, attempt auto-fix and re-run

## Rules
- Run checks in dependency order (build before tests)
- A single failure means the gate is RED — all checks must pass
- Skipped checks don't count as failures but are noted
- --fix mode should only fix safe, automated issues (formatting, imports)
- Always show timing for each check
- Save gate results to `.bbg/quality-gate-results.json` for history

## Examples
```
/quality-gate              # Full gate check
/quality-gate --fix        # Auto-fix and re-run
/quality-gate --skip lint  # Skip specific checks
```

## Related

- **Skills**: [performance-optimization](../skills/performance-optimization/SKILL.md)
- **Rules**: [performance](../rules/common/performance.md)
