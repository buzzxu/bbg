# /loop-status

## Description
Check the progress and current state of an autonomous build-test-fix loop. Shows iteration count, errors fixed, remaining issues, and estimated completion.

## Usage
```
/loop-status
/loop-status --detailed
```

## Process
1. **Read loop state** — Check `.bbg/loop-state.json` for current loop data
2. **Display progress** — Show:
   - Current iteration / max iterations
   - Errors at start vs errors now
   - Fixes applied this loop
   - Current error being worked on
3. **Show timeline** — Display iteration history with results
4. **Estimate completion** — Based on fix rate, estimate remaining iterations
5. **Show options** — Available actions (continue, pause, abort)

## Output
```
Loop Status: RUNNING
Iteration: 7/20
Errors: 12 → 5 (7 fixed, 0 new)
Current: Fixing type error in src/commands/init.ts:42
Fix rate: 1.0 errors/iteration
Estimated remaining: ~5 iterations

Recent iterations:
  #5: Fixed missing import in detect-stack.ts (8 → 7 errors)
  #6: Fixed type mismatch in render.ts (7 → 6 errors)
  #7: Fixed null check in doctor.ts (6 → 5 errors)
```

## Rules
- If no loop is running, inform the user and suggest /loop-start
- Show enough history to understand the trend
- Warn if error count has been plateauing (same count for 3+ iterations)
- Display elapsed time and average time per iteration
- Show which files have been modified during the loop

## Examples
```
/loop-status               # Quick summary
/loop-status --detailed    # Full iteration history
```
