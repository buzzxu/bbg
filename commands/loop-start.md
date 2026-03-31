# /loop-start

## Description
Start an autonomous build-test-fix loop that continuously runs the build, identifies failures, fixes them, and re-verifies until all checks pass or a maximum iteration count is reached.

## Usage
```
/loop-start
/loop-start --max-iterations 10
/loop-start --checks "build,test,typecheck"
```

## Process
1. **Configure loop** — Set max iterations (default 20), checks to run, and exit criteria
2. **Initial run** — Execute all checks and record baseline failures
3. **Analyze failures** — Categorize and prioritize errors
4. **Fix iteration** — For each iteration:
   a. Pick the highest-priority fixable error
   b. Apply the fix
   c. Re-run all checks
   d. Record results (fixed/new/remaining errors)
5. **Check exit conditions**:
   - All checks pass → SUCCESS
   - Max iterations reached → PARTIAL (report remaining)
   - Error count increasing → ABORT (something is wrong)
6. **Report** — Final summary of all iterations and outcomes

## Output
Per-iteration:
- Iteration N/max: fixing "error description"
- Fix applied: file:line change summary
- Result: X errors remaining (Y fixed, Z new)

Final report:
- Total iterations run
- Errors fixed / remaining
- Exit reason (success/max-iterations/abort)
- Files modified during loop

## Rules
- Maximum 20 iterations by default to prevent infinite loops
- Abort if error count increases for 3 consecutive iterations
- Never modify test files to make tests pass (fix the code instead)
- Save a checkpoint before starting the loop
- Each fix should be atomic and minimal
- Log all changes for review after the loop completes

## Examples
```
/loop-start                              # Default: build + test + typecheck
/loop-start --max-iterations 5           # Quick loop
/loop-start --checks "build,typecheck"   # Skip tests
```
