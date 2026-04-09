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

| Flag          | Default        | Description                                                              |
| ------------- | -------------- | ------------------------------------------------------------------------ |
| `--profile`   | `standard`     | Depth profile: `quick` (<= 0.30), `standard` (<= 0.20), `deep` (<= 0.15) |
| `--slug`      | auto-generated | Human-readable session identifier                                        |
| `--spec-dir`  | `docs/specs`   | Output directory for crystallized spec                                   |
| `--auto-wiki` | `true`         | Ingest confirmed spec into wiki knowledge layer after user confirmation  |

## Process

1. Initialize session metadata and persistence
2. Pre-check context from prompt and artifacts
3. Score all ambiguity dimensions
4. Run Socratic one-question rounds
5. Apply analysis lenses on cadence
6. Crystallize into structured specification draft
7. Ask user to confirm or revise the draft
8. Save confirmed spec to dated path `[spec-dir]/YYYY/MM/[slug].md`
9. Ingest confirmed spec into wiki when `--auto-wiki=true`
10. Bridge to execution with `/plan`

## Output

- Live ambiguity score updates
- Interview transcript by round
- Spec saved to `[spec-dir]/YYYY/MM/[slug].md`
- Confirmation snapshot saved to `docs/specs/CONFIRMED-TEMPLATE.md` format
- Wiki candidate or concept page updated from confirmed spec
- Session data persisted in `.bbg/telemetry.db`

## Rules

- One question per round
- Show score updates after every round
- Minimum two rounds before crystallization
- Record assumptions and open questions explicitly
- Do not proceed to `/plan` before explicit user confirmation of the crystallized spec

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
