-- =============================================================================
-- telemetry-init.sql - BBG Observability Schema
-- Creates 9 tables + 6 views for AI tool observation and project intelligence.
-- Run once per project: sqlite3 .bbg/telemetry.db < .bbg/scripts/telemetry-init.sql
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- AI Tool Observation (5 tables)
-- ---------------------------------------------------------------------------

-- Core event table - every observable action becomes a row here.
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

-- Hook trigger records - which hooks fired and whether they were useful.
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

-- Requirement/task lifecycle - tracks tasks through phases.
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

-- Requirement evolution - captures changes to specs over time.
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

-- Planning events - plan creation, phase transitions, completion tracking.
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

-- Daily quality gate pass rate - trend line for CI/governance health.
CREATE VIEW IF NOT EXISTS v_daily_gate_pass_rate AS
SELECT
  date(timestamp) AS day,
  COUNT(*)        AS total_checks,
  SUM(passed)     AS passed,
  ROUND(100.0 * SUM(passed) / COUNT(*), 1) AS pass_rate_pct
FROM gate_results
GROUP BY date(timestamp)
ORDER BY day DESC;

-- Hook effectiveness - which hooks fire most and how often they're false positives.
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

-- Session summary - duration, event count, and status per session.
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

-- Task flow efficiency - time spent in each phase per task.
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

-- Tech evolution timeline - decision records ordered chronologically.
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

-- Model routing efficiency - cost and latency per model/task combination.
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
