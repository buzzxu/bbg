# /doctor

## Description
Run governance health checks to verify the project meets all bbg governance requirements. Detects missing files, misconfigurations, and drift, then offers auto-fix.

## Usage
```
/doctor
/doctor --fix
/doctor --verbose
```

## Process
1. **Check required files** — Verify AGENTS.md, CLAUDE.md, .gitignore, templates exist
2. **Check configuration** — Validate bbg config, template manifest, package.json alignment
3. **Check templates** — Ensure all templates compile and render without errors
4. **Check analyzers** — Verify analyzers produce valid output for the current project
5. **Check dependencies** — Validate no unused or missing dependencies
6. **Check test health** — Verify tests exist and pass
7. **Check security** — Run quick secret scan and dependency audit
8. **Report** — Display findings with pass/warn/fail status for each check
9. **Auto-fix** — If `--fix` is passed, attempt to resolve fixable issues

## Output
Health check report:
- [PASS] checks that are healthy
- [WARN] checks with non-critical issues
- [FAIL] checks with critical issues
- Auto-fix results (if --fix was used)
- Manual remediation steps for unfixable issues

## Rules
- Run all checks even if early ones fail
- Auto-fix must be safe — never delete or overwrite user content
- Clearly distinguish between auto-fixable and manual issues
- Reference specific file paths in all findings
- Compare current state against governance requirements in AGENTS.md

## Examples
```
/doctor                # Run all checks, report only
/doctor --fix          # Run checks and auto-fix what's possible
/doctor --verbose      # Show detailed check output
```
