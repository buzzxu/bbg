-- =============================================================================
-- policy-schema.sql - BBG Policy Enforcement Schema
-- 2 tables + 1 view for policy decision audit trail and exception management.
-- Run: sqlite3 .bbg/telemetry.db < .bbg/scripts/policy-schema.sql
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Policy Decision Audit Trail
-- ---------------------------------------------------------------------------

-- Every policy evaluation is recorded here for audit and effectiveness analysis.
CREATE TABLE IF NOT EXISTS policy_decisions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (datetime('now')),
  session_id    TEXT,
  operation     TEXT    NOT NULL,
  target        TEXT,
  risk_level    TEXT    NOT NULL,
  action_taken  TEXT    NOT NULL,
  approved      INTEGER,
  exception_id  TEXT,
  reason        TEXT
);

-- ---------------------------------------------------------------------------
-- Policy Exceptions
-- ---------------------------------------------------------------------------

-- Time-limited exceptions to policy rules, granted by humans.
CREATE TABLE IF NOT EXISTS policy_exceptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (datetime('now')),
  exception_id  TEXT    NOT NULL,
  policy_rule   TEXT    NOT NULL,
  target        TEXT,
  reason        TEXT    NOT NULL,
  granted_by    TEXT,
  expires_at    TEXT,
  used          INTEGER DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Policy Effectiveness Analysis
-- ---------------------------------------------------------------------------

-- Aggregated view for analyzing how well policies are working.
CREATE VIEW IF NOT EXISTS v_policy_effectiveness AS
SELECT
  risk_level,
  action_taken,
  COUNT(*) AS total,
  SUM(CASE WHEN approved = 0 THEN 1 ELSE 0 END) AS rejected_after_approval,
  SUM(CASE WHEN exception_id IS NOT NULL THEN 1 ELSE 0 END) AS with_exception
FROM policy_decisions
GROUP BY risk_level, action_taken;
