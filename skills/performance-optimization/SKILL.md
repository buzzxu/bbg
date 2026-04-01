---
name: performance-optimization
category: operations
description: Performance tuning covering profiling methodology, bottleneck identification, caching strategies, database optimization, lazy loading, and bundle analysis
---

# Performance Optimization

## Overview
Load this skill when diagnosing slow responses, optimizing database queries, reducing bundle sizes, or establishing performance budgets. Always measure before optimizing — intuition about performance bottlenecks is wrong more often than right.

## Workflow
1. **Measure** — Profile with real or representative workloads; establish baseline metrics
2. **Identify** — Find the bottleneck using flame graphs, query analyzers, and network watchers
3. **Hypothesize** — Form a specific theory about why the bottleneck exists
4. **Optimize** — Apply the minimal targeted fix; change one thing at a time
5. **Verify** — Re-measure to confirm improvement; watch for regressions elsewhere
6. **Monitor** — Set performance budgets and alerts to prevent future degradation

## Key Patterns

### Profiling Methodology
- **CPU profiling** — Flame graphs to identify hot functions; use V8 profiler (Node), py-spy (Python), pprof (Go)
- **Memory profiling** — Heap snapshots to find leaks; track allocation growth over time
- **Network profiling** — Waterfall charts for request timing; identify serial request chains
- **Database profiling** — Slow query logs, EXPLAIN plans, connection pool metrics
- **Rule**: Profile in conditions matching production — same data volume, concurrency, and hardware class

### Bottleneck Categories
1. **I/O bound** — Waiting on database, network, or disk; fix with caching, connection pooling, async I/O
2. **CPU bound** — Computation-heavy; fix with algorithm optimization, memoization, or offloading to workers
3. **Memory bound** — Excessive allocation or leaks; fix with streaming, object pooling, or pagination
4. **Concurrency bound** — Lock contention or thread starvation; fix with lock-free structures or work partitioning

### Caching Strategies
- **Application cache** — In-memory (LRU) for hot, frequently-read data; invalidate on write
- **Distributed cache** — Redis/Memcached for shared state across instances; set TTL on every key
- **HTTP cache** — Cache-Control headers, ETags, CDN caching for static and semi-static content
- **Query result cache** — Cache expensive aggregations; invalidate on underlying data change
- **Cache invalidation** — TTL-based for eventual consistency; event-based for strong consistency

### Database Query Optimization
- Run `EXPLAIN ANALYZE` on slow queries — look for sequential scans on large tables
- Add indexes for columns in WHERE, JOIN, and ORDER BY clauses
- Avoid `SELECT *` — fetch only needed columns
- Eliminate N+1 queries — use JOINs or batch loading (dataloader pattern)
- Paginate with cursor-based pagination, not OFFSET — OFFSET scans and discards rows
- Denormalize read-heavy paths; keep write paths normalized

### Frontend Performance
- **Bundle analysis** — Use webpack-bundle-analyzer or source-map-explorer; set size budgets
- **Code splitting** — Split by route; lazy-load below-the-fold components
- **Image optimization** — WebP/AVIF formats, responsive srcset, lazy loading
- **Critical rendering path** — Inline critical CSS, defer non-essential JavaScript
- **Tree shaking** — Ensure ESM imports; avoid barrel files that defeat tree shaking

## Best Practices
- Set performance budgets: p50 < 200ms, p99 < 1s for API responses; <200KB JS bundle for initial load
- Optimize the critical path first — 80% of user impact comes from 20% of code paths
- Prefer algorithmic improvements (O(n²) → O(n log n)) over micro-optimizations
- Load test with realistic traffic patterns before and after optimization
- Cache at the highest level possible — CDN > reverse proxy > application > database

## Anti-patterns
- Premature optimization — optimizing without profiling data
- Caching without invalidation strategy — stale data causes subtle bugs
- Adding indexes on every column — slows writes and wastes storage
- Optimizing cold paths — spending effort on code that runs once per hour
- Micro-benchmarking in isolation — results do not reflect production behavior
- Ignoring memory to optimize CPU — trading one bottleneck for another

## Checklist
- [ ] Baseline performance measured with production-like data
- [ ] Bottleneck identified with profiling tools, not guesses
- [ ] Database slow queries analyzed with EXPLAIN and indexed appropriately
- [ ] N+1 query patterns eliminated with batch loading or JOINs
- [ ] Caching applied with explicit TTL and invalidation strategy
- [ ] Frontend bundle analyzed and within size budget
- [ ] Code splitting implemented for route-level lazy loading
- [ ] Performance budgets set and enforced in CI
- [ ] Load tests validate optimization under realistic concurrency
- [ ] Monitoring alerts configured for latency regression (p99 drift)


## Related

- **Rules**: [performance](../../rules/common/performance.md)
- **Commands**: [/quality-gate](../../commands/quality-gate.md)
