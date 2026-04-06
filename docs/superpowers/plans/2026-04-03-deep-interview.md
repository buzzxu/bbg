# Phase 7: Socratic Deep Interview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Socratic deep-interview skill for requirement elicitation with mathematical ambiguity scoring, deployed to target projects as governance content via `bbg init`.

**Architecture:** BBG is a generator — all new files are governance content that BBG copies to target projects. This phase creates 4 governance content files (1 skill, 2 commands, 1 SQL schema) and registers them in the governance manifest. BBG's own `src/` code only changes to register new templates; no runtime logic is added.

**Tech Stack:** Markdown (skill + commands), SQL (SQLite DDL), TypeScript (manifest registration + test updates), vitest (test assertions)

**Dependency:** Reuse the Phase 2 `BBG_SCRIPTS` pattern for `.bbg/scripts/*.sql` registration. (If `BBG_SCRIPTS` does not exist yet, create it using the same pattern defined in the telemetry phase.)

---

## File Structure

| File                                                  | Responsibility                                                                                                                                             | Action                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `skills/deep-interview/SKILL.md`                      | Complete Socratic interview methodology with 5-phase flow, 8 ambiguity dimensions, scoring formula, pressure strategies, analysis lenses, output templates | Create                                                 |
| `commands/interview.md`                               | Slash command to start a new deep interview session                                                                                                        | Create                                                 |
| `commands/interview-resume.md`                        | Slash command to resume an in-progress interview session                                                                                                   | Create                                                 |
| `templates/generic/.bbg/scripts/interview-schema.sql` | SQLite DDL for 3 tables + 1 view used by interview sessions                                                                                                | Create                                                 |
| `src/templates/governance.ts`                         | Register new skill, commands, and add `interview-schema.sql` to `BBG_SCRIPTS`                                                                              | Modify (lines 49-71, 126-151, BBG_SCRIPTS section)     |
| `tests/unit/templates/governance.test.ts`             | Update count assertions for new governance entries                                                                                                         | Modify (lines 64-66, 76-78, 100-101, 135-136, 183-184) |

---

### Task 1: Create the Deep Interview Skill

**Files:**

- Create: `skills/deep-interview/SKILL.md`

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p skills/deep-interview
```

- [ ] **Step 2: Write the complete SKILL.md**

Create `skills/deep-interview/SKILL.md` with the following content:

```markdown
---
name: deep-interview
category: requirements
description: Socratic deep-interview methodology for requirement elicitation with mathematical ambiguity scoring, structured follow-up pressure, and multi-lens analysis
---

# Deep Interview — Socratic Requirement Elicitation

## Overview

Use this skill when eliciting requirements for a new feature, system, or project. The deep interview uses a Socratic questioning methodology to systematically reduce ambiguity in requirements through structured rounds of probing questions, multi-lens analysis, and mathematical scoring.

The interview produces a crystallized specification with all assumptions surfaced, edge cases identified, and ambiguity reduced below a configurable threshold.

## When to Use

- Starting a new feature or project with vague requirements
- Clarifying acceptance criteria before implementation planning
- Discovering hidden assumptions in stakeholder requests
- Bridging the gap between business intent and technical specification
- Resuming a previously interrupted requirements session

## Depth Profiles

| Profile  | Threshold | Typical Rounds | Use Case                                                  |
| -------- | --------- | -------------- | --------------------------------------------------------- |
| Quick    | ≤ 0.30    | 3–5            | Small features, well-understood domains, time-constrained |
| Standard | ≤ 0.20    | 5–10           | Medium features, moderate complexity, default choice      |
| Deep     | ≤ 0.15    | 8–15           | Critical systems, novel domains, high-stakes decisions    |

Select the profile at session start. The interview continues until the composite ambiguity score drops below the profile threshold or the user explicitly ends the session.

## Ambiguity Scoring

### Composite Score Formula
```

A_composite = Σ(w_i × d_i) / Σ(w_i)

```

Where `d_i` is the ambiguity score (0.0–1.0) for dimension `i`, and `w_i` is the weight for that dimension. A score of 1.0 means fully ambiguous; 0.0 means fully specified.

### 8 Ambiguity Dimensions

| # | Dimension | Weight | Description | Example Ambiguity Signal |
|---|-----------|--------|-------------|--------------------------|
| 1 | Functional Scope | 0.20 | What the system does and does not do | "It should handle payments" (which types? refunds? disputes?) |
| 2 | Data Model | 0.15 | Entities, relationships, cardinality, lifecycle | "Users have orders" (1:N? N:M? soft delete? archival?) |
| 3 | Integration Boundaries | 0.15 | External systems, APIs, data flows | "It talks to Stripe" (which API version? webhook handling? retry policy?) |
| 4 | Error & Edge Cases | 0.15 | Failure modes, recovery, degraded operation | "It should be reliable" (what happens on timeout? partial failure? data corruption?) |
| 5 | Performance Constraints | 0.10 | Latency, throughput, concurrency, resource limits | "It should be fast" (p50 < 100ms? 10k concurrent users? batch size limits?) |
| 6 | Security & Access | 0.10 | Authentication, authorization, data protection | "Only admins can do it" (RBAC? ABAC? audit trail? PII handling?) |
| 7 | User Experience | 0.10 | Workflows, feedback, states, transitions | "Users can configure settings" (which settings? validation? undo? defaults?) |
| 8 | Operational Lifecycle | 0.05 | Deployment, monitoring, migration, deprecation | "We'll roll it out gradually" (feature flags? canary %? rollback trigger?) |

### Per-Dimension Scoring Guide

| Score Range | Label | Meaning |
|-------------|-------|---------|
| 0.8 – 1.0 | Opaque | No concrete details, only vague intent |
| 0.5 – 0.7 | Unclear | Some details but critical gaps remain |
| 0.3 – 0.4 | Partial | Most details present, a few gaps |
| 0.1 – 0.2 | Clear | Minor ambiguities, mostly specified |
| 0.0 | Resolved | Fully specified, no ambiguity |

After each interview round, re-score all 8 dimensions and recompute the composite score. Display the delta to show progress.

## Interview Flow

### Phase 1: Pre-check Context

Before asking any questions:

1. **Scan available context** — Read the user's initial description, any linked documents, existing code, and prior interview transcripts
2. **Score initial ambiguity** — Rate all 8 dimensions based on available information
3. **Identify highest-ambiguity dimensions** — Sort by `w_i × d_i` (weighted contribution) descending
4. **Select starting dimension** — Target the dimension with the highest weighted ambiguity contribution
5. **Report initial state** — Display the ambiguity scorecard to the user

Output the initial scorecard:

```

╔══════════════════════════════════════════════════╗
║ Deep Interview — Initial Ambiguity Assessment ║
╠══════════════════════════════════════════════════╣
║ Topic: [user's topic] ║
║ Profile: [Quick/Standard/Deep] ║
║ Threshold: [0.30/0.20/0.15] ║
╠════════════════════════╦═════╦════════╦══════════╣
║ Dimension ║ Wt ║ Score ║ Weighted ║
╠════════════════════════╬═════╬════════╬══════════╣
║ Functional Scope ║ .20 ║ d_1 ║ w×d ║
║ Data Model ║ .15 ║ d_2 ║ w×d ║
║ Integration Bounds ║ .15 ║ d_3 ║ w×d ║
║ Error & Edge Cases ║ .15 ║ d_4 ║ w×d ║
║ Performance ║ .10 ║ d_5 ║ w×d ║
║ Security & Access ║ .10 ║ d_6 ║ w×d ║
║ User Experience ║ .10 ║ d_7 ║ w×d ║
║ Operational Lifecycle ║ .05 ║ d_8 ║ w×d ║
╠════════════════════════╬═════╬════════╬══════════╣
║ COMPOSITE ║ ║ ║ A_comp ║
╚════════════════════════╩═════╩════════╩══════════╝

```

### Phase 2: Socratic Loop

Repeat until `A_composite ≤ threshold` or user ends session:

1. **Select target dimension** — Pick the dimension with the highest `w_i × d_i` that has not been addressed in the last 2 rounds (prevents fixation on one area)
2. **Select pressure strategy** — Choose the most effective follow-up type for the current dimension and conversation state (see Pressure Strategies below)
3. **Ask one focused question** — The question must be specific, concrete, and answerable. Never ask compound questions (no "and also..."). Prefer questions that force a decision between alternatives.
4. **Listen and record** — Record the user's answer verbatim
5. **Update scores** — Re-score the targeted dimension and any other dimensions affected by the answer
6. **Log the round** — Record round number, target dimension, question, answer, pressure type, scores before/after, and dimension deltas
7. **Report progress** — Show updated scorecard with deltas highlighted

Round output format:

```

── Round N ──────────────────────────────────────
Target: [dimension name]
Strategy: [pressure type]
Question: [the Socratic question]
Answer: [user's response]

Score Δ: [dimension]: d_before → d_after (Δ = -X.XX)
Composite: A_before → A_after (Δ = -X.XX)
Remaining: [distance to threshold]
─────────────────────────────────────────────────

```

### Phase 3: Analysis Lenses

After every 3 rounds (or when a dimension drops below 0.3), apply one or more analysis lenses to deepen understanding:

#### Lens 1: Temporal Analysis
- How does this behavior change over time?
- What is the initial state vs steady state vs sunset state?
- Are there time-bound constraints (deadlines, SLAs, retention periods)?

#### Lens 2: Failure Mode Analysis
- What happens when this component fails?
- What is the blast radius of a failure?
- What is the recovery path and acceptable recovery time?
- Are there circuit breakers, fallbacks, or degraded modes?

#### Lens 3: Scale Analysis
- What are the expected volumes (day 1 vs day 90 vs day 365)?
- Where are the bottlenecks at 10x current scale?
- Which operations are O(1) vs O(n) vs O(n²)?
- Are there batch vs real-time processing distinctions?

#### Lens 4: Stakeholder Analysis
- Who are all the actors that interact with this system?
- What are each actor's goals and constraints?
- Where do actor goals conflict?
- Who has the final decision authority on trade-offs?

#### Lens 5: Dependency Analysis
- What external systems does this depend on?
- What depends on this system?
- What happens when a dependency is unavailable?
- What are the version compatibility constraints?

Lens output format:

```

── Lens: [name] ─────────────────────────────────
Findings:

1. [concrete finding]
2. [concrete finding]
3. [concrete finding]

New questions surfaced:

- [question for next round]
- [question for next round]

Dimensions affected: [list with score deltas]
─────────────────────────────────────────────────

````

### Phase 4: Crystallize

When `A_composite ≤ threshold`, produce the crystallized specification:

1. **Requirements Summary** — Numbered list of concrete, testable requirements
2. **Data Model** — Entities, attributes, relationships, constraints
3. **Integration Map** — External systems, data flows, API contracts
4. **Assumptions Log** — Every assumption made during the interview, with status (confirmed/unconfirmed/rejected) and evidence
5. **Edge Cases** — Enumerated edge cases with expected behavior
6. **Open Questions** — Any remaining ambiguities that could not be resolved in the interview (with recommended resolution path)
7. **Ambiguity Audit Trail** — Full dimension score history showing how ambiguity was reduced

Output template:

```markdown
# Specification: [topic]

> Generated by deep-interview | Profile: [profile] | Rounds: [N] | Final ambiguity: [score]

## 1. Requirements

- **REQ-001**: [testable requirement]
- **REQ-002**: [testable requirement]
...

## 2. Data Model

| Entity | Attributes | Relationships | Constraints |
|--------|-----------|---------------|-------------|
| ...    | ...       | ...           | ...         |

## 3. Integration Map

| System | Direction | Protocol | Data Format | Error Handling |
|--------|-----------|----------|-------------|----------------|
| ...    | ...       | ...      | ...         | ...            |

## 4. Assumptions

| # | Assumption | Status | Evidence |
|---|-----------|--------|----------|
| A-001 | ... | confirmed | Round N answer |
| A-002 | ... | unconfirmed | needs stakeholder input |

## 5. Edge Cases

| # | Scenario | Expected Behavior | Priority |
|---|----------|-------------------|----------|
| E-001 | ... | ... | must-handle |
| E-002 | ... | ... | should-handle |

## 6. Open Questions

| # | Question | Recommended Resolution | Blocking? |
|---|----------|----------------------|-----------|
| Q-001 | ... | ... | yes/no |

## 7. Ambiguity Audit Trail

| Round | Dimension | Before | After | Δ | Composite |
|-------|-----------|--------|-------|---|-----------|
| 1     | ...       | ...    | ...   |...|  ...      |
````

Save the specification to the path configured in the session (default: `docs/specs/[slug].md`).

### Phase 5: Bridge to Execution

After crystallization, offer the transition to implementation:

1. **Suggest implementation plan** — Recommend using `/plan` with the generated spec as input
2. **Estimate complexity** — Based on the spec, estimate task count and risk level
3. **Identify first tasks** — Suggest 2–3 concrete starting tasks based on the requirements
4. **Link to task lifecycle** — If the project uses task tracking, propose task creation

Bridge output:

```
╔══════════════════════════════════════════════════╗
║  Interview Complete — Bridge to Execution         ║
╠══════════════════════════════════════════════════╣
║  Spec saved: docs/specs/[slug].md                 ║
║  Requirements: N total                            ║
║  Estimated tasks: M (S small, M medium, L large)  ║
║  Risk level: [low/medium/high]                    ║
║                                                    ║
║  Suggested next steps:                             ║
║  1. /plan "Implement [topic] per spec"             ║
║  2. Review assumptions A-NNN with stakeholders     ║
║  3. Resolve open questions Q-NNN                   ║
╚══════════════════════════════════════════════════╝
```

## Pressure Strategies

When a user's answer is vague, incomplete, or opens new ambiguity, apply one of these follow-up strategies:

### Strategy 1: Concrete Examples

**When:** User gives abstract or general answers
**Pattern:** "Can you give me a specific example of [X]? Walk me through exactly what happens step by step."

Example:

> User: "It should handle edge cases gracefully."
> Pressure: "Can you give me a specific example of an edge case you're worried about? Walk me through what happens when that case occurs — what does the user see, what does the system do?"

### Strategy 2: Hidden Assumption Surfacing

**When:** User's answer contains implicit assumptions
**Pattern:** "You mentioned [X]. That assumes [Y]. Is that correct? What if [Y] is not true?"

Example:

> User: "Users will always have an email address."
> Pressure: "That assumes every user signs up with email. What about SSO users who authenticate via SAML? Do they always have an email? What if the email field is null?"

### Strategy 3: Boundary Decision Forcing

**When:** User avoids making a specific decision or gives a range
**Pattern:** "If you had to choose exactly one of [A, B, C] right now, which would it be? What makes the others unacceptable?"

Example:

> User: "It should support multiple formats."
> Pressure: "If you had to ship with exactly one export format on day one, which would it be: CSV, JSON, or PDF? What would make the other two unacceptable to skip?"

### Strategy 4: Root Cause Drilling

**When:** User describes a symptom or desired outcome without explaining why
**Pattern:** "Why is [X] important? What problem does it solve? What happens if we don't do [X]?"

Example:

> User: "We need real-time updates."
> Pressure: "Why do updates need to be real-time? What's the actual latency requirement — sub-second, under 5 seconds, under a minute? What business process breaks if there's a 30-second delay?"

### Strategy 5: Contradiction Probing

**When:** Current answer conflicts with a previous answer or stated constraint
**Pattern:** "Earlier you said [X], but now you're saying [Y]. These seem to conflict. Which takes priority, and what's the trade-off?"

Example:

> User: Previously said "cost must be minimal" and now says "we need 99.99% uptime."
> Pressure: "Earlier you said cost must be minimal, but 99.99% uptime typically requires redundant infrastructure which increases cost significantly. Which constraint takes priority — budget or availability? What's the minimum uptime you'd accept at the lowest cost?"

### Strategy 6: Negative Space Exploration

**When:** User has described what the system should do but not what it should NOT do
**Pattern:** "What should the system explicitly NOT do? What's out of scope? What would be a misuse?"

Example:

> User: "The system manages user permissions."
> Pressure: "What should the permission system explicitly NOT handle? For example: should it NOT manage billing access? NOT handle temporary/time-boxed permissions? NOT support delegated administration?"

## Session Management

### Starting a Session

Sessions are identified by a unique `interview_id` (UUID v4) and a human-readable `slug` derived from the topic.

When starting a new session:

1. Generate `interview_id` and `slug`
2. Record the chosen profile and threshold
3. Score initial ambiguity
4. Insert a row into `interview_sessions` table

### Resuming a Session

When resuming an interrupted session:

1. Load the session by `interview_id` or `slug`
2. Replay the transcript to restore context
3. Display the most recent scorecard
4. Continue from the next round

### Completing a Session

When the interview completes (threshold reached or user ends):

1. Set `completed_at` timestamp and `status = 'completed'`
2. Record `final_ambiguity` score
3. Generate and save the crystallized specification
4. Update `spec_path` in the session record

### Data Persistence

All session data is stored in SQLite tables defined in `.bbg/scripts/interview-schema.sql`:

- `interview_sessions` — One row per interview session
- `interview_rounds` — One row per question-answer round
- `interview_assumptions` — Assumptions surfaced during the interview

The `v_interview_effectiveness` view provides aggregate effectiveness metrics across sessions grouped by profile.

## Integration Points

### Telemetry

- Each interview round emits a telemetry event with dimension scores
- Session start/complete events are logged to the telemetry trace
- Ambiguity reduction rate is tracked as a metric

### Task Lifecycle

- Crystallized specs can be fed directly to `/plan` for implementation planning
- Requirements (REQ-NNN) map to task acceptance criteria
- Assumptions (A-NNN) become verification tasks

### Context Engineering

- Interview transcripts are available as context for implementation sessions
- The crystallized spec is automatically included in task context bundles
- Prior interview sessions for the same topic are loaded for continuity

### Workflow

- The interview can be triggered as the first step in a workflow preset
- Workflow presets can require minimum interview depth before allowing implementation

## Rules

- Never ask compound questions — one question per round
- Never assume the answer — always wait for the user's response
- Always show the scorecard after each round — transparency builds trust
- Never skip Phase 1 (pre-check) — existing context prevents redundant questions
- Always record assumptions — even seemingly obvious ones
- Never pressure the user on non-technical decisions (business strategy, org politics)
- If the user says "I don't know," record it as an open question, don't force an answer
- Minimum 2 rounds before crystallization, even if threshold is met (prevents premature closure)

## Anti-patterns

- Asking leading questions that embed the "correct" answer
- Fixating on one dimension while ignoring others (the 2-round rotation rule prevents this)
- Accepting "it depends" without drilling into what it depends on
- Skipping the crystallization phase and going straight to implementation
- Treating the ambiguity score as an exact measurement (it's a heuristic guide)
- Asking permission questions ("Would it be okay if...") instead of decision questions ("Which of these two options...")
- Generating requirements without evidence from interview answers

## Checklist

- [ ] Selected appropriate depth profile for the task
- [ ] Completed Phase 1 pre-check and displayed initial scorecard
- [ ] Each round targets a specific dimension with a specific pressure strategy
- [ ] Scorecard is updated and displayed after every round
- [ ] Analysis lenses are applied every 3 rounds or when dimension drops below 0.3
- [ ] All assumptions are recorded with status
- [ ] Crystallized spec includes all 7 sections
- [ ] Ambiguity audit trail shows the full score history
- [ ] Session data is persisted to SQLite tables
- [ ] Bridge to execution is offered after crystallization

## Related

- **Skills**: [writing-plans](../writing-plans/SKILL.md), [search-first](../search-first/SKILL.md), [api-design](../api-design/SKILL.md)
- **Commands**: [/interview](../../commands/interview.md), [/interview-resume](../../commands/interview-resume.md)
- **Rules**: [patterns](../../rules/common/patterns.md)

````

- [ ] **Step 3: Verify the file exists and has expected line count**

```bash
wc -l skills/deep-interview/SKILL.md
````

Expected: approximately 280–310 lines (200+ lines of content).

- [ ] **Step 4: Commit**

```bash
git add skills/deep-interview/SKILL.md
git commit -m "feat: add deep-interview Socratic requirement elicitation skill"
```

---

### Task 2: Create the /interview Command

**Files:**

- Create: `commands/interview.md`

- [ ] **Step 1: Write the complete command file**

Create `commands/interview.md` with the following content:

```markdown
# /interview

## Description

Start a new Socratic deep-interview session for requirement elicitation. Uses structured questioning with mathematical ambiguity scoring to systematically reduce vagueness in requirements until a configurable threshold is reached.

## Usage
```

/interview "feature description"
/interview "Build a notification system for order status updates"
/interview "Add multi-tenant support" --profile deep
/interview "CSV export feature" --profile quick

```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--profile` | `standard` | Depth profile: `quick` (≤0.30), `standard` (≤0.20), or `deep` (≤0.15) |
| `--slug` | auto-generated | Human-readable session identifier |
| `--spec-dir` | `docs/specs` | Directory to save the crystallized specification |

## Process
1. **Initialize session** — Generate interview ID, derive slug from topic, record in SQLite
2. **Pre-check context** — Scan codebase and conversation for existing context about the topic
3. **Score initial ambiguity** — Rate all 8 dimensions, display the ambiguity scorecard
4. **Socratic loop** — Ask focused questions targeting highest-ambiguity dimensions, re-score after each answer
5. **Apply analysis lenses** — Every 3 rounds, apply temporal/failure/scale/stakeholder/dependency lenses
6. **Crystallize** — When ambiguity drops below threshold, generate the structured specification
7. **Bridge to execution** — Suggest next steps: `/plan`, stakeholder reviews, open question resolution

## Output
- Real-time ambiguity scorecard updated after each round
- Round-by-round transcript with dimension targeting and pressure strategies
- Crystallized specification saved to `[spec-dir]/[slug].md`
- Session data persisted in `.bbg/telemetry.db` (interview tables)

## Rules
- One question per round — never ask compound questions
- Always display the scorecard after each round
- Minimum 2 rounds before crystallization even if threshold is met
- Record every assumption, even seemingly obvious ones
- If user says "I don't know," log as open question — don't force an answer

## Examples
```

/interview "User authentication with OAuth2 and magic links"
/interview "Real-time collaboration for document editing" --profile deep
/interview "Add Stripe billing integration" --profile quick --slug stripe-billing

```

## Related

- **Skills**: [deep-interview](../skills/deep-interview/SKILL.md), [writing-plans](../skills/writing-plans/SKILL.md), [api-design](../skills/api-design/SKILL.md)
- **Commands**: [/interview-resume](./interview-resume.md), [/plan](./plan.md)
- **Rules**: [patterns](../rules/common/patterns.md)
```

- [ ] **Step 2: Verify the file exists**

```bash
wc -l commands/interview.md
```

Expected: approximately 50–60 lines.

- [ ] **Step 3: Commit**

```bash
git add commands/interview.md
git commit -m "feat: add /interview command for starting deep-interview sessions"
```

---

### Task 3: Create the /interview-resume Command

**Files:**

- Create: `commands/interview-resume.md`

- [ ] **Step 1: Write the complete command file**

Create `commands/interview-resume.md` with the following content:

```markdown
# /interview-resume

## Description

Resume an in-progress Socratic deep-interview session. Loads the session context, replays the transcript, displays the current ambiguity scorecard, and continues the Socratic loop from where it left off.

## Usage
```

/interview-resume
/interview-resume --slug stripe-billing
/interview-resume --id a1b2c3d4-e5f6-7890-abcd-ef1234567890
/interview-resume --last

```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--slug` | — | Resume by human-readable slug |
| `--id` | — | Resume by interview UUID |
| `--last` | — | Resume the most recent in-progress session |
| `--list` | — | List all in-progress sessions with their current ambiguity scores |

If no flag is provided and there is exactly one in-progress session, it resumes automatically. If multiple sessions are in progress, a selection prompt is displayed.

## Process
1. **Find session** — Locate the session by slug, ID, or most-recent query
2. **Load transcript** — Read all rounds from `interview_rounds` table
3. **Restore scores** — Reconstruct current dimension scores from the last round's `dimension_scores` JSON
4. **Display state** — Show the current ambiguity scorecard and a summary of previous rounds
5. **Continue loop** — Resume the Socratic loop from the next round number

## Output
- Session summary: topic, profile, rounds completed, current ambiguity score
- Abbreviated transcript of previous rounds (question + answer, 1 line each)
- Current ambiguity scorecard
- Continued interview from next round

## List Output
When using `--list`:
```

In-progress interview sessions:

# Slug Profile Rounds Ambiguity Started

1 stripe-billing standard 4 0.42 2026-04-03 10:15
2 auth-system deep 7 0.28 2026-04-02 14:30

```

## Rules
- Never re-ask questions that were already answered in previous rounds
- Always display the restored scorecard before continuing
- If the session is already completed, display a message and suggest starting a new interview
- Preserve the original profile and threshold — do not allow changing mid-session

## Examples
```

/interview-resume # Auto-select or prompt
/interview-resume --slug stripe-billing # Resume by slug
/interview-resume --last # Resume most recent
/interview-resume --list # Show all in-progress

```

## Related

- **Skills**: [deep-interview](../skills/deep-interview/SKILL.md)
- **Commands**: [/interview](./interview.md)
```

- [ ] **Step 2: Verify the file exists**

```bash
wc -l commands/interview-resume.md
```

Expected: approximately 55–65 lines.

- [ ] **Step 3: Commit**

```bash
git add commands/interview-resume.md
git commit -m "feat: add /interview-resume command for resuming interview sessions"
```

---

### Task 4: Create the Interview Schema SQL File

**Files:**

- Create: `templates/generic/.bbg/scripts/interview-schema.sql`

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p templates/generic/.bbg/scripts
```

- [ ] **Step 2: Write the complete SQL schema file**

Create `templates/generic/.bbg/scripts/interview-schema.sql` with the following content:

```sql
-- Deep Interview Module Schema
-- Initialized by session-start.js hook (idempotent)

CREATE TABLE IF NOT EXISTS interview_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  interview_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL,
  profile TEXT NOT NULL,
  topic TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  rounds INTEGER DEFAULT 0,
  initial_ambiguity REAL DEFAULT 1.0,
  final_ambiguity REAL,
  threshold REAL NOT NULL,
  spec_path TEXT,
  transcript_path TEXT
);

CREATE TABLE IF NOT EXISTS interview_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  interview_id TEXT NOT NULL REFERENCES interview_sessions(interview_id),
  round_num INTEGER NOT NULL,
  target_dimension TEXT NOT NULL,
  lens_used TEXT,
  question TEXT NOT NULL,
  answer TEXT,
  ambiguity_before REAL,
  ambiguity_after REAL,
  dimension_scores TEXT,
  pressure_type TEXT
);

CREATE TABLE IF NOT EXISTS interview_assumptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  interview_id TEXT NOT NULL,
  assumption TEXT NOT NULL,
  status TEXT NOT NULL,
  verified_at TEXT,
  evidence TEXT
);

CREATE VIEW IF NOT EXISTS v_interview_effectiveness AS
SELECT profile, COUNT(*) AS total_sessions,
  AVG(rounds) AS avg_rounds,
  AVG(initial_ambiguity - final_ambiguity) AS avg_ambiguity_reduction,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
FROM interview_sessions GROUP BY profile;
```

- [ ] **Step 3: Verify the file exists**

```bash
wc -l templates/generic/.bbg/scripts/interview-schema.sql
```

Expected: approximately 48 lines.

- [ ] **Step 4: Commit**

```bash
git add templates/generic/.bbg/scripts/interview-schema.sql
git commit -m "feat: add SQLite schema for deep-interview session persistence"
```

---

### Task 5: Write Failing Test for Updated Governance Counts

**Files:**

- Modify: `tests/unit/templates/governance.test.ts`

The governance manifest changes will add:

- 1 new entry to `CORE_SKILLS`
- 2 new entries to `CORE_COMMANDS`
- 1 new SQL file added to `BBG_SCRIPTS` (`interview-schema.sql`)

Total impact is **+4** in each tested scenario (core / TypeScript / TS+Python), applied on top of the **current** baseline in the test file.

- [ ] **Step 1: Update the base config test assertions**

In `tests/unit/templates/governance.test.ts`, update the first test (`generates core governance files for minimal config`).

Increment the skills count assertion by **+1**.

```typescript
// Core + operations skills: 21 + 18 = 39
const skillTasks = tasks.filter((t) => t.destination.startsWith("skills/"));
expect(skillTasks).toHaveLength(39);
```

to:

```typescript
// Core + operations skills: 22 + 18 = 40
const skillTasks = tasks.filter((t) => t.destination.startsWith("skills/"));
expect(skillTasks).toHaveLength(40);
```

Increment the commands count assertion by **+2**.

```typescript
// Core commands: 24
const commandTasks = tasks.filter((t) => t.destination.startsWith("commands/"));
expect(commandTasks).toHaveLength(24);
```

to:

```typescript
// Core commands: 26
const commandTasks = tasks.filter((t) => t.destination.startsWith("commands/"));
expect(commandTasks).toHaveLength(26);
```

Add after the MCP configs block (after line 98) and before the total assertion, a new assertion block for `.bbg/` scripts:

```typescript
// .bbg scripts: 1 (interview schema)
const bbgScriptTasks = tasks.filter((t) => t.destination.startsWith(".bbg/"));
expect(bbgScriptTasks).toHaveLength(1);
expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/interview-schema.sql");
```

Increment the first test's total assertion by **+4**.

Example: `97 -> 101`.

- [ ] **Step 2: Update the TypeScript config test assertion**

Increment the TypeScript test total assertion by **+4**.

Example: `111 -> 115`.

- [ ] **Step 3: Update the multi-language config test assertion**

Increment the TS+Python test total assertion by **+4**.

Example: `124 -> 128`.

- [ ] **Step 4: Add assertions for new skill and command destinations**

In the first test, after the existing skill `toContain` assertion (line 68), add:

```typescript
expect(skillTasks.map((t) => t.destination)).toContain("skills/deep-interview/SKILL.md");
```

After the existing command `toContain` assertion (line 80), add:

```typescript
expect(commandTasks.map((t) => t.destination)).toContain("commands/interview.md");
expect(commandTasks.map((t) => t.destination)).toContain("commands/interview-resume.md");
```

- [ ] **Step 5: Run the test to verify it fails**

```bash
npm test -- --run tests/unit/templates/governance.test.ts
```

Expected: FAIL — the governance manifest has not been updated yet, so counts and destinations will not match.

- [ ] **Step 6: Commit the failing test**

```bash
git add tests/unit/templates/governance.test.ts
git commit -m "test: update governance manifest count assertions for deep-interview (RED)"
```

---

### Task 6: Register Deep Interview in Governance Manifest

**Files:**

- Modify: `src/templates/governance.ts` (lines 49-71, 126-151, and `BBG_SCRIPTS` section)

- [ ] **Step 1: Add "deep-interview" to CORE_SKILLS array**

In `src/templates/governance.ts`, change the `CORE_SKILLS` array (lines 49–71):

```typescript
const CORE_SKILLS = [
  "coding-standards",
  "tdd-workflow",
  "security-review",
  "verification-loop",
  "search-first",
  "writing-plans",
  "continuous-learning",
  "eval-harness",
  "strategic-compact",
  "api-design",
  "backend-patterns",
  "database-migrations",
  "postgres-patterns",
  "frontend-patterns",
  "e2e-testing",
  "deployment-patterns",
  "docker-patterns",
  "kubernetes-patterns",
  "harness-engineering",
  "autonomous-loops",
  "mcp-integration",
];
```

to:

```typescript
const CORE_SKILLS = [
  "coding-standards",
  "tdd-workflow",
  "security-review",
  "verification-loop",
  "search-first",
  "writing-plans",
  "continuous-learning",
  "eval-harness",
  "strategic-compact",
  "api-design",
  "backend-patterns",
  "database-migrations",
  "postgres-patterns",
  "frontend-patterns",
  "e2e-testing",
  "deployment-patterns",
  "docker-patterns",
  "kubernetes-patterns",
  "harness-engineering",
  "autonomous-loops",
  "mcp-integration",
  "deep-interview",
];
```

- [ ] **Step 2: Add "interview" and "interview-resume" to CORE_COMMANDS array**

Change the `CORE_COMMANDS` array (lines 126–151):

```typescript
const CORE_COMMANDS = [
  "plan",
  "tdd",
  "code-review",
  "build-fix",
  "security-scan",
  "refactor-clean",
  "e2e",
  "test-coverage",
  "update-docs",
  "doctor",
  "learn",
  "learn-eval",
  "checkpoint",
  "verify",
  "sessions",
  "eval",
  "orchestrate",
  "loop-start",
  "loop-status",
  "quality-gate",
  "harness-audit",
  "model-route",
  "setup-pm",
  "sync",
];
```

to:

```typescript
const CORE_COMMANDS = [
  "plan",
  "tdd",
  "code-review",
  "build-fix",
  "security-scan",
  "refactor-clean",
  "e2e",
  "test-coverage",
  "update-docs",
  "doctor",
  "learn",
  "learn-eval",
  "checkpoint",
  "verify",
  "sessions",
  "eval",
  "orchestrate",
  "loop-start",
  "loop-status",
  "quality-gate",
  "harness-audit",
  "model-route",
  "setup-pm",
  "sync",
  "interview",
  "interview-resume",
];
```

- [ ] **Step 3: Add `interview-schema.sql` to `BBG_SCRIPTS`**

In `src/templates/governance.ts`, locate the `BBG_SCRIPTS` array (established by Phase 2) and append `"interview-schema.sql"`.

Example change:

```typescript
// Before:
const BBG_SCRIPTS = ["telemetry-init.sql", "telemetry-report.sql"];

// After:
const BBG_SCRIPTS = ["telemetry-init.sql", "telemetry-report.sql", "interview-schema.sql"];
```

The existing BBG scripts loop should then copy it automatically:

```typescript
for (const script of BBG_SCRIPTS) {
  tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- --run tests/unit/templates/governance.test.ts
```

Expected: PASS — all 5 tests pass with updated counts.

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 7: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: Zero TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register deep-interview skill, commands, and schema in governance manifest"
```

---

### Task 7: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: All tests pass, including the updated governance manifest tests.

- [ ] **Step 2: Run the build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Verify all new files exist on disk**

```bash
ls -la skills/deep-interview/SKILL.md commands/interview.md commands/interview-resume.md templates/generic/.bbg/scripts/interview-schema.sql
```

Expected: All 4 files exist.

- [ ] **Step 4: Verify governance manifest exports the new entries**

```bash
node -e "
const { GOVERNANCE_MANIFEST } = require('./dist/templates/governance.js');
console.log('CORE_SKILLS includes deep-interview:', GOVERNANCE_MANIFEST.coreSkills.includes('deep-interview'));
console.log('CORE_COMMANDS includes interview:', GOVERNANCE_MANIFEST.coreCommands.includes('interview'));
console.log('CORE_COMMANDS includes interview-resume:', GOVERNANCE_MANIFEST.coreCommands.includes('interview-resume'));
console.log('CORE_SKILLS count:', GOVERNANCE_MANIFEST.coreSkills.length);
console.log('CORE_COMMANDS count:', GOVERNANCE_MANIFEST.coreCommands.length);
"
```

Expected:

```
CORE_SKILLS includes deep-interview: true
CORE_COMMANDS includes interview: true
CORE_COMMANDS includes interview-resume: true
CORE_SKILLS count: 22
CORE_COMMANDS count: 26
```

Note: If the project uses ESM and `require` does not work, use:

```bash
node --input-type=module -e "
import { GOVERNANCE_MANIFEST } from './dist/templates/governance.js';
console.log('CORE_SKILLS includes deep-interview:', GOVERNANCE_MANIFEST.coreSkills.includes('deep-interview'));
console.log('CORE_COMMANDS includes interview:', GOVERNANCE_MANIFEST.coreCommands.includes('interview'));
console.log('CORE_COMMANDS includes interview-resume:', GOVERNANCE_MANIFEST.coreCommands.includes('interview-resume'));
console.log('CORE_SKILLS count:', GOVERNANCE_MANIFEST.coreSkills.length);
console.log('CORE_COMMANDS count:', GOVERNANCE_MANIFEST.coreCommands.length);
"
```

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: Zero lint errors.

---

## Summary

| Task | Description                      | Files                                                                    | Commits |
| ---- | -------------------------------- | ------------------------------------------------------------------------ | ------- |
| 1    | Create deep-interview SKILL.md   | `skills/deep-interview/SKILL.md`                                         | 1       |
| 2    | Create /interview command        | `commands/interview.md`                                                  | 1       |
| 3    | Create /interview-resume command | `commands/interview-resume.md`                                           | 1       |
| 4    | Create interview SQLite schema   | `templates/generic/.bbg/scripts/interview-schema.sql`                    | 1       |
| 5    | Write failing test (RED)         | `tests/unit/templates/governance.test.ts`                                | 1       |
| 6    | Register in manifest (GREEN)     | `src/templates/governance.ts`, `tests/unit/templates/governance.test.ts` | 1       |
| 7    | Final verification               | —                                                                        | 0       |

**Total:** 6 commits, 6 files created/modified, ~15 steps
