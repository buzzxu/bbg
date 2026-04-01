---
name: git-workflow
category: operations
description: Git best practices covering branching strategies, merge vs rebase, squash commits, cherry-pick, and worktrees for parallel work
---

# Git Workflow

## Overview
Load this skill when establishing team Git conventions, resolving merge conflicts, cleaning up commit history, or managing parallel work across branches. Good Git hygiene reduces integration pain and preserves a useful project history.

## Key Patterns

### Branching Strategies
1. **Trunk-based development** — Short-lived feature branches (<1 day), merge to main frequently. Best for: CI/CD-mature teams with feature flags
2. **GitHub Flow** — Feature branches off main, PR review, merge to main, deploy. Best for: SaaS products with continuous deployment
3. **GitFlow** — develop, feature, release, hotfix branches. Best for: packaged software with versioned releases
4. **Release branches** — Cut a branch at freeze, fix forward on main, cherry-pick critical fixes to release. Best for: mobile apps and scheduled releases

### Merge vs Rebase
- **Merge commits** — Preserve full branch history; use for long-lived branches and release merges
- **Rebase** — Linearize history onto target; use for updating feature branches before merge
- **Squash merge** — Collapse all branch commits into one on main; use when individual commits are noisy
- **Rule of thumb** — Rebase local unpushed work freely; never rebase shared/pushed branches

### Commit Discipline
- Each commit is one logical change — compiles, passes tests, and has a clear message
- Conventional commit format: `type(scope): description` — `feat(auth): add OAuth2 PKCE flow`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`
- Write the "why" in the commit body; the "what" is in the diff
- Use `git add -p` to stage partial files for focused commits

### Cherry-pick and Backport
- Cherry-pick individual fixes to release branches: `git cherry-pick <sha>`
- Always reference the original commit and issue in the cherry-pick message
- Test cherry-picked commits independently — context may differ on the target branch
- Prefer cherry-pick over branch merge for isolated hotfixes

### Worktrees for Parallel Work
- `git worktree add ../project-hotfix hotfix/critical-bug` — work on hotfix without stashing
- Each worktree is an independent working directory sharing the same repository
- Use for: reviewing PRs while coding, hotfixes during feature work, parallel test runs
- Clean up with `git worktree remove` when done

## Best Practices
- Pull with rebase by default: `git config pull.rebase true`
- Protect main branch — require PR reviews, status checks, and linear history
- Delete merged branches promptly — both local and remote
- Use `.gitignore` templates from gitignore.io for your stack
- Sign commits with GPG or SSH keys for authorship verification
- Write meaningful PR descriptions linking to issues and explaining trade-offs

## Anti-patterns
- Committing directly to main without review
- Giant commits with unrelated changes — impossible to review, revert, or bisect
- Merge commits from pulling without rebase — creates noisy spaghetti history
- Long-lived feature branches (>1 week) — diverge from main and cause painful merges
- Force-pushing to shared branches — rewrites history others depend on
- Using `git add .` without reviewing what is staged

## Checklist
- [ ] Branching strategy documented and agreed upon by team
- [ ] Main branch protected with required reviews and CI checks
- [ ] Commits follow conventional commit format
- [ ] Each commit is one logical change that passes CI
- [ ] Feature branches are short-lived and rebased before merge
- [ ] Merged branches are deleted after merge
- [ ] Pull configured to rebase by default
- [ ] `.gitignore` covers all generated files and IDE artifacts
- [ ] Sensitive files excluded — no secrets in commit history
- [ ] Team trained on interactive rebase, cherry-pick, and worktrees


## Related

- **Rules**: [git-workflow](../../rules/common/git-workflow.md)
- **Commands**: [/checkpoint](../../commands/checkpoint.md)
