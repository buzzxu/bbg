-- ============================================================
-- BBG Organization-Level Governance -- Reserved SQLite Tables
-- ============================================================
-- Status: RESERVED -- These tables are created for forward
-- compatibility but are not populated by any runtime code yet.
--
-- These tables will be used when organization-level governance
-- is fully implemented to track policy synchronization events
-- and aggregate cross-repo report snapshots.
-- ============================================================

-- Organization-level policy sync records (reserved)
CREATE TABLE IF NOT EXISTS org_policy_syncs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp   TEXT    NOT NULL DEFAULT (datetime('now')),
  org_id      TEXT    NOT NULL,
  policy_hash TEXT    NOT NULL,
  source      TEXT,
  status      TEXT    NOT NULL,
  details     TEXT
);

-- Organization-level report snapshots (reserved)
CREATE TABLE IF NOT EXISTS org_report_snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp   TEXT    NOT NULL DEFAULT (datetime('now')),
  org_id      TEXT    NOT NULL,
  project_id  TEXT    NOT NULL,
  report_type TEXT    NOT NULL,
  data        TEXT    NOT NULL
);
