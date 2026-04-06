-- BBG Eval/Benchmark Schema
-- Tracks golden task evaluation runs and per-task results for regression comparison.
-- This file is deployed by `bbg init` and executed by eval/telemetry workflow steps
-- against .bbg/telemetry.db (created by the telemetry module).

CREATE TABLE IF NOT EXISTS eval_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (datetime('now')),
  run_id        TEXT    NOT NULL UNIQUE,
  harness_version TEXT,
  task_set      TEXT    NOT NULL,
  model         TEXT,
  total_tasks   INTEGER NOT NULL,
  passed        INTEGER NOT NULL,
  failed        INTEGER NOT NULL,
  skipped       INTEGER DEFAULT 0,
  duration_ms   INTEGER,
  config_snapshot TEXT
);

CREATE TABLE IF NOT EXISTS eval_task_results (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id        TEXT    NOT NULL REFERENCES eval_runs(run_id),
  task_id       TEXT    NOT NULL,
  task_title    TEXT,
  category      TEXT,
  status        TEXT    NOT NULL,  -- 'pass' | 'fail' | 'partial' | 'skip' | 'error'
  score         REAL,
  duration_ms   INTEGER,
  tokens_used   INTEGER,
  iterations    INTEGER,
  failure_reason TEXT,
  grader_output TEXT
);

CREATE VIEW IF NOT EXISTS v_eval_version_compare AS
SELECT r.harness_version, r.model, r.task_set,
  COUNT(t.id) AS total_tasks,
  ROUND(100.0 * SUM(CASE WHEN t.status = 'pass' THEN 1 ELSE 0 END) / COUNT(t.id), 1) AS pass_rate,
  ROUND(AVG(t.score) * 100, 1) AS avg_score,
  SUM(t.tokens_used) AS total_tokens,
  AVG(t.iterations) AS avg_iterations
FROM eval_runs r JOIN eval_task_results t ON r.run_id = t.run_id
GROUP BY r.harness_version, r.model, r.task_set;
