# BBG -- Agent Instructions

This file provides instructions for AI coding agents (Claude Code, Codex, OpenCode, Cursor, Kiro, GitHub Copilot) when working with this repository.

**Project:** bbg (BadBoy Genesis) -- AI Development Workflow Governance CLI  
**Version:** 0.1.0

## Core Principles

1. **Test-Driven** -- Write tests before implementation, run `npm test` to verify
2. **Security-First** -- Never hardcode secrets, validate all user inputs
3. **Immutability** -- Always create new objects, never mutate existing ones
4. **DRY** -- Extract shared logic into `src/utils/`, never duplicate functions
5. **Plan Before Execute** -- Understand the codebase before making changes
6. **Verify Continuously** -- Use `skills/verification-loop/SKILL.md` after every change

## Available Agents (25)

### Core Agents

| Agent | File | Purpose | When to Use |
|-------|------|---------|-------------|
| planner | `agents/planner.md` | Implementation planning | Complex features, refactoring |
| architect | `agents/architect.md` | System design decisions | New modules, architectural changes |
| tdd-guide | `agents/tdd-guide.md` | Test-driven development | New features, bug fixes |
| code-reviewer | `agents/code-reviewer.md` | Code quality review | After writing/modifying code |
| security-reviewer | `agents/security-reviewer.md` | Vulnerability detection | Before commits, sensitive code |
| build-error-resolver | `agents/build-error-resolver.md` | Fix build/type errors | When `npm run build` fails |
| refactor-cleaner | `agents/refactor-cleaner.md` | Dead code cleanup | Code maintenance, DRY violations |
| e2e-runner | `agents/e2e-runner.md` | End-to-end test execution | Integration testing |

### Support Agents

| Agent | File | Purpose | When to Use |
|-------|------|---------|-------------|
| doc-updater | `agents/doc-updater.md` | Documentation sync | After API/architecture changes |
| loop-operator | `agents/loop-operator.md` | Autonomous loop control | Multi-step automated tasks |
| harness-optimizer | `agents/harness-optimizer.md` | AI workflow optimization | Governance tuning |
| database-reviewer | `agents/database-reviewer.md` | Database design review | Schema changes, queries |
| devops-reviewer | `agents/devops-reviewer.md` | Infrastructure review | CI/CD, deployment changes |

### Language Reviewers

| Agent | File | Languages |
|-------|------|-----------|
| typescript-reviewer | `agents/typescript-reviewer.md` | TypeScript, JavaScript |
| python-reviewer | `agents/python-reviewer.md` | Python |
| go-reviewer | `agents/go-reviewer.md` | Go |
| java-reviewer | `agents/java-reviewer.md` | Java |
| rust-reviewer | `agents/rust-reviewer.md` | Rust |
| kotlin-reviewer | `agents/kotlin-reviewer.md` | Kotlin |

### Build Resolvers

| Agent | File | Stack |
|-------|------|-------|
| typescript-build-resolver | `agents/typescript-build-resolver.md` | TypeScript/Node.js |
| python-build-resolver | `agents/python-build-resolver.md` | Python |
| go-build-resolver | `agents/go-build-resolver.md` | Go |
| java-build-resolver | `agents/java-build-resolver.md` | Java/Maven/Gradle |
| rust-build-resolver | `agents/rust-build-resolver.md` | Rust/Cargo |
| cpp-build-resolver | `agents/cpp-build-resolver.md` | C++/CMake |

## Skills (60)

Skills are detailed workflow instructions in `skills/*/SKILL.md`. Key skills for this project:

| Skill | Path | Use Case |
|-------|------|----------|
| TDD Workflow | `skills/tdd-workflow/SKILL.md` | RED-GREEN-IMPROVE cycle |
| Verification Loop | `skills/verification-loop/SKILL.md` | Post-change verification |
| Security Review | `skills/security-review/SKILL.md` | Security audit workflow |
| Code Review Checklist | `skills/code-review-checklist/SKILL.md` | Structured code review |
| Coding Standards | `skills/coding-standards/SKILL.md` | Style enforcement |
| TypeScript Patterns | `skills/typescript-patterns/SKILL.md` | TS best practices |
| Continuous Learning | `skills/continuous-learning/SKILL.md` | Learning from mistakes |
| Search First | `skills/search-first/SKILL.md` | Read before writing |

See `skills/` directory for all 60 skill workflows covering core patterns (20), language-specific (24), and operations (16).

## Rules (35)

Rules are organized by language in `rules/`:

| Directory | Files | Scope |
|-----------|-------|-------|
| `rules/common/` | 8 | Cross-language: coding-style, git-workflow, testing, security, performance, patterns, hooks, agents |
| `rules/typescript/` | 5 | coding-style, testing, react, node, security |
| `rules/python/` | 4 | coding-style, testing, django, security |
| `rules/golang/` | 4 | coding-style, testing, patterns, security |
| `rules/java/` | 4 | coding-style, testing, spring, security |
| `rules/rust/` | 3 | coding-style, testing, security |
| `rules/kotlin/` | 3 | coding-style, testing, security |
| `rules/php/` | 3 | coding-style, testing, security |

See `rules/README.md` for installation and usage guide.

## Commands (32)

Slash commands are defined in `commands/*.md`:

| Category | Commands |
|----------|----------|
| Core Workflow | plan, tdd, code-review, build-fix, security-scan, refactor-clean, e2e, test-coverage, update-docs, doctor |
| Learning & Session | learn, learn-eval, checkpoint, verify, sessions, eval |
| Language-Specific | ts-review, python-review, go-review, go-test, go-build, java-review, rust-review, kotlin-review |
| Orchestration | orchestrate, loop-start, loop-status, quality-gate, harness-audit, model-route, setup-pm, sync |

## Hooks

Hook automation is configured in `hooks/hooks.json` with 6 scripts:

| Script | Trigger | Purpose |
|--------|---------|---------|
| `session-start.js` | SessionStart | Load session context |
| `session-end.js` | Stop | Save session state |
| `pre-edit-check.js` | PreToolUse (Edit) | Block debug code and secrets |
| `post-edit-typecheck.js` | PostToolUse (Edit) | Auto-typecheck .ts files |
| `security-scan.js` | PreToolUse (Bash) | Block destructive commands |
| `suggest-compact.js` | PostToolUse | Track token usage |

## MCP Servers

12 MCP server configurations in `mcp-configs/mcp-servers.json`:
github, filesystem, postgres, sqlite, brave-search, puppeteer, memory, fetch, sequential-thinking, context7, supabase, redis.

## Contexts

Operational contexts in `contexts/`:
- `dev.md` -- Development mode (focus on implementation)
- `review.md` -- Code review mode (focus on quality)
- `research.md` -- Research mode (focus on exploration)

## Project Architecture

```
src/cli.ts                   -> CLI entry point (Commander + Inquirer)
src/analyzers/               -> 4 project analyzers (stack, structure, deps, testing)
src/commands/                -> 6 CLI commands (init, add-repo, doctor, sync, release, upgrade)
  init.ts                    -> Init orchestrator (~170 lines)
  init-manifest.ts           -> Template registries + plan building
  init-prompts.ts            -> Interactive wizard + config collection
  init-gitignore.ts          -> Gitignore managed block logic
src/config/                  -> Configuration management
src/doctor/                  -> Health checks and auto-fix
  shared.ts                  -> Shared doctor utilities (expectedRepoIgnoreEntries)
src/templates/               -> Template rendering engine (Handlebars)
src/upgrade/                 -> Template upgrade diffing
src/utils/                   -> Shared utilities
  fs.ts                      -> File operations (exists, readIfExists, readTextFile, writeTextFile)
  git.ts                     -> Git operations (clone, branches, credentials)
  git-url.ts                 -> Git URL validation + repo name inference
  paths.ts                   -> Template root / package root resolution
  platform.ts                -> Platform detection
  prompts.ts                 -> CLI prompts + sanitization + collectStackInfo
  errors.ts                  -> Custom error classes (BbgError, BbgConfigError, etc.)
templates/                   -> 3-tier template system (generic, handlebars, scaffold)
tests/                       -> Unit + integration tests (vitest)
```

## Build & Test

```bash
npm run build          # Build with tsup
npm run test           # Run all tests with vitest
npm run dev            # Development mode with tsx
npm run typecheck      # TypeScript type checking
npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run coverage       # Test coverage report
```

## Coding Style

- **TypeScript strict mode** with ESM-only modules
- **File naming**: lowercase with hyphens (`detect-stack.ts`)
- **Imports**: Use `.js` extensions for ESM compatibility
- **Functions**: Small (<50 lines), focused, well-named
- **Error handling**: Always handle errors explicitly with try/catch
- **Constants**: Centralized in `src/constants.ts`
- **Shared utilities**: Centralized in `src/utils/`

## Must Always

- Run `npm test` before committing
- Run `npm run build` to verify compilation
- Use shared `exists()` from `src/utils/fs.ts` (never re-implement)
- Follow conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Write tests for new functionality
- Keep templates in sync with manifest in `src/constants.ts`

## Must Never

- Hardcode secrets, API keys, tokens, or absolute paths
- Submit untested changes
- Duplicate utility functions (use `src/utils/`)
- Mutate function arguments or shared state
- Silently swallow errors
- Skip TypeScript type checking
- Add dependencies without justification

## Testing Requirements

- **Framework**: vitest
- **Test location**: `tests/unit/` and `tests/integration/`
- **Coverage target**: 80%+
- **TDD workflow**: Write test (RED) -> Implement (GREEN) -> Refactor (IMPROVE)

## Git Workflow

- **Commit format**: `<type>: <description>`
- **Types**: feat, fix, refactor, docs, test, chore, perf, ci
- **Branch naming**: `feature/`, `fix/`, `refactor/`, `docs/`
- **PR workflow**: Analyze changes -> Draft summary -> Include test plan

## Security Guidelines

- No hardcoded secrets (API keys, passwords, tokens)
- Validate all user inputs at system boundaries
- Sanitize file paths (prevent path traversal)
- Use parameterized queries if adding database support
- Error messages must not leak sensitive data
- Review all template outputs for injection risks

## Performance Guidelines

- Lazy-load heavy dependencies
- Use async/await for I/O operations
- Avoid blocking the event loop
- Keep template rendering efficient for large projects
