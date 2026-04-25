# Harness Engineering Playbook

Use this playbook for harness design, updates, validation, and governed learning.

## Purpose

BBG uses a two-layer model:

- `harness` manages execution quality
- `Hermes` manages learning quality

Keep these layers separate. A good harness helps agents complete the current task reliably. Hermes helps the project remember what was learned so future tasks start with better guidance.

## Layer Boundaries

### Harness

Harness assets define how agents operate in the repository:

- `AGENTS.md`
- `RULES.md`
- `.bbg/harness/rules/`
- `.bbg/harness/skills/`
- `.bbg/context/`
- `.bbg/policy/`
- tool adapters such as `CLAUDE.md`, `.codex/AGENTS.md`, `.cursor/rules/`, `.gemini/`, `.opencode/`

Harness responsibilities:

- keep instructions short and navigable
- prefer canonical repo workflows
- keep supported AI tools behaviorally aligned
- enforce guardrails with hooks, policy, and doctor checks

### Hermes

Hermes assets define how the project learns from work:

- `.bbg/harness/commands/hermes-*.md`
- `.bbg/harness/skills/hermes-*/`
- `.bbg/knowledge/`
- local or central Hermes runtime records

Hermes responsibilities:

- query prior local knowledge
- distill evidence-backed candidates
- draft local skill or rule updates
- verify and promote trusted learnings

## Canonical Workflow

For day-to-day engineering, start with user-facing workflow skills:

- `.bbg/harness/skills/start/SKILL.md`
- `.bbg/harness/skills/resume/SKILL.md`
- `.bbg/harness/skills/analyze/SKILL.md`
- `.bbg/harness/skills/add-repo/SKILL.md`
- `.bbg/harness/skills/deliver/SKILL.md`

Internal skills such as workflow routing, task intake, model routing, Hermes, and cross-audit are invoked by the user-facing skills when needed. Tool-specific prompts should be shortcuts to the user-facing skills, not separate sources of truth.

## Hermes Usage Model

Hermes should not run automatically for every task.

- workflow skills may recommend Hermes follow-up
- knowledge actions stay explicit and auditable
- promotion back into canonical assets requires separate review

Typical Hermes skill actions:

- query
- distill
- draft-skill
- draft-rule
- verify
- promote

## Recommendation Triggers

Common workflow-to-Hermes handoffs:

- planning work recommends Hermes query when similar tasks or rollout decisions may already exist
- review work recommends Hermes distill when findings reveal a reusable fix pattern
- reusable workflow patterns recommend Hermes draft-skill
- repeated security findings recommend Hermes draft-rule

## Adapter Design

Support these tools with thin adapters:

- Claude Code
- Codex
- Gemini
- Cursor
- OpenCode

Adapters should:

- point to canonical repo assets
- use managed sections where possible
- avoid copying full governance logic into tool-private files

## Anti-patterns

- storing all guidance in one giant instruction file
- duplicating rules across harness and Hermes
- auto-promoting every successful task into a rule or skill
- forcing Hermes to run in the default execution path
- making tool adapters the source of truth instead of the repository

## Audit Checklist

- [ ] `AGENTS.md` is a map, not an encyclopedia
- [ ] repo workflows are the default cross-tool entry points
- [ ] adapters are thin and repairable
- [ ] Hermes is available but explicit
- [ ] promoted Hermes outputs flow back into canonical assets
- [ ] harness audit checks execution coverage and learning-loop boundaries
