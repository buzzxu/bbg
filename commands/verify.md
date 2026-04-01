# /verify

## Description
Run the full verification suite and compare results against a saved checkpoint to detect regressions. Reports any degradation in build, tests, or type safety.

## Usage
```
/verify
/verify --against "pre-migration"
/verify --strict
```

## Process
1. **Load checkpoint** — Read the most recent (or specified) checkpoint from `.bbg/checkpoints/`
2. **Run build** — Execute `npm run build` and compare to checkpoint
3. **Run tests** — Execute `npm test` and compare pass/fail counts
4. **Run typecheck** — Execute `tsc --noEmit` and compare error count
5. **Diff results** — Compare current state against checkpoint:
   - New failures that didn't exist at checkpoint time
   - Resolved issues that were present at checkpoint time
   - Changed files since checkpoint
6. **Report** — Display comparison table with regression indicators

## Output
Comparison table:
| Check | Checkpoint | Current | Status |
|-------|-----------|---------|--------|
| Build | pass | pass | OK |
| Tests | 45 pass | 43 pass, 2 fail | REGRESSION |
| Types | 0 errors | 3 errors | REGRESSION |

Detailed regression info for any failing checks.

## Rules
- If no checkpoint exists, inform the user to run /checkpoint first
- REGRESSION status if any metric is worse than checkpoint
- IMPROVED status if metrics are better
- STABLE status if metrics are identical
- --strict mode fails on any new warnings too, not just errors
- Always show which specific tests or type errors are new

## Examples
```
/verify                               # Compare against most recent checkpoint
/verify --against "pre-migration"     # Compare against named checkpoint
/verify --strict                      # Treat warnings as regressions too
```

## Related

- **Skills**: [verification-loop](../skills/verification-loop/SKILL.md)
- **Rules**: [testing](../rules/common/testing.md)
