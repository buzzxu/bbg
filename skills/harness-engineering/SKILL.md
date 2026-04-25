---
name: harness-engineering
category: ai-workflow
description: AI harness optimization — CLAUDE.md tuning, agent delegation, hook design, rule organization, and token management
---

# Harness Engineering

## Overview
Load this skill when configuring AI development environments — CLAUDE.md, AGENTS.md, rules files, hooks, and multi-agent workflows. A well-tuned harness makes AI agents more reliable, consistent, and efficient. A poorly-tuned one wastes tokens and produces inconsistent results.

Harness and Hermes are complementary:

- `harness` governs how agents execute work now
- `Hermes` governs how the project learns from that work over time

Keep execution guidance and learned candidate knowledge separate until evidence-backed promotion happens.

## Patterns

### Instruction File Hierarchy
```
CLAUDE.md / AGENTS.md    → Project-wide instructions (always loaded)
rules/                   → Modular rules loaded by convention or keyword
skills/                  → Deep workflow knowledge loaded on demand
.cursorrules             → Cursor-specific rules
.gemini/                → Gemini settings and command prompts
```
- Project-wide file: keep under 200 lines — essential rules only
- Rules: one concern per file — loaded when relevant
- Skills: detailed workflows — loaded explicitly when needed
- Never duplicate instructions across files — reference instead

### CLAUDE.md / AGENTS.md Design
```markdown
# Project Name — Agent Instructions

## Build & Test Commands
npm run build / npm test / npm run lint

## Architecture (brief)
Key directories and their purposes

## Coding Style (brief)
Critical conventions that affect every file

## Must Always / Must Never
Non-negotiable rules (5-10 each, maximum)
```
- Lead with commands — agents need these immediately
- Keep it scannable — short sections, bullet points
- Prioritize rules that prevent the most common mistakes
- Update when agents repeatedly make the same error

### Rule Organization
```
rules/
  coding-style.md       → Naming, formatting, conventions
  testing.md            → Test patterns, coverage requirements
  security.md           → Security constraints and checks
  git-workflow.md       → Commit format, branch naming, PR process
  dependencies.md       → What to use, what to avoid
```
- One concern per rule file
- Rules should be actionable: "do X" or "never do Y"
- Include rationale: agents follow rules better when they understand why
- Review and prune quarterly — stale rules cause confusion

### Hook Design
Pre-commit hooks for automated enforcement:
```yaml
hooks:
  pre-commit:
    - lint-staged        # Format and lint changed files
    - type-check         # Verify TypeScript types
    - test-related       # Run tests for changed files
    - secret-scan        # Detect hardcoded secrets
```
- Hooks must be fast (<30s) — slow hooks get bypassed
- Only check changed files — don't re-lint the entire codebase
- Never block on warnings — only on errors
- Provide clear fix instructions in hook output

### Agent Delegation
When to delegate to specialized agents:
- **Planning agent**: complex features requiring multi-file changes
- **Code review agent**: after implementation, before commit
- **Security agent**: changes to auth, input handling, or data storage
- **Test agent**: writing tests for new functionality
- **Refactor agent**: cleanup after feature work

Delegation format:
```
Task: [specific, measurable objective]
Context: [relevant files, decisions, constraints]
Success criteria: [how to verify the task is done]
```

### Token Management
- Front-load important context — agents process beginnings more reliably
- Use structured formats (YAML, bullet points) over prose — more information per token
- Reference files by path instead of including full contents
- Compact summaries for completed work — preserve decisions, discard process
- Monitor token usage — if responses degrade, the context is too large

### Harness + Hermes Loop
- Use harness assets as the canonical execution layer: `AGENTS.md`, `RULES.md`, `rules/`, `skills/`, `.bbg/context/`, `.bbg/policy/`
- Use repo workflow skills as the cross-tool entry points: `skills/start/SKILL.md`, `skills/workflow/SKILL.md`, `skills/task-start/SKILL.md`
- Use task environments for isolated execution: `bbg task-env start`
- Use observation sessions for runtime evidence: `bbg observe start`
- Use doc gardening to keep repo docs agent-readable: `bbg doc-garden`
- Use loop runtime state for long-running verification work: `bbg loop-start`, `bbg loop-status`
- Let workflows recommend Hermes follow-up when a reusable pattern appears
- Use Hermes explicitly for learning operations: query, distill, draft, verify, promote
- Only move Hermes outputs back into canonical assets after review and promotion

### When Hermes Should Be Recommended
- **Planning**: if similar tasks or rollout decisions may already exist, recommend Hermes query through `skills/hermes/SKILL.md`
- **Review**: if a reusable fix pattern appears, recommend Hermes distill or draft-skill through `skills/hermes/SKILL.md`
- **TDD**: if a test-and-fix loop is reusable, recommend Hermes draft-skill through `skills/hermes/SKILL.md`
- **Security**: if findings imply a durable policy boundary, recommend Hermes draft-rule through `skills/hermes/SKILL.md`

### When Hermes Should Stay Manual
- Querying prior local memory
- Distilling candidate knowledge from evidence
- Drafting local skills or rules
- Verifying candidates before promotion
- Promoting trusted outputs back into canonical harness assets

## Rules
- Instruction files must be under 200 lines — split into rules/skills if larger
- Every rule must have a clear rationale
- Hooks must complete in under 30 seconds
- Agent delegation must include specific success criteria
- Update instructions when agents repeatedly make the same mistake
- Never duplicate instructions across multiple files
- Keep Hermes candidate memory separate from canonical harness instructions until promotion
- Prefer workflow recommendations over automatic Hermes execution

## Anti-patterns
- Mega instruction files (500+ lines) — agents lose focus in long documents
- Vague rules ("write good code") — must be specific and actionable
- Rules without rationale — agents follow better when they understand why
- Slow hooks (>30s) — developers bypass them with `--no-verify`
- Delegating without context — agents waste tokens re-discovering information
- Never updating instructions — the harness must evolve with the project
- Letting Hermes auto-promote drafts directly into canonical rules or skills
- Duplicating the same guidance in adapters, canonical assets, and Hermes drafts

## Checklist
- [ ] Main instruction file under 200 lines
- [ ] Rules organized one-per-file by concern
- [ ] Skills available for complex workflows
- [ ] Pre-commit hooks fast (<30s) and focused
- [ ] Agent delegation includes task, context, and success criteria
- [ ] Token usage monitored and optimized
- [ ] Instructions updated when recurring agent mistakes are identified
- [ ] No duplicated instructions across files
- [ ] Hermes is available for learning but not forced into every task
- [ ] Reusable findings have a clear path from workflow recommendation to Hermes draft to promotion
- [ ] Active complex tasks can use task environments and observation sessions
- [ ] Repo docs are periodically checked for stale references
- [ ] Long-running verification work has explicit loop state and handoff artifacts


## Related

- **Agents**: [harness-optimizer](../../agents/harness-optimizer.md)
- **Commands**: [/harness-audit](../../commands/harness-audit.md), [Hermes Query](../../commands/hermes-query.md), [Hermes Distill](../../commands/hermes-distill.md)
