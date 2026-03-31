# Node.js: TypeScript

Rules for Node.js applications and CLIs written in TypeScript.

## Mandatory

- Use ESM exclusively — set `"type": "module"` in `package.json`
- Use `.js` extensions in import paths even for TypeScript files (ESM resolution)
- Handle `process.exit()` codes: 0 for success, 1 for general error, 2 for usage error
- Implement graceful shutdown: listen for `SIGINT` and `SIGTERM`, close resources, then exit
- Never use `require()` — use `import()` for dynamic imports and `import` for static
- Use `node:` prefix for built-in modules: `import { readFile } from "node:fs/promises"`
- Always use the `promises` API for `fs`, `stream`, and `dns` — never sync variants in servers

## Recommended

- Use `worker_threads` for CPU-intensive tasks — keep the main thread for I/O coordination
- Use Node.js streams for processing large files — avoid reading entire files into memory
- Use `AbortController` with `signal` for cancellable async operations
- Prefer `node:crypto.randomUUID()` over third-party UUID libraries
- Use `node:test` runner for simple utilities; Vitest for application-level testing
- Set `--max-old-space-size` when processing large datasets — monitor memory usage
- Use `AsyncLocalStorage` for request-scoped context (logging, tracing) instead of globals
- Prefer `structuredClone()` over `JSON.parse(JSON.stringify())` for deep cloning
- Use `node:path` join/resolve for all path construction — never concatenate strings

## Forbidden

- `fs.readFileSync` or any sync I/O in server request handlers or hot paths
- `eval()`, `new Function()`, or `vm.runInNewContext()` with user-provided input
- Unhandled promise rejections — always attach `.catch()` or use `try/catch` with `await`
- `process.exit()` in library code — only in CLI entry points and after cleanup
- Ignoring `EPERM`, `ENOENT`, and other filesystem errors — handle each explicitly
- Global `process.on("uncaughtException")` as a recovery mechanism — log and exit instead

## Examples

```typescript
// Good: Graceful shutdown
const server = app.listen(port);
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  server.close();
  await db.disconnect();
  process.exit(0);
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Bad: No cleanup
process.on("SIGINT", () => process.exit());

// Good: ESM import with node: prefix
import { readFile } from "node:fs/promises";

// Bad: CommonJS require
const fs = require("fs");
```


## Related

- **Agents**: [typescript-reviewer](../../agents/typescript-reviewer.md)
- **Skills**: [nextjs-patterns](../../skills/nextjs-patterns/SKILL.md), [typescript-patterns](../../skills/typescript-patterns/SKILL.md)
- **Commands**: [/ts-review](../../commands/ts-review.md)
