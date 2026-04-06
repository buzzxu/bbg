-- =============================================================================
-- workflow-schema.sql -- BBG Workflow Orchestration Schema
-- 2 tables + 2 views for tracking workflow execution, step progress, and
-- identifying bottlenecks.
-- Run: sqlite3 .bbg/telemetry.db < .bbg/scripts/workflow-schema.sql
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Workflow instances -- one row per workflow execution
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflow_instances (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id       TEXT    NOT NULL UNIQUE,
  definition        TEXT    NOT NULL,
  task_id           TEXT,
  started_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at      TEXT,
  status            TEXT    NOT NULL DEFAULT 'pending',
  current_step      TEXT,
  session_id        TEXT,
  total_steps       INTEGER,
  completed_steps   INTEGER DEFAULT 0,
  total_duration_ms INTEGER
);

-- ---------------------------------------------------------------------------
-- Workflow steps -- one row per step execution within a workflow
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflow_steps (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id    TEXT    NOT NULL REFERENCES workflow_instances(workflow_id),
  step_id        TEXT    NOT NULL,
  agent          TEXT,
  status         TEXT    NOT NULL DEFAULT 'pending',
  started_at     TEXT,
  completed_at   TEXT,
  duration_ms    INTEGER,
  retries        INTEGER DEFAULT 0,
  failure_reason TEXT,
  outputs        TEXT
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_wi_status     ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_wi_definition ON workflow_instances(definition);
CREATE INDEX IF NOT EXISTS idx_wi_session    ON workflow_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_ws_workflow   ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_ws_status     ON workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_ws_agent      ON workflow_steps(agent);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS v_workflow_efficiency AS
SELECT
  wi.definition,
  COUNT(*)                                                   AS total_runs,
  SUM(CASE WHEN wi.status = 'completed' THEN 1 ELSE 0 END)  AS completed,
  ROUND(
    100.0 * SUM(CASE WHEN wi.status = 'completed' THEN 1 ELSE 0 END)
    / COUNT(*),
    1
  )                                                          AS completion_rate,
  AVG(wi.total_duration_ms)                                  AS avg_duration_ms
FROM workflow_instances wi
GROUP BY wi.definition;

CREATE VIEW IF NOT EXISTS v_step_bottlenecks AS
SELECT
  wi.definition,
  ws.step_id,
  ws.agent,
  COUNT(*)            AS executions,
  AVG(ws.duration_ms) AS avg_duration_ms,
  SUM(ws.retries)     AS total_retries
FROM workflow_steps ws
JOIN workflow_instances wi ON ws.workflow_id = wi.workflow_id
GROUP BY wi.definition, ws.step_id, ws.agent
ORDER BY avg_duration_ms DESC;
