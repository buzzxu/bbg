---
name: postgres-patterns
category: backend
description: PostgreSQL optimization — indexing, query planning, connection pooling, partitioning, and JSONB patterns
---

# PostgreSQL Patterns

## Overview
Load this skill when designing schemas, optimizing queries, or scaling PostgreSQL databases. These patterns cover the most impactful optimizations and common pitfalls for production Postgres deployments.

## Patterns

### Indexing Strategy
- **B-tree** (default): equality and range queries (`WHERE`, `ORDER BY`, `BETWEEN`)
- **GIN**: full-text search, JSONB containment (`@>`), array overlap (`&&`)
- **GiST**: geometric data, range types, nearest-neighbor queries
- **BRIN**: large tables with natural ordering (timestamps, sequential IDs)
- **Partial index**: index a subset of rows — `CREATE INDEX ON orders(status) WHERE status = 'pending'`
- **Composite index**: multi-column — put high-selectivity columns first
- **Covering index**: `INCLUDE` columns to enable index-only scans

### When to Add an Index
- Query appears in slow query log (>100ms for OLTP)
- `EXPLAIN ANALYZE` shows sequential scan on large table
- WHERE clause filters on unindexed column
- JOIN condition on unindexed column
- ORDER BY on unindexed column causing sort operations

### Query Optimization
- Always use `EXPLAIN ANALYZE` — not just `EXPLAIN` (need actual execution times)
- Look for: sequential scans on large tables, nested loops with high row counts, sorts on disk
- Use CTEs for readability but be aware they are optimization fences (pre-PG12)
- Prefer `EXISTS` over `IN` for subqueries on large datasets
- Avoid `SELECT *` — select only needed columns for better index utilization
- Use `LIMIT` with `ORDER BY` — without ORDER BY, LIMIT returns arbitrary rows

### Connection Pooling
- Use PgBouncer or built-in pooling — never open connections per request
- **Transaction mode**: best for most web applications (connection returned after each transaction)
- **Session mode**: required for prepared statements, temp tables, advisory locks
- Pool size formula: `connections = (2 * CPU_cores) + disk_spindles` (typically 20-50)
- Monitor: active connections, waiting queries, pool saturation

### JSONB Patterns
- Use JSONB for flexible schemas, metadata, and denormalized data
- Index JSONB with GIN: `CREATE INDEX ON events USING GIN (payload)`
- Query with containment: `WHERE payload @> '{"type": "click"}'` (uses GIN index)
- Extract values: `payload->>'name'` (text) vs `payload->'config'` (JSONB)
- Don't use JSONB for data that needs relational queries, joins, or constraints
- Use expression indexes for frequently queried paths: `CREATE INDEX ON events ((payload->>'type'))`

### Partitioning
- Partition when tables exceed 10M+ rows or need time-based retention
- **Range partitioning**: time-series data — partition by month/week
- **List partitioning**: categorical data — partition by region, tenant
- **Hash partitioning**: even distribution when no natural partition key
- Enable `partition_pruning` — queries touching one partition skip others
- Maintenance: create future partitions automatically, detach and archive old ones

### Performance Monitoring
- `pg_stat_statements`: top queries by time, calls, rows — enable in production
- `pg_stat_user_tables`: sequential vs index scans, dead tuples, last vacuum
- `pg_stat_activity`: active queries, waiting locks, idle connections
- Key metrics: cache hit ratio (>99%), index hit ratio (>95%), dead tuple ratio (<10%)

## Rules
- Every foreign key must have an index on the referencing column
- Every query in production must have been analyzed with `EXPLAIN ANALYZE`
- Use connection pooling — never direct connections from application
- Vacuum and analyze run regularly — don't rely on autovacuum alone for busy tables
- Never use `LIKE '%prefix'` (leading wildcard) — it cannot use B-tree indexes
- Always set `statement_timeout` to prevent runaway queries

## Anti-patterns
- Missing indexes on foreign keys — causes slow joins and lock contention
- Using `COUNT(*)` on large tables — use approximate counts or materialized views
- Storing large blobs in the database — use object storage with references
- Over-indexing — each index slows writes and uses disk; justify every index
- Using ORM-generated queries without reviewing the SQL
- Running analytics queries on the primary — use a read replica

## Checklist
- [ ] All foreign keys have corresponding indexes
- [ ] Slow queries identified and optimized with EXPLAIN ANALYZE
- [ ] Connection pooling configured and sized appropriately
- [ ] JSONB columns have GIN indexes for queried paths
- [ ] Large tables evaluated for partitioning
- [ ] pg_stat_statements enabled for query monitoring
- [ ] Autovacuum settings tuned for table write patterns
- [ ] Cache hit ratio above 99%


## Related

- **Agents**: [database-reviewer](../../agents/database-reviewer.md)
