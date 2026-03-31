# MCP Server Configurations

This directory contains Model Context Protocol (MCP) server configurations for use with AI coding agents (Claude Code, OpenCode, Cursor, etc.).

## Setup

1. Copy `mcp-servers.json` to your agent's configuration location:
   - **Claude Code**: `~/.claude/claude_desktop_config.json`
   - **Cursor**: `.cursor/mcp.json` in your project root
   - **OpenCode**: `opencode.json` in your project root
2. Replace all `YOUR_*_HERE` placeholder values with real credentials.
3. Remove any servers you don't need.

## Server Catalog

### Recommended for All Projects

| Server | Purpose |
|--------|---------|
| `github` | GitHub API access — issues, PRs, repos, code search |
| `filesystem` | Scoped file read/write access to a project directory |
| `memory` | Persistent key-value memory across sessions |
| `fetch` | HTTP fetching and web content retrieval |
| `context7` | Up-to-date library documentation lookup |

### Database Servers

| Server | Purpose |
|--------|---------|
| `postgres` | Query and manage PostgreSQL databases |
| `sqlite` | Local SQLite database access |
| `redis` | Redis key-value store operations |
| `supabase` | Supabase project management and database access |

### Specialized

| Server | Purpose |
|--------|---------|
| `brave-search` | Web search via Brave Search API |
| `puppeteer` | Browser automation, screenshots, scraping |
| `sequential-thinking` | Multi-step reasoning and chain-of-thought |
| `magic` | AI-powered UI component generation |
| `playwright` | Browser automation and E2E testing via MCP |

## Recommended Configurations by Use Case

**Web App Development**: github, filesystem, postgres/sqlite, fetch, context7
**API Development**: github, filesystem, postgres, fetch, redis
**Research / Exploration**: github, brave-search, fetch, memory, sequential-thinking
**Database Work**: postgres, sqlite, redis, supabase, filesystem

## Context Window Budget

**Keep active MCP servers under 10.** Each server consumes context window tokens for its tool definitions. Running all 14 servers simultaneously wastes context that could be used for code and conversation.

Pick the smallest set of servers that covers your current task. You can always swap servers between sessions.

## Security

- **Never commit real API keys.** The `mcp-servers.json` file uses placeholder values intentionally.
- Add `mcp-configs/mcp-servers.local.json` to `.gitignore` if you create a local copy with real credentials.
- Use environment variables or a secrets manager to inject keys at runtime when possible.
- Rotate tokens regularly, especially `GITHUB_PERSONAL_ACCESS_TOKEN`.
- Scope tokens to the minimum required permissions (e.g., read-only for GitHub if you only need code search).
- The `filesystem` server path should be scoped to the project directory — never point it at `/` or `~`.
