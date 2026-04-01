# BBG Coding Standards

## Project
bbg is a TypeScript CLI tool (ESM-only, Node.js >= 18) that generates AI development workflow governance scaffolding for 6 AI coding tools. Built with Commander + Inquirer, uses Handlebars for template rendering, tested with vitest.

## Source Architecture
- `src/cli.ts` — Entry point
- `src/analyzers/` — 4 project analyzers (stack, structure, deps, testing)
- `src/commands/` — 6 CLI commands (init, add-repo, doctor, sync, release, upgrade)
- `src/config/` — Configuration management
- `src/doctor/` — Health checks and auto-fix
- `src/templates/` — Template rendering engine
- `src/upgrade/` — Template upgrade diffing
- `src/utils/` — Shared utilities (always use these, never duplicate)
- `templates/` — 2-tier system (generic, handlebars)
- `tests/` — vitest unit + integration tests

## Governance Architecture
- `agents/` — 25 agent definitions organized by category
- `skills/` — 63 skill workflows with SKILL.md files
- `rules/` — 34 rule files (common/ + 7 language directories)
- `commands/` — 40 slash command definitions
- `hooks/` — Hook automation with 6 scripts
- `mcp-configs/` — 14 MCP server configurations
- `contexts/` — 3 operational contexts (dev, review, research)

## Rules
- TypeScript strict mode, ESM-only, `.js` import extensions
- Functions <50 lines, immutable data, explicit error handling
- Use `exists()` from `src/utils/fs.ts` (never re-implement)
- Constants centralized in `src/constants.ts`
- TDD: write test first, then implement, then refactor
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Coverage target: 80%+

## Commands
```bash
npm run build    # tsup
npm test         # vitest run
npm run dev      # tsx src/cli.ts
```

## Reference
- Agent definitions: `agents/*.md`
- Skill workflows: `skills/*/SKILL.md`
- Language rules: `rules/<language>/*.md`
- Common rules: `rules/common/*.md`
- Slash commands: `commands/*.md`
- Hook config: `hooks/hooks.json`
