# Rules

Comprehensive rules are organized in the `rules/` directory by language and domain. This file provides a summary.

## Rule Directory Structure

```
rules/
├── README.md              # Installation and usage guide
├── common/                # Cross-language rules (8 files)
│   ├── coding-style.md    # Universal style guidelines
│   ├── git-workflow.md    # Branching, commits, PRs
│   ├── testing.md         # Testing standards
│   ├── security.md        # Security requirements
│   ├── performance.md     # Performance guidelines
│   ├── patterns.md        # Design patterns
│   ├── hooks.md           # Hook usage rules
│   └── agents.md          # Agent interaction rules
├── typescript/ (5)        # coding-style, testing, react, node, security
├── python/ (4)            # coding-style, testing, django, security
├── golang/ (4)            # coding-style, testing, patterns, security
├── java/ (4)              # coding-style, testing, spring, security
├── rust/ (3)              # coding-style, testing, security
├── kotlin/ (3)            # coding-style, testing, security
└── php/ (3)               # coding-style, testing, security
```

See `rules/README.md` for the full guide on how rules are loaded by each AI tool.

## Must Always

- Run `npm test` and `npm run build` before submitting changes
- Use shared utilities from `src/utils/` instead of reimplementing
- Write tests before implementation (TDD workflow -- see `skills/tdd-workflow/SKILL.md`)
- Validate inputs and keep security checks intact (see `rules/common/security.md`)
- Prefer immutable updates over mutating shared state
- Follow established repository patterns before inventing new ones (see `rules/common/patterns.md`)
- Keep contributions focused, reviewable, and well-described
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

## Must Never

- Include sensitive data such as API keys, tokens, secrets, or absolute/system file paths in output
- Submit untested changes
- Bypass security checks or validation hooks
- Duplicate existing functionality without a clear reason
- Ship code without checking the relevant test suite
- Mutate function arguments or shared state
- Add dependencies without clear justification

## Code Style

- TypeScript strict mode, ESM-only with `.js` import extensions
- File naming: lowercase with hyphens (`detect-stack.ts`, `add-repo.ts`)
- Functions should be small (<50 lines), focused, and well-named
- Use `const` over `let`, never use `var`
- Handle all errors explicitly with try/catch; never silently swallow
- Use early returns to reduce nesting depth
- See `rules/common/coding-style.md` and `rules/typescript/coding-style.md` for full details

## Template System

- Templates live in `templates/` with two tiers: generic (verbatim copy) and handlebars (rendered)
- Handlebars templates use `{{variable}}` syntax with `.hbs` extension
- All template paths must be registered in `src/constants.ts` manifest

## Commit Style

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Keep changes modular and explain user-facing impact in the PR summary
- One logical change per commit
- See `rules/common/git-workflow.md` for branching and PR guidelines

## Security

- No hardcoded secrets (API keys, passwords, tokens)
- Validate all user inputs at system boundaries
- Sanitize file paths (prevent path traversal)
- Error messages must not leak sensitive data
- Review all template outputs for injection risks
- See `rules/common/security.md` for full security checklist
- See `skills/security-review/SKILL.md` for security review workflow
- See `skills/secrets-management/SKILL.md` for secrets handling

## Testing

- Framework: vitest
- Tests in `tests/unit/` and `tests/integration/`
- Coverage target: 80%+
- TDD: RED (failing test) -> GREEN (minimal implementation) -> IMPROVE (refactor)
- See `rules/common/testing.md` for testing standards
- See `skills/tdd-workflow/SKILL.md` for the full TDD workflow

## Performance

- Lazy-load heavy dependencies
- Use async/await for I/O operations
- Avoid blocking the event loop
- Keep template rendering efficient for large projects
- See `rules/common/performance.md` for full performance guidelines
