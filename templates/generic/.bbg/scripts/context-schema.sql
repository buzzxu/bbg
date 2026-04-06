-- =============================================================================
-- context-schema.sql - BBG Context Engineering Schema
-- 3 tables + 1 view for context load tracking, session decisions, and file
-- associations. Run idempotently:
--   sqlite3 .bbg/telemetry.db < .bbg/scripts/context-schema.sql
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS context_loads (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp         TEXT    NOT NULL DEFAULT (datetime('now')),
  session_id        TEXT,
  task_type         TEXT,
  files_loaded      INTEGER,
  symbols_loaded    INTEGER,
  tokens_estimated  INTEGER,
  budget_limit      INTEGER,
  budget_used_pct   REAL,
  strategy          TEXT
);

CREATE INDEX IF NOT EXISTS idx_context_loads_session ON context_loads(session_id);
CREATE INDEX IF NOT EXISTS idx_context_loads_task ON context_loads(task_type);

CREATE TABLE IF NOT EXISTS session_decisions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp         TEXT    NOT NULL DEFAULT (datetime('now')),
  session_id        TEXT    NOT NULL,
  task_id           TEXT,
  step              TEXT    NOT NULL,
  decision          TEXT    NOT NULL,
  reason            TEXT,
  outcome           TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_decisions_sid ON session_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_decisions_task ON session_decisions(task_id);

CREATE TABLE IF NOT EXISTS file_associations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path         TEXT    NOT NULL,
  entity_type       TEXT    NOT NULL,
  entity_id         TEXT    NOT NULL,
  relation          TEXT    NOT NULL,
  timestamp         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_file_assoc_path ON file_associations(file_path);
CREATE INDEX IF NOT EXISTS idx_file_assoc_entity ON file_associations(entity_type, entity_id);

CREATE VIEW IF NOT EXISTS v_context_efficiency AS
SELECT
  task_type,
  AVG(files_loaded) AS avg_files,
  AVG(tokens_estimated) AS avg_tokens,
  AVG(budget_used_pct) AS avg_budget_usage,
  COUNT(*) AS total_loads
FROM context_loads
GROUP BY task_type;
