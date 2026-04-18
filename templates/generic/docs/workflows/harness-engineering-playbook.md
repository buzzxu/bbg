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
- `rules/`
- `skills/`
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

- `commands/hermes-*.md`
- `skills/hermes-*/`
- `.bbg/knowledge/`
- local or central Hermes runtime records

Hermes responsibilities:

- query prior local knowledge
- distill evidence-backed candidates
- draft local skill or rule updates
- verify and promote trusted learnings

## Canonical Workflow

For day-to-day engineering, start with repo workflows:

- `bbg workflow plan`
- `bbg workflow review`
- `bbg workflow tdd`
- `bbg workflow security`

Tool-specific prompts should be shortcuts to these workflows, not separate sources of truth.

## Hermes Usage Model

Hermes should not run automatically for every task.

- workflow commands may recommend Hermes follow-up
- knowledge actions stay explicit and auditable
- promotion back into canonical assets requires separate review

Typical Hermes commands:

- `bbg hermes query`
- `bbg hermes distill`
- `bbg hermes draft-skill`
- `bbg hermes draft-rule`
- `bbg hermes verify`
- `bbg hermes promote`

## Recommendation Triggers

Common workflow-to-Hermes handoffs:

- `bbg workflow plan`
  - recommend `bbg hermes query` when similar tasks or rollout decisions may already exist
- `bbg workflow review`
  - recommend `bbg hermes distill` when findings reveal a reusable fix pattern
  - recommend `bbg hermes draft-skill` when the pattern should become a reusable workflow
- `bbg workflow tdd`
  - recommend `bbg hermes draft-skill` when the test-and-fix loop is reusable
- `bbg workflow security`
  - recommend `bbg hermes draft-rule` when repeated findings imply a durable policy boundary

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
