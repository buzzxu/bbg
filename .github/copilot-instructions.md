# GitHub Copilot Instructions for bbg

## Project Context
bbg (BadBoy Genesis) is an AI Development Workflow Governance CLI (TypeScript, ESM-only, Node.js >= 18). It generates and maintains comprehensive AI agent configurations — agents, skills, rules, hooks, commands, and MCP configs — for projects using Claude Code, OpenCode, Cursor, Codex, GitHub Copilot, and Kiro.

## Architecture
```
src/cli.ts              CLI entry (Commander + Inquirer)
src/analyzers/          4 project analyzers (stack, structure, deps, testing)
src/commands/           6 CLI commands (init, add-repo, doctor, sync, release, upgrade)
src/config/             Configuration management
src/doctor/             Health checks and auto-fix
src/templates/          Template rendering engine (Handlebars)
src/upgrade/            Template upgrade diffing
src/utils/              Shared utilities (always use these, never duplicate)
templates/              3-tier system: generic (verbatim), handlebars (rendered), scaffold (AI-fill)
agents/                 25 specialized AI agents (core, language reviewers, build resolvers)
skills/                 60 workflow skills (coding, testing, security, framework patterns)
rules/                  35 rule files organized by language (common + 7 languages)
commands/               32 slash commands (workflow, learning, language, orchestration)
hooks/                  Hook system with hooks.json + Node.js scripts
mcp-configs/            MCP server configurations
contexts/               Dynamic system prompt contexts (dev, review, research)
```

## Code Style
- TypeScript strict mode, ESM-only with `.js` import extensions
- File naming: lowercase with hyphens (`detect-stack.ts`)
- Functions: <50 lines, focused, well-named
- Use `const` over `let`, never `var`
- Immutable data: create new objects, never mutate
- Handle errors explicitly with try/catch
- Use early returns to reduce nesting

## Key Rules
- Use `exists()` from `src/utils/fs.ts` (never re-implement)
- Constants centralized in `src/constants.ts`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- TDD: write tests first, 80%+ coverage target
- No hardcoded secrets, API keys, or absolute paths
- No `any` types, no `@ts-ignore`
- No duplicating utility functions
- Refer to `rules/common/` for language-agnostic guidelines
- Refer to `rules/typescript/` for TypeScript-specific patterns

## Available Resources
- **25 agents** in `agents/` — delegate complex tasks to specialized agents
- **60 skills** in `skills/` — workflow definitions and domain knowledge
- **32 commands** in `commands/` — slash commands for quick execution
- **35 rules** in `rules/` — organized by language (common + ts + py + go + java + rust + kotlin + php)
- **hooks** in `hooks/` — automated checks on session start/end, edit, security

## Build & Test
```bash
npm run build    # tsup → dist/cli.js
npm test         # vitest run
npm run dev      # tsx src/cli.ts
```
