# /interview

## Description

Start a new Socratic deep-interview session for requirement elicitation. The flow uses structured questioning with ambiguity scoring to reduce vagueness before planning and implementation.

## Usage

```
/interview "feature description"
/interview "Build a notification system for order status updates"
/interview "Add multi-tenant support" --profile deep
/interview "CSV export feature" --profile quick
```

## Options

| Flag | Default | Description |
| --- | --- | --- |
| `--profile` | `standard` | Depth profile: `quick` (<= 0.30), `standard` (<= 0.20), `deep` (<= 0.15) |
| `--slug` | auto-generated | Human-readable session identifier |
| `--spec-dir` | `docs/specs` | Output directory for crystallized spec |

## Process

1. Initialize session metadata and persistence
2. Pre-check context from prompt and artifacts
3. Score all ambiguity dimensions
4. Run Socratic one-question rounds
5. Apply analysis lenses on cadence
6. Crystallize into structured specification
7. Bridge to execution with `/plan`

## Output

- Live ambiguity score updates
- Interview transcript by round
- Spec saved to `[spec-dir]/[slug].md`
- Session data persisted in `.bbg/telemetry.db`

## Rules

- One question per round
- Show score updates after every round
- Minimum two rounds before crystallization
- Record assumptions and open questions explicitly

## Examples

```
/interview "User authentication with OAuth2 and magic links"
/interview "Real-time collaboration for document editing" --profile deep
/interview "Add Stripe billing integration" --profile quick --slug stripe-billing
```

## Related

- Skills: [deep-interview](../skills/deep-interview/SKILL.md), [writing-plans](../skills/writing-plans/SKILL.md), [api-design](../skills/api-design/SKILL.md)
- Commands: [/interview-resume](./interview-resume.md), [/plan](./plan.md)
- Rules: [patterns](../rules/common/patterns.md)
