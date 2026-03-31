# Git Workflow: Common

Rules for version control, commits, branching, and pull requests.

## Mandatory

- Use conventional commit format: `<type>: <description>`
- Allowed types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`
- Write commit messages in imperative mood: "add feature" not "added feature"
- Keep commits atomic — one logical change per commit
- Never commit secrets, API keys, tokens, or credentials
- Never force-push to `main` or `master` branches
- All changes to `main` must go through a pull request
- Branch names follow: `feature/`, `fix/`, `refactor/`, `docs/` prefixes
- Run tests before every commit — never commit broken code

## Recommended

- Keep PRs under 400 lines of diff when possible — split large changes
- Write PR descriptions that explain "why" not just "what"
- Include a test plan in every PR that changes behavior
- Rebase feature branches on main before merging to keep history clean
- Use `fixup` commits during review, squash before merge
- Reference issue numbers in commit messages: `feat: add caching (#42)`
- Draft PRs early for complex features to get early feedback

## Forbidden

- `git push --force` to shared branches without team agreement
- Commits with messages like "fix", "wip", "asdf", "temp"
- Mixing formatting changes with logic changes in the same commit
- Committing generated files (build output, lockfiles from other package managers)
- Committing `.env` files or any file containing secrets

## Examples

```
Good: feat: add retry logic to HTTP client
Bad:  updated stuff

Good: fix: prevent null pointer in user lookup (#123)
Bad:  fix bug

Good: Branch: feature/user-auth-flow
Bad:  Branch: john/stuff

Good: refactor: extract validation into shared utility
Bad:  refactor (no description)
```
