---
name: mcp-integration
category: ai-workflow
description: MCP server integration — configuration, security, capability mapping, and multi-server orchestration
---

# MCP Integration

## Overview
Load this skill when configuring, building, or troubleshooting Model Context Protocol (MCP) servers. MCP extends AI agents with tools, resources, and prompts from external systems. Proper integration makes agents more capable; poor integration introduces latency, security risks, and confusion.

## Workflow
1. **Identify need** — What capability does the agent lack?
2. **Find or build** — Check existing MCP servers before building custom
3. **Configure** — Set up transport, authentication, and permissions
4. **Test** — Verify tool calls work with expected inputs and outputs
5. **Secure** — Apply least privilege, validate all inputs, audit access
6. **Monitor** — Track usage, latency, and errors in production

## Patterns

### MCP Architecture
```
AI Agent ←→ MCP Client ←→ Transport (stdio/SSE/HTTP) ←→ MCP Server ←→ External System
```
- **Tools**: functions the agent can call (database queries, API calls, file operations)
- **Resources**: data the agent can read (documentation, schemas, configurations)
- **Prompts**: reusable prompt templates with parameters

### Transport Selection
- **stdio**: local processes — fastest, simplest, most secure (no network)
- **SSE (Server-Sent Events)**: remote servers — streaming support, HTTP-based
- **Streamable HTTP**: new standard — request-response with optional streaming
- Use stdio for local tools (filesystem, git, database)
- Use SSE/HTTP for shared services (search, monitoring, team tools)

### Configuration
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"],
      "env": {}
    },
    "database": {
      "command": "node",
      "args": ["./mcp-servers/db-server.js"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    },
    "remote-api": {
      "url": "https://mcp.example.com/sse",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      }
    }
  }
}
```

### Security Model
- **Least privilege**: each server only accesses what it needs
- **Path restrictions**: filesystem servers limited to specific directories
- **Read-only by default**: enable writes only when necessary
- **Credential isolation**: each server has its own credentials, not shared
- **Input validation**: MCP servers must validate all tool inputs
- **Output sanitization**: never return secrets or PII in tool responses

### Capability Mapping
Map agent needs to MCP tools:
```
Need: "Query the database"        → Tool: database.query
Need: "Read project files"        → Tool: filesystem.read
Need: "Search the codebase"       → Tool: grep.search
Need: "Create GitHub issues"      → Tool: github.createIssue
Need: "Run tests"                 → Tool: shell.execute (restricted)
```
- One tool per atomic operation — don't create god-tools
- Tool descriptions must be clear and specific — agents use descriptions to decide when to call
- Include parameter schemas with types, descriptions, and examples
- Document expected output format for each tool

### Multi-Server Orchestration
When using multiple MCP servers together:
- **Namespace tools**: prefix with server name to avoid collisions (`github.createPR`, `jira.createTicket`)
- **Minimize servers**: each server adds latency and memory — only enable what's needed
- **Startup order**: servers with dependencies start after their dependencies
- **Failover**: agents should handle server unavailability gracefully
- **Health monitoring**: periodically verify servers are responsive

### Building Custom MCP Servers
```typescript
// Minimal MCP server structure
import { Server } from '@modelcontextprotocol/sdk/server';

const server = new Server({ name: 'my-server', version: '1.0.0' }, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'myTool',
    description: 'Clear description of what this tool does',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search query' } },
      required: ['query']
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Validate input, execute, return result
});
```
- Start with the official SDK — don't implement the protocol from scratch
- Define input schemas precisely — agents rely on them
- Return structured data (JSON), not free text
- Handle errors gracefully — return error messages, don't crash

## Rules
- Every MCP server must run with least privilege permissions
- Every tool must validate its inputs before execution
- Credentials must be passed via environment variables, never hardcoded
- Tool descriptions must accurately describe behavior — agents use them for decision-making
- Filesystem servers must be restricted to specific allowed directories
- Server crashes must not crash the agent — handle disconnections gracefully

## Anti-patterns
- Giving MCP servers unrestricted filesystem or network access
- Vague tool descriptions ("does stuff with data") — agents won't use them correctly
- God-tools that accept free-form commands — too broad, too dangerous
- Hardcoded credentials in MCP server configuration
- No error handling — server crashes propagate to the agent
- Too many servers — each adds overhead; consolidate related capabilities

## Checklist
- [ ] MCP server addresses a specific, identified capability gap
- [ ] Transport appropriate for the use case (stdio for local, SSE/HTTP for remote)
- [ ] Credentials passed via environment variables
- [ ] Filesystem access restricted to allowed directories
- [ ] All tool inputs validated
- [ ] Tool descriptions are clear and accurate
- [ ] Error handling prevents server crashes from affecting the agent
- [ ] Multi-server setup uses namespaced tools
- [ ] Health monitoring in place for production servers


## Related

- **Commands**: [/setup-pm](../../commands/setup-pm.md)
