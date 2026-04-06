---
name: telemetry-dashboard
category: observability
description: Review and analyze telemetry data - query SQLite database, interpret trends, generate actionable insights
---

# Telemetry Dashboard

## Overview

Use this skill when you need to review project telemetry data, investigate workflow health, analyze model routing efficiency, or generate observability reports. This skill queries the SQLite telemetry database (`.bbg/telemetry.db`) and falls back to `.bbg/telemetry/events.json` if the database does not exist.

## Prerequisites

- SQLite telemetry database at `.bbg/telemetry.db` (initialized by `session-start.js` or manually via `sqlite3 .bbg/telemetry.db < .bbg/scripts/telemetry-init.sql`)
- Fallback: `.bbg/telemetry/events.json` for legacy JSON-only telemetry

## Workflow

### Step 1: Check Data Source

Determine which telemetry backend is available:

```bash
# Check for SQLite database
ls -la .bbg/telemetry.db 2>/dev/null

# If no SQLite, check for JSON fallback
ls -la .bbg/telemetry/events.json 2>/dev/null
```

If SQLite exists, use it for all queries. If only JSON exists, parse the JSON file and present data in tabular format. If neither exists, inform the user and suggest running `bbg init` or initializing manually.

### Step 2: Choose Report Scope

Ask the user which area they want to investigate, or run a full dashboard:

| Scope                  | What It Shows                          | Table/View                                      |
| ---------------------- | -------------------------------------- | ----------------------------------------------- |
| **Workflow health**    | Event error rates, session stability   | `telemetry_events`, `v_session_summary`         |
| **Hook effectiveness** | Which hooks fire, false positive rates | `hook_hits`, `v_hook_effectiveness`             |
| **Quality gates**      | Pass/fail trends over time             | `gate_results`, `v_daily_gate_pass_rate`        |
| **Model routing**      | Token costs, latency, success rates    | `model_routes`, `v_model_route_efficiency`      |
| **Task flow**          | Phase durations, bottlenecks           | `task_lifecycle`, `v_task_flow_efficiency`      |
| **Tech decisions**     | Architecture decision timeline         | `decision_records`, `v_tech_evolution_timeline` |
| **Requirements**       | Spec churn, change frequency           | `requirement_changes`                           |
| **Planning**           | Plan progress, stalled plans           | `planning_events`                               |
| **Full dashboard**     | All of the above                       | All tables and views                            |

### Step 3: Query the Database

Run the appropriate queries using `sqlite3`:

```bash
# Example: Full dashboard summary
sqlite3 -header -column .bbg/telemetry.db "
  SELECT 'Sessions' AS metric, COUNT(*) AS value FROM sessions
  UNION ALL
  SELECT 'Events', COUNT(*) FROM telemetry_events
  UNION ALL
  SELECT 'Hook hits', COUNT(*) FROM hook_hits
  UNION ALL
  SELECT 'Gate checks', COUNT(*) FROM gate_results
  UNION ALL
  SELECT 'Model routes', COUNT(*) FROM model_routes
  UNION ALL
  SELECT 'Tasks tracked', COUNT(DISTINCT task_id) FROM task_lifecycle
  UNION ALL
  SELECT 'Decisions', COUNT(*) FROM decision_records
  UNION ALL
  SELECT 'Req changes', COUNT(*) FROM requirement_changes
  UNION ALL
  SELECT 'Plan events', COUNT(*) FROM planning_events;
"
```

For predefined reports, run individual queries from `.bbg/scripts/telemetry-report.sql`, or execute the full report file:

```bash
sqlite3 .bbg/telemetry.db < .bbg/scripts/telemetry-report.sql
```

### Step 4: Analyze Results

Interpret the data and identify actionable insights:

- **High error rates** (>10%) in `telemetry_events` -> investigate failing workflows
- **Low hook effectiveness** (<70%) -> review hook logic for over-triggering
- **Declining gate pass rates** -> check if new code is meeting quality thresholds
- **High token usage** in `model_routes` -> consider model routing optimizations
- **Tasks stuck in a phase** -> identify blockers in the task lifecycle
- **Frequent requirement changes** -> flag specification instability to the team
- **Stalled plans** (no activity >7 days) -> review and either resume or close

### Step 5: Generate Summary

Present findings in a structured format:

```markdown
## Telemetry Dashboard - [Date]

### Health Score: [Good/Warning/Critical]

| Metric               | Value | Trend | Action                |
| -------------------- | ----- | ----- | --------------------- |
| Session success rate | 95%   | up    | None                  |
| Gate pass rate       | 87%   | down  | Review failing checks |
| Hook effectiveness   | 92%   | same  | OK                    |
| Avg model latency    | 1.2s  | up    | Monitor               |

### Key Findings

1. [Finding with data]
2. [Finding with data]

### Recommended Actions

1. [Action with specific query or file to investigate]
```

## Rules

- Always check for SQLite database first, fall back to JSON only if `.bbg/telemetry.db` does not exist
- Never modify the telemetry database during analysis - read-only queries only
- Present numbers with context: "87% pass rate (down from 93% last week)" not just "87%"
- Flag any metric crossing a threshold: error rate >10%, effectiveness <70%, stalled plans >7 days
- When showing raw SQL results, include the query so the user can re-run or modify it

## Anti-patterns

- Reporting raw numbers without interpretation - always explain what the data means
- Ignoring trends - a single snapshot is less useful than a trend over time
- Querying only one table - cross-reference multiple tables for deeper insight
- Modifying telemetry data during review - the dashboard is read-only

## Checklist

- [ ] Data source identified (SQLite or JSON fallback)
- [ ] Relevant scope selected for investigation
- [ ] Queries executed and results captured
- [ ] Data interpreted with actionable insights
- [ ] Summary generated with health score and recommendations

## Related

- **Commands**: [/telemetry-report](../../commands/telemetry-report.md)
- **Skills**: [eval-harness](../eval-harness/SKILL.md), [monitoring-patterns](../monitoring-patterns/SKILL.md)
- **Hooks**: [telemetry-collector](../../hooks/scripts/telemetry-collector.js)
