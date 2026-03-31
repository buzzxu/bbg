# /checkpoint

## Description
Save the current verification state (build, tests, lint, types) as a baseline for later comparison. Used with `/verify` to detect regressions.

## Usage
```
/checkpoint
/checkpoint "before refactoring analyzers"
/checkpoint --name pre-migration
```

## Process
1. **Run build** — Execute `npm run build` and record result
2. **Run tests** — Execute `npm test` and record pass/fail counts
3. **Run typecheck** — Execute `tsc --noEmit` and record error count
4. **Record file state** — Snapshot current file hashes for changed detection
5. **Save checkpoint** — Write to `.bbg/checkpoints/<name>.json` with:
   - Timestamp
   - Build status (pass/fail)
   - Test results (passed/failed/skipped counts)
   - Type error count
   - File hash manifest
6. **Confirm** — Display saved checkpoint summary

## Output
- Checkpoint name and timestamp
- Build: pass/fail
- Tests: X passed, Y failed, Z skipped
- Types: N errors
- Files: M files tracked
- Saved to: `.bbg/checkpoints/<name>.json`

## Rules
- Checkpoint names must be unique (append timestamp if duplicate)
- Always run all checks — partial checkpoints are misleading
- Store enough detail to produce meaningful diffs with /verify
- Keep checkpoint files small — hashes not full content
- Clean up old checkpoints periodically (keep last 10)

## Examples
```
/checkpoint                                  # Auto-named with timestamp
/checkpoint "before refactoring analyzers"   # Named checkpoint
/checkpoint --name pre-migration             # Explicit name flag
```

## Related

- **Skills**: [git-workflow](../skills/git-workflow/SKILL.md)
- **Rules**: [git-workflow](../rules/common/git-workflow.md)
