# Performance: Common

Performance rules that apply across all languages and runtime environments.

## Mandatory

- Profile before optimizing — never guess at bottlenecks; measure first
- Use async/await or non-blocking I/O for all file, network, and database operations
- Never block the main thread or event loop with synchronous I/O in server contexts
- Lazy-load heavy dependencies — import at point of use, not at module top level
- Set timeouts on all external calls (HTTP, database, RPC) — never wait indefinitely
- Avoid O(n^2) or worse algorithms on user-controlled input sizes

## Recommended

- Use connection pooling for databases and HTTP clients — never open per-request connections
- Cache expensive computations and frequently accessed data with appropriate TTLs
- Use streaming for large data processing — avoid loading entire files into memory
- Prefer batch operations over individual calls (bulk inserts, batch API requests)
- Use appropriate data structures: maps for lookups, sets for membership, arrays for iteration
- Enable gzip/brotli compression for HTTP responses over 1KB
- Implement pagination for list endpoints — never return unbounded result sets
- Debounce or throttle high-frequency events in UI code
- Use CDN for static assets in web applications

## Forbidden

- Premature optimization without profiling data to justify the complexity
- Synchronous file reads in request handlers or hot paths
- Unbounded in-memory caches — always set a max size and eviction policy
- N+1 query patterns — use joins, eager loading, or batch fetching
- Polling when push/subscription mechanisms are available
- Allocating large objects inside tight loops — hoist allocations outside

## Examples

```
Good: const data = await readFile("config.json");
Bad:  const data = readFileSync("config.json");  // in a server context

Good: const users = await db.query("SELECT * FROM users WHERE id = ANY($1)", [ids]);
Bad:  for (const id of ids) { await db.query("SELECT * FROM users WHERE id = $1", [id]); }

Good: import("heavy-lib").then(lib => lib.process(data));
Bad:  import heavyLib from "heavy-lib";  // loaded even if never used
```


## Related

- **Agents**: [architect](../../agents/architect.md), [devops-reviewer](../../agents/devops-reviewer.md)
- **Skills**: [deployment-patterns](../../skills/deployment-patterns/SKILL.md), [performance-optimization](../../skills/performance-optimization/SKILL.md)
- **Commands**: [/quality-gate](../../commands/quality-gate.md)
