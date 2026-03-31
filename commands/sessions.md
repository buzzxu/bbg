# /sessions

## Description
Manage session history — list previous sessions, resume context from a past session, and compare session outcomes.

## Usage
```
/sessions
/sessions list
/sessions resume <id>
/sessions compare <id1> <id2>
```

## Process
1. **List sessions** — Read `.bbg/session-state.json` history and display:
   - Session ID (timestamp-based)
   - Date and duration
   - Summary of changes made
   - Files modified count
2. **Resume session** — Load context from a specific session:
   - Restore TODO state
   - Show what was in progress
   - Display modified files for context
3. **Compare sessions** — Diff two sessions:
   - Files modified in each
   - Tasks completed in each
   - Overlap and divergence

## Output
**List mode:** Table of sessions with ID, date, summary, file count
**Resume mode:** Restored context with TODOs and modified files
**Compare mode:** Side-by-side comparison of two sessions

## Rules
- Sessions are identified by timestamp-based IDs
- Session data is stored in `.bbg/session-state.json`
- Resume does not undo any changes — it only restores context
- Compare shows information only, no modifications
- Keep session history bounded (last 20 sessions)

## Examples
```
/sessions                                  # List recent sessions
/sessions list                             # Same as above
/sessions resume 2025-01-15T10-30-00       # Resume specific session
/sessions compare session-1 session-2      # Compare two sessions
```

## Related

- **Skills**: [strategic-compact](../skills/strategic-compact/SKILL.md)
