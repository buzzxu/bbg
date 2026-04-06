-- =============================================================================
-- red-team-schema.sql -- BBG Red Team Testing Schema
-- 3 tables + 2 views for tracking red team rounds, findings, and attack chains.
-- Conditional: only deployed for backend projects.
-- Run: sqlite3 .bbg/telemetry.db < .bbg/scripts/red-team-schema.sql
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Red team rounds
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS red_team_rounds (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp          TEXT    NOT NULL DEFAULT (datetime('now')),
  session_id         TEXT,
  workflow_id        TEXT,
  round_number       INTEGER NOT NULL,
  round_type         TEXT    NOT NULL,
  endpoints_checked  INTEGER,
  categories_checked INTEGER,
  findings_total     INTEGER DEFAULT 0,
  findings_critical  INTEGER DEFAULT 0,
  findings_high      INTEGER DEFAULT 0,
  findings_medium    INTEGER DEFAULT 0,
  findings_low       INTEGER DEFAULT 0,
  verdict            TEXT,
  report_path        TEXT,
  duration_ms        INTEGER
);

-- ---------------------------------------------------------------------------
-- Red team findings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS red_team_findings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id   INTEGER NOT NULL REFERENCES red_team_rounds(id),
  finding_id TEXT    NOT NULL,
  attack_id  TEXT    NOT NULL,
  domain     TEXT    NOT NULL,
  endpoint   TEXT,
  severity   TEXT    NOT NULL,
  score      REAL,
  title      TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'open',
  fixed_at   TEXT,
  details    TEXT
);

-- ---------------------------------------------------------------------------
-- Red team chains
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS red_team_chains (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id      INTEGER NOT NULL REFERENCES red_team_rounds(id),
  chain_id      TEXT    NOT NULL,
  title         TEXT    NOT NULL,
  steps         TEXT    NOT NULL,
  preconditions TEXT,
  impact        TEXT,
  mitigation    TEXT,
  status        TEXT    NOT NULL DEFAULT 'open'
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_rtr_session  ON red_team_rounds(session_id);
CREATE INDEX IF NOT EXISTS idx_rtr_workflow ON red_team_rounds(workflow_id);
CREATE INDEX IF NOT EXISTS idx_rtr_type     ON red_team_rounds(round_type);
CREATE INDEX IF NOT EXISTS idx_rtf_round    ON red_team_findings(round_id);
CREATE INDEX IF NOT EXISTS idx_rtf_domain   ON red_team_findings(domain);
CREATE INDEX IF NOT EXISTS idx_rtf_severity ON red_team_findings(severity);
CREATE INDEX IF NOT EXISTS idx_rtf_status   ON red_team_findings(status);
CREATE INDEX IF NOT EXISTS idx_rtc_round    ON red_team_chains(round_id);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS v_red_team_trend AS
SELECT
  date(timestamp)                                        AS day,
  round_type,
  COUNT(*)                                               AS total_rounds,
  AVG(findings_critical + findings_high)                 AS avg_critical_high,
  SUM(CASE WHEN verdict = 'PASS' THEN 1 ELSE 0 END)     AS pass_count,
  SUM(CASE WHEN verdict = 'BLOCK' THEN 1 ELSE 0 END)    AS block_count
FROM red_team_rounds
GROUP BY day, round_type;

CREATE VIEW IF NOT EXISTS v_attack_domain_heatmap AS
SELECT
  domain,
  severity,
  COUNT(*)                                                        AS finding_count,
  SUM(CASE WHEN status IN ('open', 'mitigated') THEN 1 ELSE 0 END) AS unresolved
FROM red_team_findings
GROUP BY domain, severity
ORDER BY finding_count DESC;
