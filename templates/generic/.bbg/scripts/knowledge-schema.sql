-- =============================================================================
-- knowledge-schema.sql -- BBG Knowledge Metadata Schema
-- Markdown remains canonical in docs/raw/ and docs/wiki/. This schema provides
-- a structured helper index for future ingest, lint, and compilation workflows.
-- =============================================================================

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  path          TEXT    NOT NULL UNIQUE,
  source_type   TEXT    NOT NULL,
  title         TEXT,
  content_hash  TEXT,
  status        TEXT    NOT NULL DEFAULT 'active',
  ingested_at   TEXT,
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_pages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  path          TEXT    NOT NULL UNIQUE,
  page_type     TEXT    NOT NULL,
  title         TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'active',
  source_count  INTEGER NOT NULL DEFAULT 0,
  last_updated  TEXT,
  indexed_at    TEXT    NOT NULL DEFAULT (datetime('now'))
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

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_status ON knowledge_sources(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_type ON knowledge_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_lint_findings_type ON knowledge_lint_findings(finding_type);
