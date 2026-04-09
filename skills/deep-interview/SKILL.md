---
name: deep-interview
category: requirements
description: Socratic deep-interview methodology for requirement elicitation with ambiguity scoring, structured pressure strategies, and multi-lens analysis
---

# Deep Interview - Socratic Requirement Elicitation

## Overview

Use this skill to turn vague requests into testable specifications. The workflow uses one-question rounds, weighted ambiguity scoring, and recurring analysis lenses to reduce requirement uncertainty before planning.

## When To Use

- New features with unclear scope
- Ambiguous stakeholder requests
- Requirements handoff before `/plan`
- Resuming interrupted requirement discovery

## Depth Profiles

| Profile  | Target Threshold | Typical Rounds | Use Case                   |
| -------- | ---------------- | -------------- | -------------------------- |
| quick    | <= 0.30          | 3-5            | Small, low-risk features   |
| standard | <= 0.20          | 5-10           | Default option             |
| deep     | <= 0.15          | 8-15           | High-risk or novel systems |

Continue until composite ambiguity <= threshold or user ends the session.

## Ambiguity Scoring

Composite score:

```
A_composite = sum(w_i * d_i) / sum(w_i)
```

- `d_i`: ambiguity score in [0.0, 1.0]
- `w_i`: dimension weight

### Dimensions

| Dimension               | Weight | Examples of unresolved ambiguity |
| ----------------------- | ------ | -------------------------------- |
| Functional Scope        | 0.20   | "Handle payments" (which flows?) |
| Data Model              | 0.15   | Entity lifecycle unknown         |
| Integration Boundaries  | 0.15   | API contracts unclear            |
| Error and Edge Cases    | 0.15   | Failure behavior unspecified     |
| Performance Constraints | 0.10   | No latency/throughput targets    |
| Security and Access     | 0.10   | Authz model undefined            |
| User Experience         | 0.10   | Workflow states missing          |
| Operational Lifecycle   | 0.05   | Rollout/rollback undefined       |

### Score Guide

| Range   | Label    |
| ------- | -------- |
| 0.8-1.0 | Opaque   |
| 0.5-0.7 | Unclear  |
| 0.3-0.4 | Partial  |
| 0.1-0.2 | Clear    |
| 0.0     | Resolved |

After each round, re-score all dimensions and report deltas.

## Interview Flow

### Phase 1: Pre-check Context

1. Gather initial prompt and available artifacts
2. Score all dimensions
3. Sort by weighted contribution (`w_i * d_i`)
4. Pick the highest contribution as first target
5. Show initial scorecard

Scorecard template:

```
Deep Interview - Initial Ambiguity Assessment
Topic: <topic>
Profile: <quick|standard|deep>
Threshold: <threshold>

Dimension                 Wt   Score   Weighted
Functional Scope          .20  d1      w*d
Data Model                .15  d2      w*d
Integration Boundaries    .15  d3      w*d
Error and Edge Cases      .15  d4      w*d
Performance Constraints   .10  d5      w*d
Security and Access       .10  d6      w*d
User Experience           .10  d7      w*d
Operational Lifecycle     .05  d8      w*d
Composite: A_composite
```

### Phase 2: Socratic Loop

Repeat until threshold is met and minimum 2 rounds complete:

1. Pick highest unresolved weighted dimension (avoid repeating same dimension >2 rounds in a row)
2. Choose pressure strategy
3. Ask exactly one focused question
4. Record answer verbatim
5. Update dimension and composite scores
6. Log round metadata
7. Show updated scorecard and delta

Round log template:

```
Round <n>
Target: <dimension>
Strategy: <pressure strategy>
Question: <single question>
Answer: <verbatim>
Score delta: <dimension before -> after>
Composite: <before -> after>
Remaining to threshold: <value>
```

### Phase 3: Analysis Lenses

Apply every 3 rounds, or when a dimension drops below 0.3:

1. Temporal analysis
2. Failure mode analysis
3. Scale analysis
4. Stakeholder analysis
5. Dependency analysis

Lens template:

```
Lens: <name>
Findings:
1) ...
2) ...
3) ...

New questions surfaced:
- ...
- ...

Dimensions affected: ...
```

### Phase 4: Crystallize

When threshold is reached, generate specification with:

1. Requirements
2. Data model
3. Integration map
4. Assumptions log
5. Edge cases
6. Open questions
7. Ambiguity audit trail

Save to configured path (default `docs/specs/<slug>.md`).

### Phase 4.5: Confirm With User

Before execution planning, present the crystallized draft and require explicit confirmation.

1. Show requirement summary, assumptions, edge cases, and open questions
2. Ask user to choose: confirm, revise, or defer
3. If revise, apply edits and re-show only changed sections
4. Persist confirmation decision and revision notes
5. Do not bridge to execution until status is `confirmed`

Confirmed output path should use dated folders:

- `docs/specs/YYYY/MM/<slug>.md`

Also maintain a normalized confirmation shape matching `docs/specs/CONFIRMED-TEMPLATE.md`.

### Phase 4.6: Knowledge Ingestion

After confirmation, ingest the requirement artifact into the wiki knowledge layer.

1. Run wiki ingestion from confirmed spec path
2. Update concept/decision pages with provenance back to interview session
3. Add candidate updates for reusable requirement patterns when confidence is not final
4. Record links to wiki outputs in interview session metadata

### Phase 5: Bridge To Execution

Offer:

1. `/plan` with generated spec
2. Complexity/risk estimate
3. First 2-3 implementation tasks
4. Suggested assumption and open-question resolution tasks

## Pressure Strategies

1. **Concrete examples** - force step-by-step scenario
2. **Hidden assumptions** - surface implied preconditions
3. **Boundary decision forcing** - choose one option now
4. **Root cause drilling** - clarify why and consequences
5. **Contradiction probing** - resolve conflicts with priorities
6. **Negative space exploration** - define explicit non-goals

## Session Management

### Start

- Generate `interview_id` (UUID) and `slug`
- Persist profile and threshold
- Persist initial scores

### Resume

- Load by `interview_id` or `slug`
- Replay transcript context
- Restore latest scores
- Continue from next round

### Complete

- Set `completed_at` and `status = completed`
- Persist final ambiguity
- Persist spec path
- Persist confirmed-spec path and wiki output references

### Persistence

Use SQLite tables in `.bbg/scripts/interview-schema.sql`:

- `interview_sessions`
- `interview_rounds`
- `interview_assumptions`
- `v_interview_effectiveness`

## Rules

- Ask one question per round
- Never assume an answer
- Always show score deltas
- Never skip pre-check
- Record all assumptions
- If user says "I don't know", keep as open question
- Require at least 2 rounds before crystallization
- Require explicit user confirmation before bridging to `/plan`
- Use dated spec paths (`docs/specs/YYYY/MM/...`) for confirmed artifacts

## Anti-patterns

- Leading questions
- Ignoring non-target dimensions for too long
- Accepting "it depends" without decomposition
- Skipping crystallization
- Treating heuristic score as absolute truth

## Checklist

- [ ] Depth profile chosen
- [ ] Initial scorecard shown
- [ ] Single focused question each round
- [ ] Scores updated each round
- [ ] Lenses applied at cadence
- [ ] Assumptions logged with status
- [ ] Spec includes all required sections
- [ ] Audit trail included
- [ ] Session persisted to SQLite
- [ ] Bridge to execution provided

## Related

- Skills: `skills/writing-plans/SKILL.md`, `skills/search-first/SKILL.md`, `skills/api-design/SKILL.md`
- Commands: `commands/interview.md`, `commands/interview-resume.md`
- Rules: `rules/common/patterns.md`
