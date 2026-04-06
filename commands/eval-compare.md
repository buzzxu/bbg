# /eval-compare

## Description

Compare evaluation results across harness versions or model configurations. Queries the SQLite eval tables to produce a side-by-side regression report showing pass rates, scores, token usage, and iteration counts.

## Usage

```
/eval-compare
/eval-compare --baseline <run_id>
/eval-compare --task-set default --last 3
/eval-compare --model claude-sonnet-4 --model claude-opus-4
```

## Process

1. **Query runs** - Fetch the two most recent eval runs for the specified task set from `eval_runs`, or use the explicitly provided `--baseline` run ID.
2. **Load task results** - For each run, query `eval_task_results` to get per-task scores and statuses.
3. **Compute deltas** - For each metric (pass_rate, avg_score, total_tokens, avg_iterations), calculate the absolute and percentage change between baseline and current.
4. **Apply thresholds** - Flag regressions using these thresholds:
   - **pass_rate**: any decrease is a regression
   - **avg_score**: decrease > 5% is a regression
   - **total_tokens**: increase > 20% is a regression
   - **avg_iterations**: increase > 25% is a regression
5. **Render report** - Display a formatted comparison table with per-metric status (IMPROVED, STABLE, REGRESSED) and an overall verdict.

## Options

| Flag                  | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `--baseline <run_id>` | Compare against a specific run instead of the most recent previous |
| `--task-set <name>`   | Task set to compare (default: `default`)                           |
| `--last <n>`          | Compare the last N runs as a trend                                 |
| `--model <name>`      | Filter by model (can specify twice for cross-model comparison)     |
| `--json`              | Output comparison data as JSON for programmatic use                |

## Output

Side-by-side comparison table:

```
## Eval Comparison: v1.2 vs v1.3
| Metric         | v1.2 (baseline) | v1.3 (current) | Delta  | Status   |
|----------------|-----------------|----------------|--------|----------|
| Pass Rate      | 75.0%           | 100.0%         | +25.0% | IMPROVED |
| Avg Score      | 68.2%           | 85.5%          | +17.3% | IMPROVED |
| Total Tokens   | 12,450          | 10,200         | -18.1% | IMPROVED |
| Avg Iterations | 3.2             | 2.8            | -12.5% | IMPROVED |

Verdict: PASS - no regressions detected
```

## Rules

- Always compare runs from the same task set - cross-set comparison is meaningless
- Note when comparing runs across different models - scores are not directly comparable
- If no baseline exists, report current results as the new baseline
- Display the harness_version and model for each run in the comparison header
- Use the `v_eval_version_compare` view for aggregate statistics

## Examples

```
/eval-compare                                      # Compare last 2 runs of 'default' task set
/eval-compare --baseline eval-20260401-143022      # Compare current against specific baseline
/eval-compare --last 5                             # Show trend across last 5 runs
/eval-compare --model claude-sonnet-4 --model claude-opus-4  # Cross-model comparison
```

## Related

- **Skills**: [eval-regression](../skills/eval-regression/SKILL.md), [eval-harness](../skills/eval-harness/SKILL.md)
- **Commands**: [/eval](./eval.md)
