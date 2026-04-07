-- hermes-schema.sql -- Local Hermes runtime / evaluation / candidate schema

-- Existing Hermes databases need a one-time migration before the K7A distillation
-- fields are available on hermes_candidates. Apply the following statements after
-- backing up the database:
--
-- ALTER TABLE hermes_candidates ADD COLUMN draft_kind TEXT;
-- ALTER TABLE hermes_candidates ADD COLUMN draft_path TEXT;
-- ALTER TABLE hermes_candidates ADD COLUMN distilled_at TEXT;
--
-- ALTER TABLE alone is insufficient for upgraded installs because the old status CHECK still blocks distilled.
-- Upgraded installs must rebuild or export-import hermes_candidates from the latest schema before using K7A local distillation workflows.

CREATE TABLE IF NOT EXISTS hermes_runs (
  run_id            TEXT PRIMARY KEY,
  task_type         TEXT NOT NULL,
  task_ref          TEXT,
  project_scope     TEXT NOT NULL DEFAULT 'local' CHECK (project_scope IN ('local')),
  agent_used        TEXT,
  skill_used        TEXT,
  workflow_used     TEXT,
  input_ref         TEXT,
  status            TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'cancelled')),
  error_kind        TEXT,
  started_at        TEXT NOT NULL,
  ended_at          TEXT
);

CREATE TABLE IF NOT EXISTS hermes_run_artifacts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id            TEXT NOT NULL,
  artifact_type     TEXT NOT NULL,
  artifact_ref      TEXT NOT NULL,
  content_hash      TEXT,
  provenance_kind   TEXT NOT NULL CHECK (provenance_kind IN ('input', 'output', 'derived', 'reference')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES hermes_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hermes_evaluations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id            TEXT NOT NULL UNIQUE,
  correctness       TEXT NOT NULL CHECK (correctness IN ('fail', 'partial', 'pass')),
  quality           TEXT NOT NULL CHECK (quality IN ('low', 'medium', 'high')),
  reproducibility   TEXT NOT NULL CHECK (reproducibility IN ('low', 'medium', 'high')),
  regression_risk   TEXT NOT NULL CHECK (regression_risk IN ('low', 'medium', 'high')),
  reuse_potential   TEXT NOT NULL CHECK (reuse_potential IN ('low', 'medium', 'high')),
  confidence        TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  evaluated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES hermes_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hermes_candidates (
  candidate_id      TEXT PRIMARY KEY,
  source_run_id     TEXT NOT NULL,
  -- K7A only distills wiki/process drafts. Other candidate types remain reserved for later phases, even though the broader taxonomy stays available here.
  candidate_type    TEXT NOT NULL CHECK (candidate_type IN ('wiki', 'skill', 'rule', 'workflow', 'eval', 'memory')),
  draft_kind       TEXT CHECK (draft_kind IN ('wiki', 'process')),
  draft_path       TEXT,
  proposed_target   TEXT,
  rationale         TEXT,
  confidence        TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'distilled', 'local_only', 'rejected', 'superseded')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  distilled_at     TEXT,
  reviewed_at       TEXT,
  FOREIGN KEY (source_run_id) REFERENCES hermes_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hermes_candidate_evidence (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id      TEXT NOT NULL,
  evidence_kind     TEXT NOT NULL,
  evidence_ref      TEXT NOT NULL,
  linked_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (candidate_id) REFERENCES hermes_candidates(candidate_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hermes_runs_status ON hermes_runs(status);
CREATE INDEX IF NOT EXISTS idx_hermes_run_artifacts_run_id ON hermes_run_artifacts(run_id);
CREATE INDEX IF NOT EXISTS idx_hermes_evaluations_run_id ON hermes_evaluations(run_id);
CREATE INDEX IF NOT EXISTS idx_hermes_candidates_source_run_id ON hermes_candidates(source_run_id);
CREATE INDEX IF NOT EXISTS idx_hermes_candidates_status ON hermes_candidates(status);
CREATE INDEX IF NOT EXISTS idx_hermes_candidates_type ON hermes_candidates(candidate_type);
CREATE INDEX IF NOT EXISTS idx_hermes_candidate_evidence_candidate_id ON hermes_candidate_evidence(candidate_id);
