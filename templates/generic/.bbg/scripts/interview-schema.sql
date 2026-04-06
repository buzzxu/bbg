-- Deep Interview Module Schema
-- Initialized by session-start.js hook (idempotent)

CREATE TABLE IF NOT EXISTS interview_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  interview_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL,
  profile TEXT NOT NULL,
  topic TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  rounds INTEGER DEFAULT 0,
  initial_ambiguity REAL DEFAULT 1.0,
  final_ambiguity REAL,
  threshold REAL NOT NULL,
  spec_path TEXT,
  transcript_path TEXT
);

CREATE TABLE IF NOT EXISTS interview_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  interview_id TEXT NOT NULL REFERENCES interview_sessions(interview_id),
  round_num INTEGER NOT NULL,
  target_dimension TEXT NOT NULL,
  lens_used TEXT,
  question TEXT NOT NULL,
  answer TEXT,
  ambiguity_before REAL,
  ambiguity_after REAL,
  dimension_scores TEXT,
  pressure_type TEXT
);

CREATE TABLE IF NOT EXISTS interview_assumptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  interview_id TEXT NOT NULL,
  assumption TEXT NOT NULL,
  status TEXT NOT NULL,
  verified_at TEXT,
  evidence TEXT
);

CREATE VIEW IF NOT EXISTS v_interview_effectiveness AS
SELECT
  profile,
  COUNT(*) AS total_sessions,
  AVG(rounds) AS avg_rounds,
  AVG(initial_ambiguity - final_ambiguity) AS avg_ambiguity_reduction,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
FROM interview_sessions
GROUP BY profile;
