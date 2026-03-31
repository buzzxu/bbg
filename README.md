# bbg (BadBoy Genesis)

AI Development Workflow Governance CLI -- scaffolds agent instructions, rules, hooks, commands, skills, and MCP configurations for every major AI coding tool.

## Features

- **Multi-tool support** -- Generates configurations for Claude Code, OpenCode, Cursor, Codex CLI, GitHub Copilot, and Kiro
- **Project analysis** -- Auto-detects stack, structure, dependencies, and testing setup
- **3-tier template system** -- Generic (verbatim copy), Handlebars (rendered), and Scaffold (AI-fill markers)
- **Health checks** -- `bbg doctor` audits governance config and auto-fixes issues
- **Template upgrades** -- Diff-based upgrades when templates evolve
- **Comprehensive governance scaffold** -- 25 agents, 60 skills, 35 rules, 32 commands, hooks, MCP configs

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Initialize governance for a project
npx bbg init

# Add a repository
npx bbg add-repo

# Run health checks
npx bbg doctor

# Sync templates
npx bbg sync

# Upgrade templates
npx bbg upgrade

# Create a release
npx bbg release
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize governance configuration for a project |
| `add-repo` | Register a repository under governance |
| `doctor` | Run health checks and auto-fix issues |
| `sync` | Synchronize templates to governed repositories |
| `upgrade` | Upgrade templates with diff-based merging |
| `release` | Create a governed release |

## Architecture

### Source Code

```
src/cli.ts              Entry point (Commander + Inquirer)
src/analyzers/          Project analyzers (stack, structure, deps, testing)
src/commands/           CLI commands (init, add-repo, doctor, sync, release, upgrade)
src/config/             Configuration management
src/doctor/             Health checks and auto-fix
src/templates/          Template rendering engine (Handlebars)
src/upgrade/            Template upgrade diffing
src/utils/              Shared utilities (fs, logger)
templates/              3-tier template system (generic, handlebars, scaffold)
tests/                  Unit + integration tests (vitest)
```

### Governance Scaffold

```
agents/                 25 agent definitions (core, language, build resolvers)
skills/                 60 skill directories with SKILL.md workflows
rules/                  35 rule files (common + 7 language-specific directories)
commands/               32 slash command definitions
hooks/                  Hook automation (hooks.json + 6 scripts)
mcp-configs/            12 MCP server configurations
contexts/               3 operational contexts (dev, review, research)
```

### Agents (25)

| Category | Count | Agents |
|----------|-------|--------|
| Core | 8 | planner, architect, tdd-guide, code-reviewer, security-reviewer, build-error-resolver, refactor-cleaner, e2e-runner |
| Support | 5 | doc-updater, loop-operator, harness-optimizer, database-reviewer, devops-reviewer |
| Language | 6 | typescript-reviewer, python-reviewer, go-reviewer, java-reviewer, rust-reviewer, kotlin-reviewer |
| Build Resolvers | 6 | typescript-build-resolver, python-build-resolver, go-build-resolver, java-build-resolver, rust-build-resolver, cpp-build-resolver |

### Skills (60)

| Category | Count | Examples |
|----------|-------|----------|
| Core | 20 | tdd-workflow, security-review, verification-loop, api-design, harness-engineering |
| Language | 24 | typescript-patterns, react-patterns, python-patterns, golang-patterns, rust-patterns |
| Operations | 16 | ci-cd-patterns, monitoring-patterns, incident-response, prompt-engineering |

### Rules (35)

| Directory | Count | Scope |
|-----------|-------|-------|
| common/ | 8 | coding-style, git-workflow, testing, security, performance, patterns, hooks, agents |
| typescript/ | 5 | coding-style, testing, react, node, security |
| python/ | 4 | coding-style, testing, django, security |
| golang/ | 4 | coding-style, testing, patterns, security |
| java/ | 4 | coding-style, testing, spring, security |
| rust/ | 3 | coding-style, testing, security |
| kotlin/ | 3 | coding-style, testing, security |
| php/ | 3 | coding-style, testing, security |

### Commands (32)

| Category | Count | Commands |
|----------|-------|----------|
| Core Workflow | 10 | plan, tdd, code-review, build-fix, security-scan, refactor-clean, e2e, test-coverage, update-docs, doctor |
| Learning & Session | 6 | learn, learn-eval, checkpoint, verify, sessions, eval |
| Language-Specific | 8 | ts-review, python-review, go-review, go-test, go-build, java-review, rust-review, kotlin-review |
| Orchestration | 8 | orchestrate, loop-start, loop-status, quality-gate, harness-audit, model-route, setup-pm, sync |

### Hooks

| Script | Purpose |
|--------|---------|
| session-start.js | Load session context on start |
| session-end.js | Save session state on stop |
| pre-edit-check.js | Block debug code and secrets before edits |
| post-edit-typecheck.js | Auto-typecheck TypeScript after edits |
| security-scan.js | Detect secrets, block destructive commands |
| suggest-compact.js | Track token usage and suggest compaction |

### MCP Servers (12)

github, filesystem, postgres, sqlite, brave-search, puppeteer, memory, fetch, sequential-thinking, context7, supabase, redis

See `mcp-configs/README.md` for setup instructions.

## AI Tool Configurations

| Tool | Config Location | Description |
|------|----------------|-------------|
| Claude Code | `CLAUDE.md`, `.claude/` | Settings + 5 slash commands |
| OpenCode | `.opencode/` | Config + instructions + 6 commands |
| Cursor | `.cursor/rules/` | 3 rule files (standards, security, testing) |
| Codex CLI | `.codex/` | Config + AGENTS.md |
| GitHub Copilot | `.github/copilot-instructions.md` | Full project instructions |
| Kiro | `.kiro/` | 6 agents + 5 steering files + 3 hooks |
| Cross-tool | `AGENTS.md`, `RULES.md` | Shared agent and rule instructions |

## Development

```bash
npm run dev            # Run in development mode (tsx)
npm run build          # Build with tsup
npm run test           # Run tests with vitest
npm run test:watch     # Watch mode
```

### Requirements

- Node.js >= 18
- TypeScript (strict mode, ESM-only)

### Coding Conventions

- File naming: lowercase with hyphens (`detect-stack.ts`)
- ESM imports with `.js` extensions
- Functions < 50 lines, focused and well-named
- Shared utilities in `src/utils/` (never duplicate)
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

## License

AGPL-3.0
