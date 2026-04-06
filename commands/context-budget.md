# /context-budget

## Description
Check and manage the context token budget. Shows loaded context usage, budget limits by model tier, and context efficiency signals.

## Usage
```
/context-budget
/context-budget --tier opus
/context-budget --tier sonnet
/context-budget --tier light
/context-budget --history
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--tier` | auto-detect | Model tier: `opus` (120K), `sonnet` (60K), `light` (30K) |
| `--history` | `false` | Show context load history from telemetry database |

## Budget Tiers

| Tier | Total Budget | P0 (Task) | P1 (Architecture) | P2 (Tests) | P3 (Related) | P4 (Map) |
|------|--------------|-----------|-------------------|------------|--------------|----------|
| Opus | 120K tokens | 48K | 24K | 18K | 18K | 12K |
| Sonnet | 60K tokens | 24K | 12K | 9K | 9K | 6K |
| Light | 30K tokens | 12K | 6K | 4.5K | 4.5K | 3K |

## Process
1. **Detect model tier** - infer from active model or apply `--tier`.
2. **Check current usage** - query latest `context_loads` entry.
3. **Display budget breakdown** - show tier allocation and usage.
4. **Show efficiency metrics** - summarize `v_context_efficiency`.
5. **Recommend optimizations** - flag over- or under-utilization.

## Output
```
Context Budget - Sonnet Tier (60K tokens)

| Priority | Allocated | Used  | Status |
|----------|-----------|-------|--------|
| P0 Task  | 24,000    | 22,100| OK     |
| P1 Arch  | 12,000    | 8,400 | OK     |
| P2 Tests | 9,000     | 9,200 | OVER   |
| P3 Rel.  | 9,000     | 3,100 | OK     |
| P4 Map   | 6,000     | 2,800 | OK     |
| TOTAL    | 60,000    | 45,600| OK     |
```

## Rules
- Default to `sonnet` tier when model cannot be detected
- Show both absolute token counts and percentages
- Flag any tier over allocation as `OVER`
- If `--history` is provided, show the last 10 context loads
- Recommend `/context-refresh` when repo map is older than 24 hours

## Examples
```
/context-budget
/context-budget --tier opus
/context-budget --history
```

## Related
- **Skills**: [context-loading](../skills/context-loading/SKILL.md), [strategic-compact](../skills/strategic-compact/SKILL.md), [llm-cost-optimization](../skills/llm-cost-optimization/SKILL.md)
- **Commands**: [/context-refresh](context-refresh.md), [/model-route](model-route.md)
