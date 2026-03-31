# BBG — Codex Agent Instructions

**Project:** bbg (BadBoy Genesis) — AI Development Workflow Governance CLI  
**Version:** 0.1.0

## Overview

bbg is a TypeScript CLI tool (ESM-only, Node.js >= 18) that generates and maintains AI development workflow governance scaffolding for projects. It produces AGENTS.md files, workflow documentation, review policies, doctor scripts, git hooks, and task templates for 6 AI coding tools.

## Source Architecture

```
src/cli.ts              → CLI entry point (Commander + Inquirer)
src/analyzers/          → 4 project analyzers (stack, structure, deps, testing)
src/commands/           → 6 CLI commands (init, add-repo, doctor, sync, release, upgrade)
src/config/             → Configuration management
src/doctor/             → Health checks and auto-fix
src/templates/          → Handlebars rendering engine
src/upgrade/            → Template upgrade diffing
src/utils/              → Shared utilities (fs.ts, logger.ts)
templates/              → 2-tier template system (generic, handlebars)
tests/                  → vitest unit + integration tests
```

## Governance Architecture

This project contains comprehensive AI governance content:

```
agents/                 → 25 agent definitions (core, language, build resolvers)
skills/                 → 60 skill directories with SKILL.md files
rules/                  → 35 rule files (common + 7 language-specific directories)
commands/               → 32 slash command definitions
hooks/                  → Hook configs + 6 automation scripts
mcp-configs/            → 12 MCP server configurations
contexts/               → 3 operational contexts (dev, review, research)
```

### Agents (25)

| Category | Agents |
|----------|--------|
| Core | planner, architect, tdd-guide, code-reviewer, security-reviewer, build-error-resolver, refactor-cleaner, e2e-runner |
| Support | doc-updater, loop-operator, harness-optimizer, database-reviewer, devops-reviewer |
| Language | typescript-reviewer, python-reviewer, go-reviewer, java-reviewer, rust-reviewer, kotlin-reviewer |
| Build | typescript-build-resolver, python-build-resolver, go-build-resolver, java-build-resolver, rust-build-resolver, cpp-build-resolver |

### Skills (60)

Organized across: core patterns (20), language-specific (24), and operations (16). Each skill is a directory under `skills/` with a `SKILL.md` file containing workflow instructions, checklists, and best practices.

### Rules (35)

Located in `rules/` directory with `common/` (8 files) and language-specific subdirectories: `typescript/` (5), `python/` (4), `golang/` (4), `java/` (4), `rust/` (3), `kotlin/` (3), `php/` (3).

### Commands (32)

Located in `commands/` directory covering: core workflow (10), learning & session (6), language-specific (8), and orchestration (8).

## Build & Test

```bash
npm run build    # tsup → dist/cli.js
npm test         # vitest run
npm run dev      # tsx src/cli.ts
```

## Rules

### Must Always
- Run `npm test` and `npm run build` before submitting changes
- Use `exists()` from `src/utils/fs.ts` (never re-implement)
- Write tests for new functionality (vitest, 80%+ coverage)
- Follow conventional commits: feat:, fix:, refactor:, docs:, test:, chore:
- Use `.js` import extensions for ESM
- Reference shared agents from `agents/` and rules from `rules/`

### Must Never
- Hardcode secrets, API keys, tokens, or absolute paths
- Submit untested changes
- Duplicate utility functions (use src/utils/)
- Mutate function arguments or shared state
- Silently swallow errors
- Use `@ts-ignore` or `as any`

## Coding Style
- TypeScript strict mode, ESM-only
- File naming: lowercase with hyphens
- Functions: <50 lines, focused, well-named
- Use `const` over `let`, never `var`
- Handle errors explicitly, never silently
- Immutable data: new objects, not mutations

## Reference

- Full agent definitions: `agents/*.md`
- Skill workflows: `skills/*/SKILL.md`
- Language rules: `rules/<language>/*.md`
- Slash commands: `commands/*.md`
- Hook scripts: `hooks/scripts/*.js`
- MCP server configs: `mcp-configs/mcp-servers.json`
