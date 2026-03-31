# BBG Hooks

Lifecycle hooks for Claude Code (and compatible AI agents) that enforce governance, security, and code quality throughout development sessions.

## Architecture

```
hooks/
  hooks.json              # Hook configuration (event → matcher → command)
  scripts/
    session-start.js      # Load previous session context
    session-end.js        # Save session state and summarize
    pre-edit-check.js     # Validate edits for quality issues
    post-edit-typecheck.js # Run tsc --noEmit after .ts edits
    security-scan.js      # Block destructive commands, detect secrets
    suggest-compact.js    # Track token usage, suggest compaction
```

## Hook Types

| Event | When | Purpose |
|-------|------|---------|
| `PreToolUse` | Before a tool runs | Block destructive actions, validate edits |
| `PostToolUse` | After a tool runs | Typecheck, format, track token usage |
| `Stop` | Session ends | Save state for next session |
| `SessionStart` | Session begins | Restore previous context |

## Matchers

- `Bash` — Matches Bash/shell tool invocations
- `Edit` — Matches file edit tool invocations
- `""` (empty) — Matches all tool invocations

## How It Works

1. Agent triggers a tool (e.g., Bash, Edit)
2. `hooks.json` is consulted for matching hooks
3. Matching hook scripts receive tool input/output via stdin as JSON
4. Scripts exit with code:
   - `0` — OK, proceed
   - `2` — Block the action (PreToolUse only)
   - `1` — Error (logged but does not block)

## Scripts

### session-start.js
Reads `.bbg/session-state.json` and displays previous session summary, pending TODOs, and recently modified files.

### session-end.js
Collects git changes, recent commits, and writes session state to `.bbg/session-state.json` for continuity.

### pre-edit-check.js
Scans edit content for:
- `console.log` statements in TypeScript files
- `debugger` statements
- TODO comments without ticket references (e.g., `TODO(PROJ-123)`)
- Hardcoded secrets (AWS keys, GitHub tokens, Stripe keys)

### post-edit-typecheck.js
Runs `tsc --noEmit` after `.ts`/`.tsx` file edits and reports type errors.

### security-scan.js
Blocks destructive Bash commands (`rm -rf /`, force push to main) and detects secret patterns in commands.

### suggest-compact.js
Tracks cumulative edit size across the session, estimates token usage, and suggests running `/compact` at 70% and 90% thresholds.

## Customization

### Adding a new hook

1. Create a script in `hooks/scripts/`
2. Add an entry to `hooks.json` under the appropriate event type
3. Script receives tool input/output as JSON on stdin
4. Use exit code `2` to block (PreToolUse), `0` to allow

### Adjusting thresholds

Edit the constants at the top of each script:
- `suggest-compact.js`: `WARN_THRESHOLD`, `CRITICAL_THRESHOLD`, `CONTEXT_LIMIT_TOKENS`
- `security-scan.js`: Add patterns to `DESTRUCTIVE_COMMANDS` or `SECRET_PATTERNS`
- `pre-edit-check.js`: Add patterns to `WARN_PATTERNS` or `SECRET_PATTERNS`

### Disabling a hook

Remove or comment out the entry in `hooks.json`. Each hook entry is independent.

## State Files

| File | Purpose |
|------|---------|
| `.bbg/session-state.json` | Session continuity (TODOs, modified files, summary) |
| `.bbg/token-tracker.json` | Cumulative token usage tracking |

Both files are created automatically and should be added to `.gitignore`.
