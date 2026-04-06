---
name: eval-regression
category: testing
description: Run golden task sets, grade results, compare against baseline, and produce regression reports
---

# Eval Regression

## Overview

Use this skill when you need to measure whether harness changes (new skills, updated hooks, modified agents) improved or degraded agent performance. The workflow uses golden task sets - standardized tasks with known-good evaluation criteria - to produce comparable scores across harness versions.

## Prerequisites

- SQLite database at `.bbg/telemetry.db` (created by the telemetry module)
- Eval schema applied (`.bbg/scripts/eval-schema.sql`)
- Golden task set defined in `evals/golden-tasks/manifest.json`

## Workflow

### Step 1: Load the Golden Task Set

Read `evals/golden-tasks/manifest.json` to get the task inventory. Each task entry references a JSON file in `evals/golden-tasks/tasks/` containing setup files, evaluation criteria, and grading checklists.

```bash
cat evals/golden-tasks/manifest.json
```

Verify all referenced task files exist before proceeding.

### Step 2: Execute Each Golden Task

For each task in the manifest:

1. **Set up the environment** - Create the files specified in the task's `setup.files` array in a temporary or sandboxed directory.
2. **Present the task** - Give the agent the task description and setup instructions.
3. **Record execution** - Track: start time, token usage, number of iterations, and final status.
4. **Grade the result** - Evaluate against the task's `grader.checks` array. Each check gets a pass/fail. Calculate a weighted score from check weights.

Status values: `pass` (all must_pass criteria met), `fail` (any must_pass criteria missed), `partial` (some criteria met), `skip` (task not executed), `error` (execution failed).

### Step 3: Record Results to SQLite

Generate a unique `run_id` (format: `eval-YYYYMMDD-HHMMSS`) and insert results:

```sql
-- Insert the run summary
INSERT INTO eval_runs (run_id, harness_version, task_set, model, total_tasks, passed, failed, skipped, duration_ms, config_snapshot)
VALUES ('<run_id>', '<version>', 'default', '<model>', <total>, <passed>, <failed>, <skipped>, <duration>, '<config_json>');

-- Insert each task result
INSERT INTO eval_task_results (run_id, task_id, task_title, category, status, score, duration_ms, tokens_used, iterations, failure_reason, grader_output)
VALUES ('<run_id>', '<task_id>', '<title>', '<category>', '<status>', <score>, <duration>, <tokens>, <iterations>, '<reason>', '<grader_json>');
```

### Step 4: Compare Against Baseline

Query the previous run for the same task set to establish a baseline:

```sql
SELECT run_id, harness_version, task_set, passed, failed, total_tasks, duration_ms
FROM eval_runs
WHERE task_set = '<task_set>'
ORDER BY timestamp DESC
LIMIT 2;
```

Use `v_eval_version_compare` for aggregate comparison:

```sql
SELECT * FROM v_eval_version_compare
WHERE task_set = '<task_set>'
ORDER BY harness_version DESC;
```

### Step 5: Produce Regression Report

Compare the current run against the baseline across these dimensions:

| Metric         | Regression Threshold | Description                              |
| -------------- | -------------------- | ---------------------------------------- |
| pass_rate      | Any decrease         | Percentage of tasks with status = 'pass' |
| avg_score      | > 5% decrease        | Average weighted score across all tasks  |
| total_tokens   | > 20% increase       | Total token consumption (cost indicator) |
| avg_iterations | > 25% increase       | Average iterations per task (efficiency) |

**Report format:**

```
## Eval Regression Report
Run: <run_id> | Harness: <version> | Model: <model> | Task Set: <task_set>

### Summary
| Metric         | Baseline | Current | Delta  | Status     |
|----------------|----------|---------|--------|------------|
| Pass Rate      | 75.0%    | 100.0%  | +25.0% | IMPROVED   |
| Avg Score      | 68.2%    | 85.5%   | +17.3% | IMPROVED   |
| Total Tokens   | 12,450   | 10,200  | -18.1% | IMPROVED   |
| Avg Iterations | 3.2      | 2.8     | -12.5% | IMPROVED   |

### Per-Task Results
| Task             | Baseline | Current | Status  |
|------------------|----------|---------|---------|
| simple-bugfix    | pass     | pass    | STABLE  |
| tdd-feature      | fail     | pass    | FIXED   |
| security-review  | pass     | pass    | STABLE  |
| refactor-extract | fail     | pass    | FIXED   |

### Verdict: PASS - no regressions detected
```

If any metric crosses its regression threshold, the verdict is `FAIL - regressions detected` with details on which metrics regressed.

## Rules

- Always run the complete task set - never skip tasks to improve scores
- Record ALL results including failures - do not cherry-pick passing runs
- Use the same model for both baseline and comparison runs when possible
- Store config_snapshot so results are reproducible
- A first run with no baseline always gets verdict BASELINE ESTABLISHED

## Anti-patterns

- Running individual tasks instead of the full set - results are not comparable
- Comparing runs across different models without noting it
- Adjusting grader criteria to make failing tasks pass
- Deleting old baselines to hide regressions

## Related

- **Skills**: [eval-harness](../eval-harness/SKILL.md)
- **Commands**: [/eval](../../commands/eval.md), [/eval-compare](../../commands/eval-compare.md)
