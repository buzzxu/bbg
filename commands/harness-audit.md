# /harness-audit

## Description
Audit the AI harness configuration (AGENTS.md, CLAUDE.md, hooks, commands, skills, rules) for optimization opportunities, inconsistencies, and missing configurations.

## Usage
```
/harness-audit
/harness-audit --scope hooks
/harness-audit --deep
```

## Process
1. **Inventory** — Catalog all harness files:
   - AGENTS.md, CLAUDE.md, RULES.md
   - commands/, hooks/, skills/, rules/, agents/
   - .claude/, .cursor/, .codex/, .gemini/, .opencode/
2. **Check consistency** — Verify rules are consistent across all config files
3. **Check coverage** — Identify gaps:
   - Commands without corresponding hooks
   - Skills without usage references
   - Rules duplicated across files
   - Harness workflows without a clear Hermes follow-up path when learning is warranted
4. **Check effectiveness** — Evaluate:
   - Are hooks actually preventing issues they target?
   - Are commands covering the workflow adequately?
   - Are agent definitions complete and non-overlapping?
   - Are harness assets and Hermes assets separated by responsibility?
5. **Suggest optimizations** — Recommend:
   - Consolidated or removed duplicate configurations
   - New hooks/commands for common pain points
   - Better agent routing for task types
   - Better workflow-to-Hermes recommendations without forcing automatic learning steps

## Output
Harness audit report:
- File inventory with last modified dates
- Consistency findings (conflicts between configs)
- Coverage gaps (missing hooks, commands, skills)
- Optimization recommendations ranked by impact
- Unused or redundant configurations to remove
- Harness vs Hermes boundary findings

## Rules
- Read all configuration files before making recommendations
- Cross-reference AGENTS.md rules with actual hook enforcement
- Check that command names don't conflict with built-in commands
- Verify hook scripts exist and are executable
- Flag any configuration that references non-existent files
- Flag duplicated guidance across canonical harness files and Hermes draft assets
- Do not recommend automatic Hermes execution in the default development path

## Examples
```
/harness-audit                # Full audit
/harness-audit --scope hooks  # Audit only hooks
/harness-audit --deep         # Include content analysis of all files
```

## Related

- **Agents**: [harness-optimizer](../agents/harness-optimizer.md)
- **Skills**: [harness-engineering](../skills/harness-engineering/SKILL.md), [eval-harness](../skills/eval-harness/SKILL.md)
