# /telemetry-report

## Description

Generate a telemetry report from the project's observability database. Queries `.bbg/telemetry.db` (SQLite) for workflow health, hook effectiveness, quality gate trends, model routing, task flow, and more.

## Usage

```
/telemetry-report
/telemetry-report --scope hooks
/telemetry-report --scope gates
/telemetry-report --scope models
/telemetry-report --scope tasks
/telemetry-report --scope decisions
/telemetry-report --scope requirements
/telemetry-report --scope planning
/telemetry-report --days 7
/telemetry-report --full
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--scope` | `summary` | Report scope: `summary`, `hooks`, `gates`, `models`, `tasks`, `decisions`, `requirements`, `planning` |
| `--days` | `30` | Number of days to include in time-based reports |
| `--full` | `false` | Run all 9 predefined reports |

## Process

1. **Check database** - Verify `.bbg/telemetry.db` exists; if not, check for `.bbg/telemetry/events.json` fallback
2. **Select scope** - Determine which reports to run based on `--scope` or `--full`
3. **Execute queries** - Run the appropriate queries from `.bbg/scripts/telemetry-report.sql` or the matching view
4. **Format output** - Present results in readable tables with headers
5. **Interpret** - Highlight anomalies, threshold violations, and trends

## Report Scopes

| Scope | Query Source | Description |
|-------|-------------|-------------|
| `summary` | Dashboard overview | Event counts, session stats, health score |
| `hooks` | Report 2, `v_hook_effectiveness` | Hook hit counts and false positive rates |
| `gates` | Report 3, `v_daily_gate_pass_rate` | Quality gate pass/fail trends |
| `models` | Report 4, `v_model_route_efficiency` | Token usage and latency per model |
| `tasks` | Report 6, `v_task_flow_efficiency` | Task phase durations and bottlenecks |
| `decisions` | Report 7, `v_tech_evolution_timeline` | Architecture decision timeline |
| `requirements` | Report 8 | Requirement change frequency and sources |
| `planning` | Report 9 | Plan progress and stalled plan detection |

## Output

A formatted telemetry report containing:
- Data tables for the selected scope
- Trend indicators (up improving, down declining, same stable)
- Threshold alerts for metrics outside acceptable ranges
- Recommended actions based on the data

## Rules

- Read-only - never modify the telemetry database
- Always show the time range covered by the report
- Flag threshold violations: error rate >10%, hook effectiveness <70%, gate pass rate <80%
- If SQLite database is missing, provide instructions for initialization
- Include the raw SQL query for each report section so users can customize

## Examples

```
/telemetry-report
/telemetry-report --scope hooks
/telemetry-report --scope gates --days 7
/telemetry-report --full
```

## Related

- **Skills**: [telemetry-dashboard](../skills/telemetry-dashboard/SKILL.md), [monitoring-patterns](../skills/monitoring-patterns/SKILL.md)
- **Hooks**: [telemetry-collector](../hooks/scripts/telemetry-collector.js)
