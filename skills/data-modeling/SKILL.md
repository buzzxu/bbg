---
name: data-modeling
category: architecture
description: Data modeling covering normalization, denormalization tradeoffs, document vs relational, indexing strategies, and migration planning
---

# Data Modeling

## Overview
Load this skill when designing database schemas, choosing between relational and document databases, planning indexes, or managing schema migrations. A well-designed data model makes queries fast, code simple, and evolution manageable. A poor one creates permanent friction.

## Key Patterns

### Normalization (Relational)
1. **1NF** — Atomic values only; no repeating groups or arrays in columns
2. **2NF** — Every non-key column depends on the entire primary key, not just part of it
3. **3NF** — No transitive dependencies; non-key columns depend only on the primary key
4. **When to normalize** — Write-heavy workloads, data integrity is critical, storage is bounded
5. **Tradeoff** — Normalized data requires JOINs for reads; clean for writes, costly for complex queries

### Denormalization
- Duplicate data to optimize read performance — precompute JOINs into flat tables or materialized views
- Use for: dashboards, search indexes, reporting, read-heavy APIs
- Accept the tradeoff: write complexity increases (must update duplicates), risk of stale data
- Implement via: materialized views, CQRS projections, application-level denormalization on write
- Denormalize selectively — only for proven slow query paths, not speculatively

### Document vs Relational

| Criteria | Relational (PostgreSQL, MySQL) | Document (MongoDB, DynamoDB) |
|----------|-------------------------------|------------------------------|
| Schema | Strict, enforced | Flexible, schema-on-read |
| Relationships | JOINs across tables | Embed or reference |
| Consistency | ACID transactions | Varies — eventual to strong |
| Query flexibility | Ad-hoc queries, complex JOINs | Optimized for known access patterns |
| Best for | Complex relationships, reporting | Nested data, rapid iteration |

- **Embedding** (document DB) — Store related data together when it is always accessed together; avoid for unbounded arrays
- **Referencing** — Store IDs and fetch separately when related data is large, shared, or independently accessed
- **Hybrid** — PostgreSQL with JSONB columns gives relational structure with document flexibility where needed

### Indexing Strategies
- **Primary key** — Every table needs one; auto-increment integer or UUID depending on distribution needs
- **B-tree index** — Default for equality and range queries (WHERE, ORDER BY, JOIN columns)
- **Composite index** — Multi-column for queries filtering on multiple fields; column order matters (most selective first)
- **Partial index** — Index only rows matching a condition (`WHERE status = 'active'`); smaller and faster
- **Covering index** — Include all queried columns; the database reads only the index, never the table
- **Full-text index** — For search queries; prefer dedicated search engines (Elasticsearch) for complex needs
- **Do not over-index** — Every index slows writes and consumes storage; add indexes for proven slow queries

### Migration Planning
1. **Backward compatible** — Add nullable columns, new tables, or new indexes; these can deploy before the application change
2. **Multi-phase** — Rename or remove columns in phases: add new → migrate data → update code → drop old
3. **Zero-downtime** — Never lock tables in production; use `CREATE INDEX CONCURRENTLY` (PostgreSQL)
4. **Rollback plan** — Every migration has a reverse migration tested in staging before production
5. **Data backfill** — Large data migrations run as background jobs, not in the migration transaction
6. **Version control** — All migrations are sequential, numbered, and stored in the repository

### Data Integrity
- Use foreign keys to enforce relationships at the database level, not just application code
- Apply CHECK constraints for value validation (positive amounts, valid status values)
- Use UNIQUE constraints for natural keys (email, slug, external IDs)
- Default values for non-nullable columns to prevent insert failures during schema evolution
- Use transactions for multi-table writes — partial writes corrupt data

## Best Practices
- Start normalized; denormalize when measured query performance demands it
- Design schemas around access patterns — know your queries before designing your tables
- Use UUIDs for external-facing IDs; sequential integers for internal references and JOINs
- Keep column types precise — `timestamp with time zone`, not `varchar` for dates
- Document the data model — ER diagrams, column descriptions, and relationship explanations
- Test migrations on a production-size dataset clone before deploying

## Anti-patterns
- Designing the schema to match the UI form — UIs change frequently, schemas should not
- Entity-Attribute-Value (EAV) pattern — destroys query performance and type safety
- Storing comma-separated values in a column — use a join table or array type
- Missing foreign keys — allows orphaned records that corrupt reporting and application logic
- Running migrations without a rollback plan
- Adding indexes on every column preemptively — measure first, index second

## Checklist
- [ ] Schema normalized to 3NF with intentional denormalization for read-heavy paths
- [ ] Access patterns documented and schema designed around them
- [ ] Indexes present for all columns used in WHERE, JOIN, and ORDER BY
- [ ] No over-indexing — each index justified by a measured query performance need
- [ ] Foreign keys enforce referential integrity at the database level
- [ ] Migrations are backward compatible and support zero-downtime deployment
- [ ] Every migration has a tested rollback script
- [ ] Large data backfills run as background jobs outside migration transactions
- [ ] External-facing IDs use UUIDs; internal references use sequential integers
- [ ] Data model documented with ER diagram and column descriptions


## Related

- **Agents**: [database-reviewer](../../agents/database-reviewer.md)
