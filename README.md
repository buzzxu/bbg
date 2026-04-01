# @buzzxu/bbg-cli

[![npm version](https://img.shields.io/npm/v/@buzzxu/bbg-cli)](https://www.npmjs.com/package/@buzzxu/bbg-cli)
[![license](https://img.shields.io/npm/l/@buzzxu/bbg-cli)](./LICENSE)
[![CI](https://github.com/buzzxu/bbg/actions/workflows/ci.yml/badge.svg)](https://github.com/buzzxu/bbg/actions)

**AI Development Workflow Governance CLI** — generates and maintains agents, skills, rules, commands, hooks, and MCP server configurations for 6 major AI coding tools.

## What is BBG?

BBG (BadBoy Genesis) is a CLI tool that scaffolds structured AI development workflows for your projects. Instead of manually configuring each AI coding assistant, BBG analyzes your project and generates a complete governance setup — agent definitions, skill workflows, coding rules, slash commands, hook automation, and MCP server configs — tailored to your tech stack.

BBG solves the problem of **inconsistent AI-assisted development**. When multiple developers use different AI tools (Claude Code, Cursor, Copilot, etc.) on the same project, their AI assistants behave differently unless given the same rules. BBG generates tool-specific configurations from a single source of truth, ensuring every AI assistant follows the same standards.

### Key Benefits

- **One command, full setup** — `bbg init` analyzes your project and generates everything
- **Multi-tool consistency** — Same governance rules across 6 AI coding tools
- **Safe upgrades** — `bbg upgrade` uses three-way merge to preserve your customizations
- **Health monitoring** — `bbg doctor` validates your governance setup and auto-fixes issues
- **Extensible** — Plugin system lets you add custom agents, skills, and rules

## Quick Start

```bash
# Install globally
npm install -g @buzzxu/bbg-cli

# Initialize governance in your project
cd your-project
bbg init
```

Or use npx without installing:

```bash
npx @buzzxu/bbg-cli init
```

### What Gets Generated

After running `bbg init`, your project will have:

```
your-project/
├── AGENTS.md                          # Shared agent instructions
├── RULES.md                           # Shared coding rules
├── .claude/                           # Claude Code configuration
├── .opencode/                         # OpenCode configuration
├── .cursor/rules/                     # Cursor rule files
├── .codex/                            # Codex CLI configuration
├── .github/copilot-instructions.md    # GitHub Copilot instructions
├── .kiro/                             # Kiro agents + steering
├── agents/                            # 25 agent definitions
├── skills/                            # 63 skill workflows
├── rules/                             # 34 rule files (8 languages)
├── commands/                          # 40 slash commands
├── hooks/                             # Hook automation
├── mcp-configs/                       # 14 MCP server configs
├── contexts/                          # Operational contexts
└── .bbg.json                          # BBG configuration
```

## Features

- **Multi-tool support** — Generates configurations for Claude Code, OpenCode, Cursor, Codex CLI, GitHub Copilot, and Kiro
- **Project analysis** — Auto-detects language, framework, build tool, test framework, and package manager
- **Two-tier templates** — Generic files (verbatim copy) and Handlebars templates (rendered with project variables)
- **Three-way merge upgrades** — `bbg upgrade` preserves user customizations via intelligent three-way merge
- **Auto-changelog** — `bbg release` generates conventional-commit-based changelogs
- **Self-checks** — `bbg doctor --self` validates governance content integrity (7 checks)
- **Plugin architecture** _(experimental)_ — Extend with custom agents, skills, rules, and commands
- **Comprehensive scaffold** — 25 agents, 63 skills, 34 rules, 40 commands

## Supported AI Tools

| Tool           | Config Location                   | What's Generated                          |
| -------------- | --------------------------------- | ----------------------------------------- |
| Claude Code    | `CLAUDE.md`, `.claude/`           | Settings, slash commands, MCP configs     |
| OpenCode       | `.opencode/`                      | Config, instructions, commands            |
| Cursor         | `.cursor/rules/`                  | Rule files (standards, security, testing) |
| Codex CLI      | `.codex/`                         | Config, AGENTS.md reference               |
| GitHub Copilot | `.github/copilot-instructions.md` | Full project instructions                 |
| Kiro           | `.kiro/`                          | Agents, steering files, hooks             |

All tools also share `AGENTS.md` and `RULES.md` at the project root.

## Language Support

| Language   | Reviewer | Build Resolver | Commands | Skills | Rules | Status  |
| ---------- | :------: | :------------: | :------: | :----: | :---: | ------- |
| TypeScript |    ✓     |       ✓        |    3     |   4    |   5   | Full    |
| Python     |    ✓     |       ✓        |    3     |   4    |   4   | Full    |
| Go         |    ✓     |       ✓        |    3     |   3    |   4   | Full    |
| Java       |    ✓     |       ✓        |    3     |   4    |   4   | Full    |
| Rust       |    ✓     |       ✓        |    3     |   3    |   3   | Full    |
| Kotlin     |    ✓     |       —        |    1     |   3    |   3   | Partial |
| PHP        |    —     |       —        |    —     |   2    |   3   | Partial |
| C++        |    —     |       ✓        |    —     |   1    |   —   | Partial |

BBG auto-detects your project's language and generates language-appropriate rules, reviewers, and build resolvers.

## Commands

### `bbg init`

Initialize governance configuration for a project. Runs interactive prompts to collect project info, analyzes repository structure, and generates all governance files.

```bash
bbg init              # Interactive mode
bbg init --yes        # Accept defaults, skip prompts
bbg init --dry-run    # Show what would be created
```

### `bbg add-repo`

Add a repository to the current workspace configuration.

```bash
bbg add-repo                        # Interactive
bbg add-repo --url <git-url>        # Specify URL
bbg add-repo --url <url> --branch main
```

### `bbg doctor`

Validate governance configuration and workspace health.

```bash
bbg doctor                    # Standard health check
bbg doctor --fix              # Auto-fix safe issues
bbg doctor --json             # JSON output
bbg doctor --governance-only  # Skip repo directory checks
bbg doctor --workspace        # Include workspace checks
bbg doctor --self             # Validate bbg's own governance integrity
```

### `bbg sync`

Synchronize configured repositories and detect stack drift.

```bash
bbg sync              # Check for drift
bbg sync --update     # Update config with detected changes
bbg sync --json       # JSON output
```

### `bbg upgrade`

Upgrade generated governance files when templates evolve. Uses three-way merge to preserve user customizations.

```bash
bbg upgrade                # Standard upgrade
bbg upgrade --dry-run      # Preview changes
bbg upgrade --force        # Overwrite without merging
bbg upgrade --interactive  # Step through conflicts
```

### `bbg release`

Run governed release checklist and record release metadata.

```bash
bbg release                    # Full release flow
bbg release --skip-doctor      # Skip doctor check
bbg release --skip-sync        # Skip sync check
bbg release --skip-changelog   # Skip changelog generation
```

## Configuration

BBG stores its configuration in `.bbg.json` at the project root.

### Schema

```json
{
  "version": "1.0.0",
  "projectName": "my-project",
  "projectDescription": "Project description",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "repos": [
    {
      "name": "api-service",
      "gitUrl": "https://github.com/org/api-service.git",
      "branch": "main",
      "type": "backend",
      "stack": {
        "language": "typescript",
        "framework": "express",
        "buildTool": "npm",
        "testFramework": "vitest",
        "packageManager": "npm"
      },
      "description": "API service"
    }
  ],
  "governance": {
    "riskThresholds": {
      "high": { "grade": "A", "minScore": 90 },
      "medium": { "grade": "B", "minScore": 70 },
      "low": { "grade": "C", "minScore": 50 }
    },
    "enableRedTeam": false,
    "enableCrossAudit": false
  },
  "context": {},
  "plugins": {
    "enabled": false,
    "directories": []
  }
}
```

**Repository types:** `backend`, `frontend-pc`, `frontend-h5`, `frontend-web`, `other`

## Plugin System (Experimental)

BBG supports plugins for extending governance content with custom agents, skills, rules, and commands.

### Plugin Structure

```
my-plugins/
├── plugin.json        # Plugin manifest
├── agents/            # Custom agent definitions
├── skills/            # Custom skill workflows
├── rules/             # Custom rule files
└── commands/          # Custom slash commands
```

### Enabling Plugins

In `.bbg.json`:

```json
{
  "plugins": {
    "enabled": true,
    "directories": ["./my-plugins"]
  }
}
```

Plugin content merges with built-in governance content during generation. Plugin items with the same name as built-in items override them.

> **Note:** The plugin system is experimental and may change in future versions.

## Governance Content

### Agents (25)

| Category        | Count | Examples                                                        |
| --------------- | ----- | --------------------------------------------------------------- |
| Core            | 8     | planner, architect, tdd-guide, code-reviewer, security-reviewer |
| Support         | 5     | doc-updater, loop-operator, harness-optimizer                   |
| Language        | 6     | typescript-reviewer, python-reviewer, go-reviewer               |
| Build Resolvers | 6     | typescript-build-resolver, go-build-resolver                    |

### Skills (63)

| Category   | Count | Examples                                                     |
| ---------- | ----- | ------------------------------------------------------------ |
| Core       | 21    | tdd-workflow, security-review, verification-loop, api-design |
| Language   | 24    | typescript-patterns, react-patterns, python-patterns         |
| Operations | 18    | ci-cd-patterns, monitoring-patterns, agent-handoff           |

### Rules (34)

| Directory   | Count | Scope                                                      |
| ----------- | ----- | ---------------------------------------------------------- |
| common/     | 8     | coding-style, git-workflow, testing, security, performance |
| typescript/ | 5     | coding-style, testing, react, node, security               |
| python/     | 4     | coding-style, testing, django, security                    |
| golang/     | 4     | coding-style, testing, patterns, security                  |
| java/       | 4     | coding-style, testing, spring, security                    |
| rust/       | 3     | coding-style, testing, security                            |
| kotlin/     | 3     | coding-style, testing, security                            |
| php/        | 3     | coding-style, testing, security                            |

### Commands (40)

| Category           | Count | Examples                                         |
| ------------------ | ----- | ------------------------------------------------ |
| Core Workflow      | 10    | plan, tdd, code-review, build-fix, security-scan |
| Learning & Session | 6     | learn, checkpoint, verify, sessions              |
| Language-Specific  | 16    | ts-review, python-test, go-build, java-review    |
| Orchestration      | 8     | orchestrate, loop-start, quality-gate            |

### Hooks (6 scripts)

| Script                 | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| session-start.js       | Load session context                       |
| session-end.js         | Save session state                         |
| pre-edit-check.js      | Block debug code and secrets               |
| post-edit-typecheck.js | Auto-typecheck TypeScript                  |
| security-scan.js       | Detect secrets, block destructive commands |
| suggest-compact.js     | Track token usage                          |

### MCP Servers (14)

github, filesystem, postgres, sqlite, brave-search, puppeteer, memory, fetch, sequential-thinking, context7, magic, playwright, supabase, redis

See `mcp-configs/README.md` for setup instructions.

## Upgrading

When BBG releases new governance content, upgrade your project:

```bash
bbg upgrade
```

BBG uses **three-way merge** to preserve your customizations:

1. Compares original template → new template → your version
2. Auto-merges non-conflicting changes
3. Marks conflicts for manual resolution (or use `--interactive`)

## Development

```bash
git clone https://github.com/buzzxu/bbg.git
cd bbg
npm install
npm run build
npm test
```

### Requirements

- Node.js >= 18
- TypeScript (strict mode, ESM-only)

### Scripts

| Script              | Description               |
| ------------------- | ------------------------- |
| `npm run build`     | Build with tsup           |
| `npm test`          | Run tests with vitest     |
| `npm run dev`       | Development mode with tsx |
| `npm run typecheck` | TypeScript type checking  |
| `npm run lint`      | ESLint check              |
| `npm run coverage`  | Test coverage report      |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

[AGPL-3.0-only](./LICENSE) — Copyright (C) 2026 buzzxu
