# /sync

## Description
Synchronize governance templates (AGENTS.md, hooks, rules, workflows) to all managed repositories. Detects drift and applies updates while preserving local customizations.

## Usage
```
/sync
/sync --dry-run
/sync --repo <repo-path>
/sync --force
```

## Process
1. **Load configuration** — Read `.bbg/config.json` for managed repositories list
2. **Generate templates** — Render current templates with each repo's project context
3. **Detect drift** — Compare rendered templates against what's deployed in each repo:
   - ADDED: Template exists in source but not in repo
   - MODIFIED: Template differs from deployed version
   - DELETED: Template exists in repo but not in source
   - CUSTOM: Repo has local modifications (preserve these)
4. **Plan updates** — For each repo, list changes to apply
5. **Apply updates** — Copy/render templates to each repo:
   - Merge local customizations where possible
   - Overwrite only bbg-managed sections
   - Preserve user-added content
6. **Verify** — Run doctor checks on each synced repo
7. **Report** — Summary of changes per repo

## Output
```
Sync Results:
  repo-1/ (3 changes)
    [UPDATE] AGENTS.md — added new build commands section
    [ADD]    hooks/security-scan.js — new security hook
    [SKIP]   .github/workflows/ci.yml — local customization preserved

  repo-2/ (1 change)
    [UPDATE] AGENTS.md — version bump

Summary: 4 changes across 2 repos (3 applied, 1 skipped)
```

## Rules
- NEVER overwrite local customizations without --force flag
- Always show a dry-run preview before applying changes
- Preserve content between `<!-- bbg:custom -->` markers
- Track which sections are bbg-managed vs user-customized
- Run governance doctor after sync to verify consistency
- Log all sync operations for audit trail

## Examples
```
/sync                          # Sync all repos (interactive)
/sync --dry-run                # Preview changes without applying
/sync --repo ./services/api    # Sync single repo
/sync --force                  # Overwrite all, including customizations
```
