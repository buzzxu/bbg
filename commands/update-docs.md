# /update-docs

## Description
Update documentation to accurately reflect current code changes. Ensures README, AGENTS.md, CLAUDE.md, and inline docs stay in sync with the implementation.

## Usage
```
/update-docs
/update-docs --scope readme
/update-docs --after "feature implementation"
```

## Process
1. **Detect changes** — Use git diff to find recently modified files
2. **Identify doc impact** — Determine which documentation is affected:
   - API changes → README, function docs
   - New commands → CLAUDE.md command list
   - Architecture changes → AGENTS.md, architecture docs
   - New dependencies → README installation section
3. **Review current docs** — Read existing documentation for accuracy
4. **Update docs** — Make precise updates to match implementation
5. **Verify consistency** — Cross-reference docs with actual code behavior
6. **Check examples** — Ensure code examples and CLI usage are accurate

## Output
- List of documentation files updated
- Summary of changes per file
- Any documentation gaps that need manual attention
- Verification that code examples compile/run

## Rules
- Only update docs that are affected by code changes
- Keep the same tone and formatting as existing documentation
- Update command help text in source code too, not just markdown
- Verify CLI usage examples actually work
- Never remove documentation without understanding why it exists
- Flag outdated screenshots or diagrams

## Examples
```
/update-docs                          # Update all affected docs
/update-docs --scope readme           # Only update README
/update-docs --after "added sync command"
```
