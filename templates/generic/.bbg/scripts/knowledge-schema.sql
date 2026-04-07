-- =============================================================================
-- knowledge-schema.sql -- BBG Knowledge Metadata and Trust Schema
-- Markdown remains canonical in docs/raw/ and docs/wiki/. This schema provides
-- a structured helper index for provenance, freshness, contradictions,
-- summaries, query history, and candidate promotions.
-- =============================================================================

-- Existing K3/K4 databases need a one-time migration before these new fields
-- are available. Keep the base schema idempotent for fresh initialization, and
-- use the following statements manually after backing up an existing database:
--
-- ALTER TABLE knowledge_sources ADD COLUMN last_seen_hash TEXT;
-- ALTER TABLE knowledge_sources ADD COLUMN freshness_status TEXT NOT NULL DEFAULT 'current';
-- ALTER TABLE knowledge_sources ADD COLUMN last_checked_at TEXT;
-- ALTER TABLE knowledge_pages ADD COLUMN freshness_status TEXT NOT NULL DEFAULT 'current';
-- ALTER TABLE knowledge_pages ADD COLUMN summary_level TEXT NOT NULL DEFAULT 'L2';
-- ALTER TABLE knowledge_pages ADD COLUMN stale_reason TEXT;

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  path              TEXT    NOT NULL UNIQUE,
  source_type       TEXT    NOT NULL,
  title             TEXT,
  content_hash      TEXT,
  last_seen_hash    TEXT,
  status            TEXT    NOT NULL DEFAULT 'active',
  freshness_status  TEXT    NOT NULL DEFAULT 'current',
  ingested_at       TEXT,
  last_checked_at   TEXT,
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_pages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  path              TEXT    NOT NULL UNIQUE,
  page_type         TEXT    NOT NULL,
  title             TEXT    NOT NULL,
  status            TEXT    NOT NULL DEFAULT 'active',
  source_count      INTEGER NOT NULL DEFAULT 0,
  last_updated      TEXT,
  freshness_status  TEXT    NOT NULL DEFAULT 'current',
  summary_level     TEXT    NOT NULL DEFAULT 'L2',
  stale_reason      TEXT,
  indexed_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_page_sources (
  page_id       INTEGER NOT NULL,
  source_id     INTEGER NOT NULL,
  linked_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (page_id, source_id),
  FOREIGN KEY (page_id) REFERENCES knowledge_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_lint_findings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  finding_type  TEXT    NOT NULL,
  path          TEXT    NOT NULL,
  severity      TEXT    NOT NULL,
  message       TEXT    NOT NULL,
  detected_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at   TEXT
);

CREATE TABLE IF NOT EXISTS knowledge_contradictions (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  page_a_path        TEXT    NOT NULL,
  page_b_path        TEXT    NOT NULL,
  issue_type         TEXT    NOT NULL,
  resolution_status  TEXT    NOT NULL DEFAULT 'open',
  detected_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at        TEXT
);

CREATE TABLE IF NOT EXISTS knowledge_page_summaries (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  page_path          TEXT    NOT NULL,
  summary_level      TEXT    NOT NULL,
  content            TEXT    NOT NULL,
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(page_path, summary_level)
);

CREATE TABLE IF NOT EXISTS knowledge_query_history (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  question           TEXT    NOT NULL,
  matched_pages      TEXT,
  response_kind      TEXT    NOT NULL,
  promoted           INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_candidate_updates (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  source_kind        TEXT    NOT NULL,
  source_ref         TEXT    NOT NULL,
  proposed_page_path TEXT,
  status             TEXT    NOT NULL DEFAULT 'pending',
  rationale          TEXT,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  reviewed_at        TEXT
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_status ON knowledge_sources(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_type ON knowledge_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_lint_findings_type ON knowledge_lint_findings(finding_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_contradictions_status ON knowledge_contradictions(resolution_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_page_summaries_level ON knowledge_page_summaries(summary_level);
CREATE INDEX IF NOT EXISTS idx_knowledge_candidate_updates_status ON knowledge_candidate_updates(status);

-- Hermes runtime, evaluation, and candidate records live in `hermes-schema.sql`.
-- Keep that schema separate from canonical knowledge and trust metadata so
-- operational learning records can evolve without overloading wiki/trust tables.
