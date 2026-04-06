# Telemetry & Observability Implementation Plan (Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SQLite-based observability/telemetry as generated governance content — 9 tables, 6 views, 9 report queries, a dashboard skill, a report command, and a telemetry collector hook — establishing the SQLite pattern that Phases 3-6 will follow.

**Architecture:** BBG is a generator. All new files are governance content that BBG copies to target projects via `bbg init`. The only `src/` changes are registering new templates in the governance manifest (`src/templates/governance.ts`), updating test count assertions, and adding `.bbg/telemetry.db` to gitignore entries. Template files live under `templates/generic/` for the SQL scripts and are registered as a new `BBG_SCRIPTS` section in the manifest. The skill, command, and hook files follow existing patterns — placed in their respective top-level directories and added to the existing arrays.

**Tech Stack:** TypeScript (ESM), vitest, SQLite DDL/DML, Node.js hooks (ESM), Handlebars-free copy templates

---

## File Map

| Action | File                                                                | Responsibility                          |
| ------ | ------------------------------------------------------------------- | --------------------------------------- |
| Create | `templates/generic/.bbg/scripts/telemetry-init.sql`                 | DDL for 9 tables + 6 views              |
| Create | `templates/generic/.bbg/scripts/telemetry-report.sql`               | 9 predefined report queries             |
| Create | `skills/telemetry-dashboard/SKILL.md`                               | Dashboard skill for analyzing telemetry |
| Create | `commands/telemetry-report.md`                                      | Slash command to generate reports       |
| Create | `hooks/scripts/telemetry-collector.js`                              | Hook script for event collection        |
| Modify | `src/templates/governance.ts:49-70,126-151,162-171,230-296,302-315` | Register all new content                |
| Modify | `tests/unit/templates/governance.test.ts:60-101,135-136,183-184`    | Update count assertions                 |
| Modify | `src/constants.ts:24-25`                                            | Add telemetry.db gitignore constant     |
| Modify | `src/commands/init-gitignore.ts:40-47`                              | Include telemetry.db in managed block   |

---

## Task 1: Create telemetry-init.sql (DDL)

**Files:**

- Create: `templates/generic/.bbg/scripts/telemetry-init.sql`

- [ ] **Step 1: Create the directory structure**

Run: `mkdir -p templates/generic/.bbg/scripts`

- [ ] **Step 2: Create telemetry-init.sql with all 9 tables and 6 views**

Create `templates/generic/.bbg/scripts/telemetry-init.sql`:

```sql
-- =============================================================================
-- telemetry-init.sql — BBG Observability Schema
-- Creates 9 tables + 6 views for AI tool observation and project intelligence.
-- Run once per project: sqlite3 .bbg/telemetry.db < .bbg/scripts/telemetry-init.sql
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- AI Tool Observation (5 tables)
-- ---------------------------------------------------------------------------

-- Core event table — every observable action becomes a row here.
CREATE TABLE IF NOT EXISTS telemetry_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  session_id    TEXT,
  event_type    TEXT    NOT NULL,
  category      TEXT    NOT NULL DEFAULT 'general',
  status        TEXT    NOT NULL DEFAULT 'ok',
  duration_ms   INTEGER,
  details       TEXT    -- JSON blob for event-specific data
);

-- Session lifecycle tracking.
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  started_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ended_at    TEXT,
  tool        TEXT,
  commands    TEXT,   -- JSON array of commands executed
  status      TEXT NOT NULL DEFAULT 'active'
);

-- Hook trigger records — which hooks fired and whether they were useful.
CREATE TABLE IF NOT EXISTS hook_hits (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  hook_name       TEXT    NOT NULL,
  action          TEXT,
  false_positive  INTEGER NOT NULL DEFAULT 0,
  details         TEXT    -- JSON blob
);

-- Quality gate execution history.
CREATE TABLE IF NOT EXISTS gate_results (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  session_id    TEXT,
  check_name    TEXT    NOT NULL,
  passed        INTEGER NOT NULL,
  duration_ms   INTEGER,
  output        TEXT
);

-- Model routing decisions and token usage.
CREATE TABLE IF NOT EXISTS model_routes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  session_id    TEXT,
  task_type     TEXT    NOT NULL,
  model         TEXT    NOT NULL,
  tokens_in     INTEGER,
  tokens_out    INTEGER,
  status        TEXT    NOT NULL DEFAULT 'ok',
  duration_ms   INTEGER
);

-- ---------------------------------------------------------------------------
-- Project Engineering Intelligence (4 tables)
-- ---------------------------------------------------------------------------

-- Requirement/task lifecycle — tracks tasks through phases.
CREATE TABLE IF NOT EXISTS task_lifecycle (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  task_id       TEXT    NOT NULL,
  title         TEXT,
  phase         TEXT    NOT NULL,
  prev_phase    TEXT,
  session_id    TEXT,
  details       TEXT    -- JSON blob
);

-- Architecture and technology decisions (lightweight ADR).
CREATE TABLE IF NOT EXISTS decision_records (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  decision_id   TEXT    UNIQUE NOT NULL,
  title         TEXT    NOT NULL,
  category      TEXT    NOT NULL DEFAULT 'architecture',
  status        TEXT    NOT NULL DEFAULT 'proposed',
  supersedes    TEXT,
  context       TEXT,
  decision      TEXT,
  consequences  TEXT
);

-- Requirement evolution — captures changes to specs over time.
CREATE TABLE IF NOT EXISTS requirement_changes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  task_id       TEXT    NOT NULL,
  change_type   TEXT    NOT NULL,
  source        TEXT,
  summary       TEXT    NOT NULL,
  spec_path     TEXT,
  details       TEXT    -- JSON blob
);

-- Planning events — plan creation, phase transitions, completion tracking.
CREATE TABLE IF NOT EXISTS planning_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  plan_id       TEXT    NOT NULL,
  event_type    TEXT    NOT NULL,
  plan_path     TEXT,
  phase         TEXT,
  progress      REAL,
  details       TEXT    -- JSON blob
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_events_session     ON telemetry_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type        ON telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp   ON telemetry_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_hook_hits_name     ON hook_hits(hook_name);
CREATE INDEX IF NOT EXISTS idx_gate_results_check ON gate_results(check_name);
CREATE INDEX IF NOT EXISTS idx_gate_results_ts    ON gate_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_model_routes_task  ON model_routes(task_type);
CREATE INDEX IF NOT EXISTS idx_task_lifecycle_tid ON task_lifecycle(task_id);
CREATE INDEX IF NOT EXISTS idx_task_lifecycle_ph  ON task_lifecycle(phase);
CREATE INDEX IF NOT EXISTS idx_decisions_cat      ON decision_records(category);
CREATE INDEX IF NOT EXISTS idx_req_changes_tid    ON requirement_changes(task_id);
CREATE INDEX IF NOT EXISTS idx_planning_plan      ON planning_events(plan_id);

-- ---------------------------------------------------------------------------
-- Views (6)
-- ---------------------------------------------------------------------------

-- Daily quality gate pass rate — trend line for CI/governance health.
CREATE VIEW IF NOT EXISTS v_daily_gate_pass_rate AS
SELECT
  date(timestamp) AS day,
  COUNT(*)        AS total_checks,
  SUM(passed)     AS passed,
  ROUND(100.0 * SUM(passed) / COUNT(*), 1) AS pass_rate_pct
FROM gate_results
GROUP BY date(timestamp)
ORDER BY day DESC;

-- Hook effectiveness — which hooks fire most and how often they're false positives.
CREATE VIEW IF NOT EXISTS v_hook_effectiveness AS
SELECT
  hook_name,
  COUNT(*)                    AS total_hits,
  SUM(false_positive)         AS false_positives,
  COUNT(*) - SUM(false_positive) AS true_positives,
  ROUND(100.0 * (COUNT(*) - SUM(false_positive)) / MAX(COUNT(*), 1), 1) AS effectiveness_pct
FROM hook_hits
GROUP BY hook_name
ORDER BY total_hits DESC;

-- Session summary — duration, event count, and status per session.
CREATE VIEW IF NOT EXISTS v_session_summary AS
SELECT
  s.id          AS session_id,
  s.tool,
  s.started_at,
  s.ended_at,
  s.status,
  ROUND(
    (julianday(COALESCE(s.ended_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))
     - julianday(s.started_at)) * 86400, 0
  ) AS duration_seconds,
  COUNT(e.id)   AS event_count
FROM sessions s
LEFT JOIN telemetry_events e ON e.session_id = s.id
GROUP BY s.id
ORDER BY s.started_at DESC;

-- Task flow efficiency — time spent in each phase per task.
CREATE VIEW IF NOT EXISTS v_task_flow_efficiency AS
SELECT
  task_id,
  title,
  phase,
  prev_phase,
  MIN(timestamp)  AS entered_phase_at,
  COUNT(*)        AS transitions
FROM task_lifecycle
GROUP BY task_id, phase
ORDER BY task_id, entered_phase_at;

-- Tech evolution timeline — decision records ordered chronologically.
CREATE VIEW IF NOT EXISTS v_tech_evolution_timeline AS
SELECT
  decision_id,
  title,
  category,
  status,
  supersedes,
  timestamp AS decided_at,
  SUBSTR(context, 1, 200) AS context_preview
FROM decision_records
ORDER BY timestamp DESC;

-- Model routing efficiency — cost and latency per model/task combination.
CREATE VIEW IF NOT EXISTS v_model_route_efficiency AS
SELECT
  model,
  task_type,
  COUNT(*)                  AS invocations,
  SUM(tokens_in)            AS total_tokens_in,
  SUM(tokens_out)           AS total_tokens_out,
  ROUND(AVG(duration_ms), 0) AS avg_duration_ms,
  SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS successes,
  ROUND(100.0 * SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) / MAX(COUNT(*), 1), 1) AS success_rate_pct
FROM model_routes
GROUP BY model, task_type
ORDER BY invocations DESC;
```

- [ ] **Step 3: Verify the file exists and is well-formed**

Run: `wc -l templates/generic/.bbg/scripts/telemetry-init.sql`
Expected: ~180-200 lines

- [ ] **Step 4: Commit**

```bash
git add templates/generic/.bbg/scripts/telemetry-init.sql
git commit -m "feat: add telemetry SQLite schema DDL (9 tables, 6 views)"
```

---

## Task 2: Create telemetry-report.sql (9 Report Queries)

**Files:**

- Create: `templates/generic/.bbg/scripts/telemetry-report.sql`

- [ ] **Step 1: Create telemetry-report.sql with all 9 report queries**

Create `templates/generic/.bbg/scripts/telemetry-report.sql`:

```sql
-- =============================================================================
-- telemetry-report.sql — BBG Predefined Report Queries
-- 9 reports for AI workflow observability and project intelligence.
-- Usage: sqlite3 .bbg/telemetry.db < .bbg/scripts/telemetry-report.sql
-- Or run individual sections by copying the query you need.
-- =============================================================================

-- =============================================
-- Report 1: Workflow Stability Report
-- Shows event distribution, error rates, and session health over the last 30 days.
-- =============================================
.headers on
.mode column
.print '=== Report 1: Workflow Stability (Last 30 Days) ==='
.print ''

SELECT
  date(timestamp)           AS day,
  COUNT(*)                  AS total_events,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors,
  SUM(CASE WHEN status = 'ok'    THEN 1 ELSE 0 END) AS successes,
  ROUND(100.0 * SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) / MAX(COUNT(*), 1), 1) AS success_rate_pct,
  ROUND(AVG(duration_ms), 0) AS avg_duration_ms
FROM telemetry_events
WHERE timestamp >= date('now', '-30 days')
GROUP BY date(timestamp)
ORDER BY day DESC;

-- =============================================
-- Report 2: Hook Effectiveness Report
-- Identifies hooks that fire frequently, their false positive rates,
-- and which hooks provide the most value.
-- =============================================
.print ''
.print '=== Report 2: Hook Effectiveness ==='
.print ''

SELECT
  hook_name,
  COUNT(*)                              AS total_hits,
  SUM(false_positive)                   AS false_positives,
  COUNT(*) - SUM(false_positive)        AS true_positives,
  ROUND(100.0 * (COUNT(*) - SUM(false_positive)) / MAX(COUNT(*), 1), 1) AS effectiveness_pct,
  MIN(timestamp)                        AS first_hit,
  MAX(timestamp)                        AS last_hit
FROM hook_hits
GROUP BY hook_name
ORDER BY total_hits DESC;

-- =============================================
-- Report 3: Quality-Gate Trend
-- Daily pass/fail rates for all quality gates, showing governance health over time.
-- =============================================
.print ''
.print '=== Report 3: Quality-Gate Trend (Last 30 Days) ==='
.print ''

SELECT
  date(timestamp)           AS day,
  check_name,
  COUNT(*)                  AS runs,
  SUM(passed)               AS passed,
  COUNT(*) - SUM(passed)    AS failed,
  ROUND(100.0 * SUM(passed) / MAX(COUNT(*), 1), 1) AS pass_rate_pct,
  ROUND(AVG(duration_ms), 0) AS avg_duration_ms
FROM gate_results
WHERE timestamp >= date('now', '-30 days')
GROUP BY date(timestamp), check_name
ORDER BY day DESC, check_name;

-- =============================================
-- Report 4: Model Routing Efficiency
-- Token usage, latency, and success rates per model and task type.
-- =============================================
.print ''
.print '=== Report 4: Model Routing Efficiency ==='
.print ''

SELECT
  model,
  task_type,
  COUNT(*)                    AS invocations,
  SUM(tokens_in)              AS total_tokens_in,
  SUM(tokens_out)             AS total_tokens_out,
  SUM(tokens_in + tokens_out) AS total_tokens,
  ROUND(AVG(duration_ms), 0)  AS avg_duration_ms,
  ROUND(100.0 * SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) / MAX(COUNT(*), 1), 1) AS success_rate_pct
FROM model_routes
GROUP BY model, task_type
ORDER BY total_tokens DESC;

-- =============================================
-- Report 5: Session Overview
-- Duration, command count, and event density for recent sessions.
-- =============================================
.print ''
.print '=== Report 5: Session Overview (Last 20 Sessions) ==='
.print ''

SELECT
  s.id          AS session_id,
  s.tool,
  s.started_at,
  s.ended_at,
  s.status,
  ROUND(
    (julianday(COALESCE(s.ended_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))
     - julianday(s.started_at)) * 86400 / 60.0, 1
  ) AS duration_min,
  COUNT(e.id)   AS event_count
FROM sessions s
LEFT JOIN telemetry_events e ON e.session_id = s.id
GROUP BY s.id
ORDER BY s.started_at DESC
LIMIT 20;

-- =============================================
-- Report 6: Task Flow Efficiency
-- How long tasks spend in each phase, identifying bottleneck phases.
-- =============================================
.print ''
.print '=== Report 6: Task Flow Efficiency ==='
.print ''

SELECT
  tl.task_id,
  tl.title,
  tl.phase,
  tl.prev_phase,
  COUNT(*)            AS transitions_in_phase,
  MIN(tl.timestamp)   AS entered_at,
  MAX(tl.timestamp)   AS last_activity_at,
  ROUND(
    (julianday(MAX(tl.timestamp)) - julianday(MIN(tl.timestamp))) * 86400 / 60.0, 1
  ) AS phase_duration_min
FROM task_lifecycle tl
GROUP BY tl.task_id, tl.phase
ORDER BY tl.task_id, entered_at;

-- =============================================
-- Report 7: Tech Evolution Timeline
-- Chronological view of architecture and technology decisions.
-- =============================================
.print ''
.print '=== Report 7: Tech Evolution Timeline ==='
.print ''

SELECT
  decision_id,
  title,
  category,
  status,
  supersedes,
  timestamp AS decided_at,
  SUBSTR(context, 1, 120) AS context_excerpt,
  SUBSTR(decision, 1, 120) AS decision_excerpt
FROM decision_records
ORDER BY timestamp DESC;

-- =============================================
-- Report 8: Requirement Stability
-- How often requirements change, by type and source.
-- =============================================
.print ''
.print '=== Report 8: Requirement Stability ==='
.print ''

SELECT
  task_id,
  COUNT(*)                    AS total_changes,
  SUM(CASE WHEN change_type = 'added'    THEN 1 ELSE 0 END) AS additions,
  SUM(CASE WHEN change_type = 'modified' THEN 1 ELSE 0 END) AS modifications,
  SUM(CASE WHEN change_type = 'removed'  THEN 1 ELSE 0 END) AS removals,
  GROUP_CONCAT(DISTINCT source) AS change_sources,
  MIN(timestamp)              AS first_change,
  MAX(timestamp)              AS last_change,
  ROUND(
    (julianday(MAX(timestamp)) - julianday(MIN(timestamp))), 1
  ) AS churn_span_days
FROM requirement_changes
GROUP BY task_id
ORDER BY total_changes DESC;

-- =============================================
-- Report 9: Planning Execution Rate
-- Plan progress, phase completion, and stalled plans.
-- =============================================
.print ''
.print '=== Report 9: Planning Execution Rate ==='
.print ''

SELECT
  plan_id,
  COUNT(*)                    AS total_events,
  SUM(CASE WHEN event_type = 'phase_complete' THEN 1 ELSE 0 END) AS phases_completed,
  SUM(CASE WHEN event_type = 'plan_created'   THEN 1 ELSE 0 END) AS plans_created,
  SUM(CASE WHEN event_type = 'plan_complete'  THEN 1 ELSE 0 END) AS plans_completed,
  MAX(progress)               AS latest_progress,
  MIN(timestamp)              AS started_at,
  MAX(timestamp)              AS last_activity,
  ROUND(
    (julianday(MAX(timestamp)) - julianday(MIN(timestamp))), 1
  ) AS elapsed_days
FROM planning_events
GROUP BY plan_id
ORDER BY last_activity DESC;
```

- [ ] **Step 2: Verify the file exists**

Run: `wc -l templates/generic/.bbg/scripts/telemetry-report.sql`
Expected: ~170-200 lines

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/scripts/telemetry-report.sql
git commit -m "feat: add 9 predefined telemetry report queries"
```

---

## Task 3: Create telemetry-dashboard Skill

**Files:**

- Create: `skills/telemetry-dashboard/SKILL.md`

- [ ] **Step 1: Create the skill directory**

Run: `mkdir -p skills/telemetry-dashboard`

- [ ] **Step 2: Create SKILL.md**

Create `skills/telemetry-dashboard/SKILL.md`:

````markdown
---
name: telemetry-dashboard
category: observability
description: Review and analyze telemetry data — query SQLite database, interpret trends, generate actionable insights
---

# Telemetry Dashboard

## Overview

Use this skill when you need to review project telemetry data, investigate workflow health, analyze model routing efficiency, or generate observability reports. This skill queries the SQLite telemetry database (`.bbg/telemetry.db`) and falls back to `.bbg/telemetry/events.json` if the database does not exist.

## Prerequisites

- SQLite telemetry database at `.bbg/telemetry.db` (initialized by `session-start.js` or manually via `sqlite3 .bbg/telemetry.db < .bbg/scripts/telemetry-init.sql`)
- Fallback: `.bbg/telemetry/events.json` for legacy JSON-only telemetry

## Workflow

### Step 1: Check Data Source

Determine which telemetry backend is available:

```bash
# Check for SQLite database
ls -la .bbg/telemetry.db 2>/dev/null

# If no SQLite, check for JSON fallback
ls -la .bbg/telemetry/events.json 2>/dev/null
```
````

If SQLite exists, use it for all queries. If only JSON exists, parse the JSON file and present data in tabular format. If neither exists, inform the user and suggest running `bbg init` or initializing manually.

### Step 2: Choose Report Scope

Ask the user which area they want to investigate, or run a full dashboard:

| Scope                  | What It Shows                          | Table/View                                      |
| ---------------------- | -------------------------------------- | ----------------------------------------------- |
| **Workflow health**    | Event error rates, session stability   | `telemetry_events`, `v_session_summary`         |
| **Hook effectiveness** | Which hooks fire, false positive rates | `hook_hits`, `v_hook_effectiveness`             |
| **Quality gates**      | Pass/fail trends over time             | `gate_results`, `v_daily_gate_pass_rate`        |
| **Model routing**      | Token costs, latency, success rates    | `model_routes`, `v_model_route_efficiency`      |
| **Task flow**          | Phase durations, bottlenecks           | `task_lifecycle`, `v_task_flow_efficiency`      |
| **Tech decisions**     | Architecture decision timeline         | `decision_records`, `v_tech_evolution_timeline` |
| **Requirements**       | Spec churn, change frequency           | `requirement_changes`                           |
| **Planning**           | Plan progress, stalled plans           | `planning_events`                               |
| **Full dashboard**     | All of the above                       | All tables and views                            |

### Step 3: Query the Database

Run the appropriate queries using `sqlite3`:

```bash
# Example: Full dashboard summary
sqlite3 -header -column .bbg/telemetry.db "
  SELECT 'Sessions' AS metric, COUNT(*) AS value FROM sessions
  UNION ALL
  SELECT 'Events', COUNT(*) FROM telemetry_events
  UNION ALL
  SELECT 'Hook hits', COUNT(*) FROM hook_hits
  UNION ALL
  SELECT 'Gate checks', COUNT(*) FROM gate_results
  UNION ALL
  SELECT 'Model routes', COUNT(*) FROM model_routes
  UNION ALL
  SELECT 'Tasks tracked', COUNT(DISTINCT task_id) FROM task_lifecycle
  UNION ALL
  SELECT 'Decisions', COUNT(*) FROM decision_records
  UNION ALL
  SELECT 'Req changes', COUNT(*) FROM requirement_changes
  UNION ALL
  SELECT 'Plan events', COUNT(*) FROM planning_events;
"
```

For predefined reports, run individual queries from `.bbg/scripts/telemetry-report.sql`, or execute the full report file:

```bash
sqlite3 .bbg/telemetry.db < .bbg/scripts/telemetry-report.sql
```

### Step 4: Analyze Results

Interpret the data and identify actionable insights:

- **High error rates** (>10%) in `telemetry_events` → investigate failing workflows
- **Low hook effectiveness** (<70%) → review hook logic for over-triggering
- **Declining gate pass rates** → check if new code is meeting quality thresholds
- **High token usage** in `model_routes` → consider model routing optimizations
- **Tasks stuck in a phase** → identify blockers in the task lifecycle
- **Frequent requirement changes** → flag specification instability to the team
- **Stalled plans** (no activity >7 days) → review and either resume or close

### Step 5: Generate Summary

Present findings in a structured format:

```markdown
## Telemetry Dashboard — [Date]

### Health Score: [Good/Warning/Critical]

| Metric               | Value | Trend | Action                |
| -------------------- | ----- | ----- | --------------------- |
| Session success rate | 95%   | ↑     | None                  |
| Gate pass rate       | 87%   | ↓     | Review failing checks |
| Hook effectiveness   | 92%   | →     | OK                    |
| Avg model latency    | 1.2s  | ↑     | Monitor               |

### Key Findings

1. [Finding with data]
2. [Finding with data]

### Recommended Actions

1. [Action with specific query or file to investigate]
```

## Rules

- Always check for SQLite database first, fall back to JSON only if `.bbg/telemetry.db` does not exist
- Never modify the telemetry database during analysis — read-only queries only
- Present numbers with context: "87% pass rate (down from 93% last week)" not just "87%"
- Flag any metric crossing a threshold: error rate >10%, effectiveness <70%, stalled plans >7 days
- When showing raw SQL results, include the query so the user can re-run or modify it

## Anti-patterns

- Reporting raw numbers without interpretation — always explain what the data means
- Ignoring trends — a single snapshot is less useful than a trend over time
- Querying only one table — cross-reference multiple tables for deeper insight
- Modifying telemetry data during review — the dashboard is read-only

## Checklist

- [ ] Data source identified (SQLite or JSON fallback)
- [ ] Relevant scope selected for investigation
- [ ] Queries executed and results captured
- [ ] Data interpreted with actionable insights
- [ ] Summary generated with health score and recommendations

## Related

- **Commands**: [/telemetry-report](../../commands/telemetry-report.md)
- **Skills**: [eval-harness](../eval-harness/SKILL.md), [monitoring-patterns](../monitoring-patterns/SKILL.md)
- **Hooks**: [telemetry-collector](../../hooks/scripts/telemetry-collector.js)

````

- [ ] **Step 3: Verify the file**

Run: `wc -l skills/telemetry-dashboard/SKILL.md`
Expected: ~130-150 lines

- [ ] **Step 4: Commit**

```bash
git add skills/telemetry-dashboard/SKILL.md
git commit -m "feat: add telemetry-dashboard skill for observability analysis"
````

---

## Task 4: Create telemetry-report Command

**Files:**

- Create: `commands/telemetry-report.md`

- [ ] **Step 1: Create telemetry-report.md**

Create `commands/telemetry-report.md`:

```markdown
# /telemetry-report

## Description

Generate a telemetry report from the project's observability database. Queries `.bbg/telemetry.db` (SQLite) for workflow health, hook effectiveness, quality gate trends, model routing, task flow, and more.

## Usage
```

/telemetry-report
/telemetry-report --scope hooks
/telemetry-report --scope gates
/telemetry-report --scope models
/telemetry-report --scope tasks
/telemetry-report --scope decisions
/telemetry-report --scope requirements
/telemetry-report --scope planning
/telemetry-report --days 7
/telemetry-report --full

```

## Options
| Option | Default | Description |
|--------|---------|-------------|
| `--scope` | `summary` | Report scope: `summary`, `hooks`, `gates`, `models`, `tasks`, `decisions`, `requirements`, `planning` |
| `--days` | `30` | Number of days to include in time-based reports |
| `--full` | `false` | Run all 9 predefined reports |

## Process
1. **Check database** — Verify `.bbg/telemetry.db` exists; if not, check for `.bbg/telemetry/events.json` fallback
2. **Select scope** — Determine which reports to run based on `--scope` or `--full`
3. **Execute queries** — Run the appropriate queries from `.bbg/scripts/telemetry-report.sql` or the matching view
4. **Format output** — Present results in readable tables with headers
5. **Interpret** — Highlight anomalies, threshold violations, and trends

## Report Scopes

| Scope | Query Source | Description |
|-------|-------------|-------------|
| `summary` | Dashboard overview | Event counts, session stats, health score |
| `hooks` | Report 2, `v_hook_effectiveness` | Hook hit counts and false positive rates |
| `gates` | Report 3, `v_daily_gate_pass_rate` | Quality gate pass/fail trends |
| `models` | Report 4, `v_model_route_efficiency` | Token usage and latency per model |
| `tasks` | Report 6, `v_task_flow_efficiency` | Task phase durations and bottlenecks |
| `decisions` | Report 7, `v_tech_evolution_timeline` | Architecture decision timeline |
| `requirements` | Report 8 | Requirement change frequency and sources |
| `planning` | Report 9 | Plan progress and stalled plan detection |

## Output
A formatted telemetry report containing:
- Data tables for the selected scope
- Trend indicators (↑ improving, ↓ declining, → stable)
- Threshold alerts for metrics outside acceptable ranges
- Recommended actions based on the data

## Rules
- Read-only — never modify the telemetry database
- Always show the time range covered by the report
- Flag threshold violations: error rate >10%, hook effectiveness <70%, gate pass rate <80%
- If SQLite database is missing, provide instructions for initialization
- Include the raw SQL query for each report section so users can customize

## Examples
```

/telemetry-report # Summary dashboard
/telemetry-report --scope hooks # Hook effectiveness only
/telemetry-report --scope gates --days 7 # Last 7 days of gate results
/telemetry-report --full # All 9 reports

```

## Related

- **Skills**: [telemetry-dashboard](../skills/telemetry-dashboard/SKILL.md), [monitoring-patterns](../skills/monitoring-patterns/SKILL.md)
- **Hooks**: [telemetry-collector](../hooks/scripts/telemetry-collector.js)
```

- [ ] **Step 2: Verify the file**

Run: `wc -l commands/telemetry-report.md`
Expected: ~65-75 lines

- [ ] **Step 3: Commit**

```bash
git add commands/telemetry-report.md
git commit -m "feat: add /telemetry-report command definition"
```

---

## Task 5: Create telemetry-collector Hook Script

**Files:**

- Create: `hooks/scripts/telemetry-collector.js`

- [ ] **Step 1: Create telemetry-collector.js**

Create `hooks/scripts/telemetry-collector.js`:

```javascript
#!/usr/bin/env node

/**
 * telemetry-collector.js — Records telemetry events to SQLite database.
 * Called by other hooks and commands to track activity.
 *
 * Usage (from other hooks):
 *   node hooks/scripts/telemetry-collector.js <event_type> [json_details]
 *
 * Or pipe JSON via stdin:
 *   echo '{"event_type":"hook_fired","category":"security","details":{}}' | node hooks/scripts/telemetry-collector.js
 *
 * Silently succeeds if SQLite is unavailable — telemetry is non-blocking.
 */

import { access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BBG_DIR = join(process.cwd(), ".bbg");
const DB_PATH = join(BBG_DIR, "telemetry.db");
const SCHEMA_PATH = join(BBG_DIR, "scripts", "telemetry-init.sql");

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures the telemetry database exists. Initializes from schema if missing.
 * Returns true if the database is ready, false otherwise.
 */
async function ensureDatabase() {
  if (await fileExists(DB_PATH)) {
    return true;
  }

  if (!(await fileExists(SCHEMA_PATH))) {
    // No schema file available — cannot initialize
    return false;
  }

  try {
    await mkdir(BBG_DIR, { recursive: true });
    await execFileAsync("sqlite3", [DB_PATH, `.read ${SCHEMA_PATH}`]);
    return true;
  } catch {
    // SQLite not available or schema failed — telemetry is optional
    return false;
  }
}

/**
 * Inserts a telemetry event into the database.
 */
async function recordEvent({ event_type, category, session_id, status, duration_ms, details }) {
  const detailsJson = details ? JSON.stringify(details) : null;
  const sql = `
    INSERT INTO telemetry_events (event_type, category, session_id, status, duration_ms, details)
    VALUES ('${escape(event_type)}', '${escape(category || "general")}', ${sqlStr(session_id)}, '${escape(status || "ok")}', ${sqlNum(duration_ms)}, ${sqlStr(detailsJson)});
  `;

  try {
    await execFileAsync("sqlite3", [DB_PATH, sql]);
  } catch (err) {
    // Telemetry failures are non-blocking
    if (process.env.BBG_DEBUG) {
      console.error(`[telemetry] Failed to record event: ${err.message}`);
    }
  }
}

/**
 * Inserts a hook hit record.
 */
async function recordHookHit({ hook_name, action, false_positive, details }) {
  const detailsJson = details ? JSON.stringify(details) : null;
  const sql = `
    INSERT INTO hook_hits (hook_name, action, false_positive, details)
    VALUES ('${escape(hook_name)}', ${sqlStr(action)}, ${false_positive ? 1 : 0}, ${sqlStr(detailsJson)});
  `;

  try {
    await execFileAsync("sqlite3", [DB_PATH, sql]);
  } catch (err) {
    if (process.env.BBG_DEBUG) {
      console.error(`[telemetry] Failed to record hook hit: ${err.message}`);
    }
  }
}

/* --- SQL helpers (simple escaping for string literals) --- */

function escape(str) {
  if (str == null) return "";
  return String(str).replace(/'/g, "''");
}

function sqlStr(val) {
  return val == null ? "NULL" : `'${escape(val)}'`;
}

function sqlNum(val) {
  return val == null ? "NULL" : Number(val);
}

/* --- Input parsing --- */

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 1000);
  });
}

async function parseInput() {
  const args = process.argv.slice(2);

  // CLI argument mode: telemetry-collector.js <event_type> [json_details]
  if (args.length > 0) {
    const event_type = args[0];
    let details = null;
    if (args[1]) {
      try {
        details = JSON.parse(args[1]);
      } catch {
        details = { raw: args[1] };
      }
    }
    return { event_type, details };
  }

  // Stdin mode: pipe JSON
  const stdin = await readStdin();
  if (stdin.trim()) {
    try {
      return JSON.parse(stdin);
    } catch {
      return { event_type: "unknown", details: { raw: stdin.trim() } };
    }
  }

  return null;
}

/* --- Main --- */

async function main() {
  const dbReady = await ensureDatabase();
  if (!dbReady) {
    // Silently exit — telemetry is optional
    return;
  }

  const input = await parseInput();
  if (!input) {
    return;
  }

  if (input.hook_name) {
    await recordHookHit(input);
  } else if (input.event_type) {
    await recordEvent(input);
  }
}

main().catch((err) => {
  // Telemetry must never break the workflow
  if (process.env.BBG_DEBUG) {
    console.error(`[telemetry] Error: ${err.message}`);
  }
});
```

- [ ] **Step 2: Verify the file**

Run: `wc -l hooks/scripts/telemetry-collector.js`
Expected: ~155-170 lines

- [ ] **Step 3: Commit**

```bash
git add hooks/scripts/telemetry-collector.js
git commit -m "feat: add telemetry-collector hook script for event recording"
```

---

## Task 6: Register New Templates in governance.ts

**Files:**

- Modify: `src/templates/governance.ts:49-70` (add `"telemetry-dashboard"` to CORE_SKILLS)
- Modify: `src/templates/governance.ts:126-151` (add `"telemetry-report"` to CORE_COMMANDS)
- Modify: `src/templates/governance.ts:162-171` (add `"scripts/telemetry-collector.js"` to HOOK_FILES)
- Modify: `src/templates/governance.ts:172-176` (add new BBG_SCRIPTS array after HOOK_FILES)
- Modify: `src/templates/governance.ts:230-296` (add BBG Scripts section in buildGovernanceManifest)
- Modify: `src/templates/governance.ts:302-315` (export BBG_SCRIPTS in GOVERNANCE_MANIFEST)

- [ ] **Step 1: Write the failing test — verify new counts**

Open `tests/unit/templates/governance.test.ts` and update count assertions using **incremental deltas** from current values in the file. The changes are:

- CORE_SKILLS: **+1** (`"telemetry-dashboard"`)
- CORE_COMMANDS: **+1** (`"telemetry-report"`)
- HOOK_FILES: **+1** (`"scripts/telemetry-collector.js"`)
- New BBG_SCRIPTS section adds **+2** tasks (`.bbg/scripts/` files)
- Total delta for each tested scenario (core / TS / TS+Python): **+5**

In `tests/unit/templates/governance.test.ts`, make these edits:

**Edit 1:** Increment skills count assertion by **+1**.

Example: `39 -> 40`.

**Edit 2:** Increment commands count assertion by **+1**.

Example: `24 -> 25`.

**Edit 3:** Increment hooks count assertion by **+1**.

Example: `8 -> 9`.

**Edit 4:** Add BBG scripts assertion after MCP tasks assertion (after line 98), and update the total count **incrementally**:

```typescript
// Keep existing MCP assertions, then add:
// MCP configs: 2
const mcpTasks = tasks.filter((t) => t.destination.startsWith("mcp-configs/"));
expect(mcpTasks).toHaveLength(2);

// BBG scripts: 2
const bbgScriptTasks = tasks.filter((t) => t.destination.startsWith(".bbg/scripts/"));
expect(bbgScriptTasks).toHaveLength(2);
expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/telemetry-init.sql");
expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/telemetry-report.sql");

// Total: increment current core total assertion by +5
// Example: 97 -> 102
```

**Edit 5:** Update TypeScript total (line 135-136) by **+5**.

Example: `111 -> 116`.

**Edit 6:** Update TS+Python total (line 183-184) by **+5**.

Example: `124 -> 129`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/unit/templates/governance.test.ts`
Expected: FAIL — counts don't match because governance.ts hasn't been updated yet.

- [ ] **Step 3: Update governance.ts — add telemetry-dashboard to CORE_SKILLS**

In `src/templates/governance.ts`, add `"telemetry-dashboard"` at the end of the CORE_SKILLS array (after line 70, before the closing `]`):

```typescript
// Before:
  "autonomous-loops",
  "mcp-integration",
];

// After:
  "autonomous-loops",
  "mcp-integration",
  "telemetry-dashboard",
];
```

- [ ] **Step 4: Add telemetry-report to CORE_COMMANDS**

In `src/templates/governance.ts`, add `"telemetry-report"` at the end of the CORE_COMMANDS array (after line 151, before the closing `]`):

```typescript
// Before:
  "setup-pm",
  "sync",
];

// After:
  "setup-pm",
  "sync",
  "telemetry-report",
];
```

- [ ] **Step 5: Add telemetry-collector.js to HOOK_FILES**

In `src/templates/governance.ts`, add `"scripts/telemetry-collector.js"` to the HOOK_FILES array (after line 170, before the closing `]`):

```typescript
// Before:
  "scripts/security-scan.js",
  "scripts/suggest-compact.js",
];

// After:
  "scripts/security-scan.js",
  "scripts/suggest-compact.js",
  "scripts/telemetry-collector.js",
];
```

- [ ] **Step 6: Add BBG_SCRIPTS array and template source directory**

In `src/templates/governance.ts`, add the BBG_SCRIPTS array after HOOK_FILES (after the `];` on what was line 171, before `const CONTEXT_HBS_FILES`):

```typescript
// Before:
const HOOK_FILES = [
  "hooks.json",
  "README.md",
  "scripts/session-start.js",
  "scripts/session-end.js",
  "scripts/pre-edit-check.js",
  "scripts/post-edit-typecheck.js",
  "scripts/security-scan.js",
  "scripts/suggest-compact.js",
  "scripts/telemetry-collector.js",
];

const CONTEXT_HBS_FILES = ["dev.md", "review.md", "research.md"];

// After:
const HOOK_FILES = [
  "hooks.json",
  "README.md",
  "scripts/session-start.js",
  "scripts/session-end.js",
  "scripts/pre-edit-check.js",
  "scripts/post-edit-typecheck.js",
  "scripts/security-scan.js",
  "scripts/suggest-compact.js",
  "scripts/telemetry-collector.js",
];

const BBG_SCRIPTS = ["telemetry-init.sql", "telemetry-report.sql"];

const CONTEXT_HBS_FILES = ["dev.md", "review.md", "research.md"];
```

- [ ] **Step 7: Add BBG Scripts section in buildGovernanceManifest**

In `src/templates/governance.ts`, add the BBG Scripts loop inside `buildGovernanceManifest()`, after the MCP Configs section and before the `return` statement:

```typescript
// Before:
// --- MCP Configs ---
for (const mcpFile of MCP_CONFIG_FILES) {
  tasks.push(copyTask(`mcp-configs/${mcpFile}`, `mcp-configs/${mcpFile}`));
}

return mergePluginTemplates(tasks, plugins ?? []);

// After:
// --- MCP Configs ---
for (const mcpFile of MCP_CONFIG_FILES) {
  tasks.push(copyTask(`mcp-configs/${mcpFile}`, `mcp-configs/${mcpFile}`));
}

// --- BBG Scripts ---
for (const script of BBG_SCRIPTS) {
  tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
}

return mergePluginTemplates(tasks, plugins ?? []);
```

- [ ] **Step 8: Export BBG_SCRIPTS in GOVERNANCE_MANIFEST**

In `src/templates/governance.ts`, add `bbgScripts` to the GOVERNANCE_MANIFEST export:

```typescript
// Before:
export const GOVERNANCE_MANIFEST = {
  coreAgents: CORE_AGENTS,
  languageAgents: LANGUAGE_AGENTS,
  coreSkills: CORE_SKILLS,
  operationsSkills: OPERATIONS_SKILLS,
  languageSkills: LANGUAGE_SKILLS,
  commonRules: COMMON_RULES,
  languageRules: LANGUAGE_RULES,
  coreCommands: CORE_COMMANDS,
  languageCommands: LANGUAGE_COMMANDS,
  hookFiles: HOOK_FILES,
  contextHbsFiles: CONTEXT_HBS_FILES,
  mcpConfigFiles: MCP_CONFIG_FILES,
} as const;

// After:
export const GOVERNANCE_MANIFEST = {
  coreAgents: CORE_AGENTS,
  languageAgents: LANGUAGE_AGENTS,
  coreSkills: CORE_SKILLS,
  operationsSkills: OPERATIONS_SKILLS,
  languageSkills: LANGUAGE_SKILLS,
  commonRules: COMMON_RULES,
  languageRules: LANGUAGE_RULES,
  coreCommands: CORE_COMMANDS,
  languageCommands: LANGUAGE_COMMANDS,
  hookFiles: HOOK_FILES,
  bbgScripts: BBG_SCRIPTS,
  contextHbsFiles: CONTEXT_HBS_FILES,
  mcpConfigFiles: MCP_CONFIG_FILES,
} as const;
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test -- tests/unit/templates/governance.test.ts`
Expected: ALL PASS — all count assertions match.

- [ ] **Step 10: Commit**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register telemetry templates in governance manifest"
```

---

## Task 7: Add telemetry.db to Gitignore Entries

**Files:**

- Modify: `src/constants.ts:24-25` (add new constant)
- Modify: `src/commands/init-gitignore.ts:40-47` (include telemetry.db in managed entries)

- [ ] **Step 1: Add the constant to src/constants.ts**

In `src/constants.ts`, add a new constant after the existing gitignore block markers:

```typescript
// Before:
export const MANAGED_GITIGNORE_BLOCK_START = "# >>> bbg managed repos >>>";
export const MANAGED_GITIGNORE_BLOCK_END = "# <<< bbg managed repos <<<";

// After:
export const MANAGED_GITIGNORE_BLOCK_START = "# >>> bbg managed repos >>>";
export const MANAGED_GITIGNORE_BLOCK_END = "# <<< bbg managed repos <<<";

/** Entries that bbg always adds to the project .gitignore (outside the managed block). */
export const BBG_GITIGNORE_ENTRIES = [".bbg/telemetry.db", ".bbg/telemetry.db-wal", ".bbg/telemetry.db-shm"] as const;
```

- [ ] **Step 2: Update init-gitignore.ts to include BBG entries**

In `src/commands/init-gitignore.ts`, import the new constant and add the entries before the managed block:

```typescript
// Before:
import { MANAGED_GITIGNORE_BLOCK_START, MANAGED_GITIGNORE_BLOCK_END } from "../constants.js";

// After:
import { MANAGED_GITIGNORE_BLOCK_START, MANAGED_GITIGNORE_BLOCK_END, BBG_GITIGNORE_ENTRIES } from "../constants.js";
```

Then update the `ensureRootGitignore` function to ensure the BBG entries are present:

```typescript
// Before:
const managedEntries = buildRepoIgnoreEntries(repos);
if (managedEntries.length > 0) {
  if (lines.length > 0) {
    lines.push("");
  }

  lines.push(MANAGED_GITIGNORE_BLOCK_START, ...managedEntries, MANAGED_GITIGNORE_BLOCK_END);
}

// After:
// Ensure bbg infrastructure entries are present (idempotent)
for (const entry of BBG_GITIGNORE_ENTRIES) {
  if (!lines.some((l) => l.trim() === entry)) {
    lines.push(entry);
  }
}

const managedEntries = buildRepoIgnoreEntries(repos);
if (managedEntries.length > 0) {
  if (lines.length > 0) {
    lines.push("");
  }

  lines.push(MANAGED_GITIGNORE_BLOCK_START, ...managedEntries, MANAGED_GITIGNORE_BLOCK_END);
}
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add src/constants.ts src/commands/init-gitignore.ts
git commit -m "feat: add .bbg/telemetry.db to managed gitignore entries"
```

---

## Task 8: Verify Self-Checks and Full Integration

**Files:**

- Verify: `src/doctor/self-checks.ts` (reads GOVERNANCE_MANIFEST — ensure bbgScripts doesn't break it)
- Run: Full test suite + build + typecheck

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors. The `self-checks.ts` file reads `GOVERNANCE_MANIFEST` but only checks agents, skills, rules, commands, and hooks — the new `bbgScripts` property is exported but not yet consumed by self-checks (it's `as const` so TypeScript is happy). The `.bbg/scripts/` files don't match any of the fast-glob patterns in `checkNoOrphanFiles` (`agents/*.md`, `skills/*/SKILL.md`, `rules/**/*.md`, `commands/*.md`) so they won't be flagged as orphans.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Verify all new files exist**

Run:

```bash
ls -la templates/generic/.bbg/scripts/telemetry-init.sql
ls -la templates/generic/.bbg/scripts/telemetry-report.sql
ls -la skills/telemetry-dashboard/SKILL.md
ls -la commands/telemetry-report.md
ls -la hooks/scripts/telemetry-collector.js
```

Expected: All 5 files exist

- [ ] **Step 5: Final commit (if any remaining changes)**

```bash
git add -A
git status
# Only commit if there are unstaged changes
git commit -m "chore: phase 2 telemetry observability — final verification"
```

---

## Summary

| Task | Files                                                 | What It Does                                             |
| ---- | ----------------------------------------------------- | -------------------------------------------------------- |
| 1    | `templates/generic/.bbg/scripts/telemetry-init.sql`   | SQLite DDL: 9 tables, 13 indexes, 6 views                |
| 2    | `templates/generic/.bbg/scripts/telemetry-report.sql` | 9 predefined report queries with formatted output        |
| 3    | `skills/telemetry-dashboard/SKILL.md`                 | Dashboard skill for querying and analyzing telemetry     |
| 4    | `commands/telemetry-report.md`                        | `/telemetry-report` command definition                   |
| 5    | `hooks/scripts/telemetry-collector.js`                | Event collection hook with SQLite auto-init              |
| 6    | `src/templates/governance.ts` + test                  | Register all new content in manifest + update counts     |
| 7    | `src/constants.ts` + `init-gitignore.ts`              | Add `.bbg/telemetry.db` to gitignore                     |
| 8    | —                                                     | Full integration verification (typecheck + test + build) |

**Total new governance content:** 5 files
**Total `src/` modifications:** 4 files (governance.ts, governance.test.ts, constants.ts, init-gitignore.ts)
**Count impact summary:** +5 tasks from prior baseline (core / TS / TS+Python)
