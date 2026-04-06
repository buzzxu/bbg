-- =============================================================================
-- telemetry-report.sql - BBG Predefined Report Queries
-- 9 reports for AI workflow observability and project intelligence.
-- Usage: sqlite3 .bbg/telemetry.db < .bbg/scripts/telemetry-report.sql
-- Or run individual sections by copying the query you need.
-- =============================================================================

-- =============================================
-- Report 1: Workflow Stability Report
-- Shows event distribution, error rates, and session health over the last 30 days.
-- =============================================
.headers on
.mode column
.print '=== Report 1: Workflow Stability (Last 30 Days) ==='
.print ''

SELECT
  date(timestamp)           AS day,
  COUNT(*)                  AS total_events,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors,
  SUM(CASE WHEN status = 'ok'    THEN 1 ELSE 0 END) AS successes,
  ROUND(100.0 * SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) / MAX(COUNT(*), 1), 1) AS success_rate_pct,
  ROUND(AVG(duration_ms), 0) AS avg_duration_ms
FROM telemetry_events
WHERE timestamp >= date('now', '-30 days')
GROUP BY date(timestamp)
ORDER BY day DESC;

-- =============================================
-- Report 2: Hook Effectiveness Report
-- Identifies hooks that fire frequently, their false positive rates,
-- and which hooks provide the most value.
-- =============================================
.print ''
.print '=== Report 2: Hook Effectiveness ==='
.print ''

SELECT
  hook_name,
  COUNT(*)                              AS total_hits,
  SUM(false_positive)                   AS false_positives,
  COUNT(*) - SUM(false_positive)        AS true_positives,
  ROUND(100.0 * (COUNT(*) - SUM(false_positive)) / MAX(COUNT(*), 1), 1) AS effectiveness_pct,
  MIN(timestamp)                        AS first_hit,
  MAX(timestamp)                        AS last_hit
FROM hook_hits
GROUP BY hook_name
ORDER BY total_hits DESC;

-- =============================================
-- Report 3: Quality-Gate Trend
-- Daily pass/fail rates for all quality gates, showing governance health over time.
-- =============================================
.print ''
.print '=== Report 3: Quality-Gate Trend (Last 30 Days) ==='
.print ''

SELECT
  date(timestamp)           AS day,
  check_name,
  COUNT(*)                  AS runs,
  SUM(passed)               AS passed,
  COUNT(*) - SUM(passed)    AS failed,
  ROUND(100.0 * SUM(passed) / MAX(COUNT(*), 1), 1) AS pass_rate_pct,
  ROUND(AVG(duration_ms), 0) AS avg_duration_ms
FROM gate_results
WHERE timestamp >= date('now', '-30 days')
GROUP BY date(timestamp), check_name
ORDER BY day DESC, check_name;

-- =============================================
-- Report 4: Model Routing Efficiency
-- Token usage, latency, and success rates per model and task type.
-- =============================================
.print ''
.print '=== Report 4: Model Routing Efficiency ==='
.print ''

SELECT
  model,
  task_type,
  COUNT(*)                    AS invocations,
  SUM(tokens_in)              AS total_tokens_in,
  SUM(tokens_out)             AS total_tokens_out,
  SUM(tokens_in + tokens_out) AS total_tokens,
  ROUND(AVG(duration_ms), 0)  AS avg_duration_ms,
  ROUND(100.0 * SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) / MAX(COUNT(*), 1), 1) AS success_rate_pct
FROM model_routes
GROUP BY model, task_type
ORDER BY total_tokens DESC;

-- =============================================
-- Report 5: Session Overview
-- Duration, command count, and event density for recent sessions.
-- =============================================
.print ''
.print '=== Report 5: Session Overview (Last 20 Sessions) ==='
.print ''

SELECT
  s.id          AS session_id,
  s.tool,
  s.started_at,
  s.ended_at,
  s.status,
  ROUND(
    (julianday(COALESCE(s.ended_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))
     - julianday(s.started_at)) * 86400 / 60.0, 1
  ) AS duration_min,
  COUNT(e.id)   AS event_count
FROM sessions s
LEFT JOIN telemetry_events e ON e.session_id = s.id
GROUP BY s.id
ORDER BY s.started_at DESC
LIMIT 20;

-- =============================================
-- Report 6: Task Flow Efficiency
-- How long tasks spend in each phase, identifying bottleneck phases.
-- =============================================
.print ''
.print '=== Report 6: Task Flow Efficiency ==='
.print ''

SELECT
  tl.task_id,
  tl.title,
  tl.phase,
  tl.prev_phase,
  COUNT(*)            AS transitions_in_phase,
  MIN(tl.timestamp)   AS entered_at,
  MAX(tl.timestamp)   AS last_activity_at,
  ROUND(
    (julianday(MAX(tl.timestamp)) - julianday(MIN(tl.timestamp))) * 86400 / 60.0, 1
  ) AS phase_duration_min
FROM task_lifecycle tl
GROUP BY tl.task_id, tl.phase
ORDER BY tl.task_id, entered_at;

-- =============================================
-- Report 7: Tech Evolution Timeline
-- Chronological view of architecture and technology decisions.
-- =============================================
.print ''
.print '=== Report 7: Tech Evolution Timeline ==='
.print ''

SELECT
  decision_id,
  title,
  category,
  status,
  supersedes,
  timestamp AS decided_at,
  SUBSTR(context, 1, 120) AS context_excerpt,
  SUBSTR(decision, 1, 120) AS decision_excerpt
FROM decision_records
ORDER BY timestamp DESC;

-- =============================================
-- Report 8: Requirement Stability
-- How often requirements change, by type and source.
-- =============================================
.print ''
.print '=== Report 8: Requirement Stability ==='
.print ''

SELECT
  task_id,
  COUNT(*)                    AS total_changes,
  SUM(CASE WHEN change_type = 'added'    THEN 1 ELSE 0 END) AS additions,
  SUM(CASE WHEN change_type = 'modified' THEN 1 ELSE 0 END) AS modifications,
  SUM(CASE WHEN change_type = 'removed'  THEN 1 ELSE 0 END) AS removals,
  GROUP_CONCAT(DISTINCT source) AS change_sources,
  MIN(timestamp)              AS first_change,
  MAX(timestamp)              AS last_change,
  ROUND(
    (julianday(MAX(timestamp)) - julianday(MIN(timestamp))), 1
  ) AS churn_span_days
FROM requirement_changes
GROUP BY task_id
ORDER BY total_changes DESC;

-- =============================================
-- Report 9: Planning Execution Rate
-- Plan progress, phase completion, and stalled plans.
-- =============================================
.print ''
.print '=== Report 9: Planning Execution Rate ==='
.print ''

SELECT
  plan_id,
  COUNT(*)                    AS total_events,
  SUM(CASE WHEN event_type = 'phase_complete' THEN 1 ELSE 0 END) AS phases_completed,
  SUM(CASE WHEN event_type = 'plan_created'   THEN 1 ELSE 0 END) AS plans_created,
  SUM(CASE WHEN event_type = 'plan_complete'  THEN 1 ELSE 0 END) AS plans_completed,
  MAX(progress)               AS latest_progress,
  MIN(timestamp)              AS started_at,
  MAX(timestamp)              AS last_activity,
  ROUND(
    (julianday(MAX(timestamp)) - julianday(MIN(timestamp))), 1
  ) AS elapsed_days
FROM planning_events
GROUP BY plan_id
ORDER BY last_activity DESC;
