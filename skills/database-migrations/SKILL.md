---
name: database-migrations
category: backend
description: Migration patterns — schema changes, data migrations, rollback strategies, and zero-downtime migrations
---

# Database Migrations

## Overview
Load this skill when modifying database schemas or migrating data. Migrations are irreversible in production — mistakes cause downtime and data loss. Every migration must be planned, tested, and reversible.

## Workflow

### Step 1: Plan
- Document the current schema and the target schema
- Identify breaking changes (column removals, type changes, constraint additions)
- Determine if this requires a data migration in addition to schema change
- Plan the rollback strategy before writing the migration

### Step 2: Write Migration
- One concern per migration file — don't mix schema and data changes
- Name descriptively: `20250101_add_email_index_to_users.sql`
- Include both `up` (apply) and `down` (rollback) in every migration
- Test the migration against a copy of production data

### Step 3: Test
- Run migration on a local copy of production data (not empty database)
- Verify the rollback works cleanly
- Test application code against both old and new schemas (for zero-downtime)
- Measure execution time on production-size data

### Step 4: Deploy
- Take a backup before running in production
- Run during low-traffic windows for large migrations
- Monitor for locks, long-running queries, and replication lag
- Have the rollback script ready to execute immediately

## Patterns

### Safe Schema Changes (Zero-Downtime)
These are safe to run without downtime:
- Adding a new nullable column
- Adding a new table
- Adding an index concurrently (`CREATE INDEX CONCURRENTLY`)
- Adding a column with a default value (Postgres 11+)

### Unsafe Schema Changes (Require Strategy)
These can cause locks, downtime, or data issues:
- Dropping a column → use expand-contract pattern
- Renaming a column → add new, migrate data, drop old
- Changing column type → add new column, migrate, swap
- Adding NOT NULL constraint → add CHECK constraint first, then convert
- Dropping a table → ensure no code references it

### Expand-Contract Pattern
For breaking schema changes without downtime:
```
Phase 1 (Expand): Add new column/table alongside old one
Phase 2 (Migrate): Copy data from old to new, dual-write in application
Phase 3 (Cutover): Switch application to read from new
Phase 4 (Contract): Remove old column/table after verification
```
Each phase is a separate deployment — never combine them.

### Data Migration
- Batch large data migrations — don't UPDATE millions of rows in one transaction
- Use cursor-based iteration: process 1000 rows at a time
- Log progress: "migrated 50000/200000 rows"
- Make data migrations idempotent — safe to re-run on failure
- Validate data after migration with count and checksum queries

### Rollback Strategy
- Every migration must have a tested `down` migration
- Data migrations need reverse data transformations
- Keep the previous application version deployable for at least 24 hours
- Backup before every production migration — test that backups restore correctly

## Rules
- Never run untested migrations in production
- Never modify a migration that has been applied — create a new one
- Never drop columns or tables without verifying zero references in code
- Always include rollback logic in every migration
- Always batch large data migrations — never process all rows in one transaction
- Always backup before migrating production

## Anti-patterns
- Running `ALTER TABLE` on large tables during peak traffic
- Combining schema and data changes in a single migration
- Modifying previously-applied migration files
- Adding NOT NULL to an existing column without a default value
- Dropping columns before removing all code references
- Trusting that "it worked in staging" means production is safe

## Checklist
- [ ] Migration has both `up` and `down` logic
- [ ] Tested on production-size data (not empty database)
- [ ] Rollback tested and verified
- [ ] No unsafe operations without expand-contract strategy
- [ ] Data migrations are batched and idempotent
- [ ] Production backup taken before applying
- [ ] Execution time measured and acceptable
- [ ] Application code works with both old and new schemas
- [ ] No code references to dropped columns/tables
