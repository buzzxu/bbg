# Hermes Analyze Knowledge Lifecycle Design

**Date:** 2026-04-20  
**Status:** Draft  
**Scope:** Lifecycle design for flowing `bbg analyze` output into Hermes, wiki, runtime reuse, and back into future analysis  
**Related:**

- `2026-04-20-socratic-analyze-interview-design.md`
- `2026-04-20-bbg-analyze-ux-design.md`
- `2026-04-07-hermes-completion-design.md`

---

## 1. Goal

Define how knowledge produced by `bbg analyze` becomes:

1. durable project memory
2. runtime guidance for future work
3. Hermes candidate input for refinement and promotion
4. a continuously improving baseline for later analyze runs

This document answers one core question:

> How does analysis stop being a one-time report and become a governed, reusable, self-improving knowledge system?

---

## 2. Core Principle

### 2.1 Analyze Produces First-Class Knowledge

`bbg analyze` should be treated as a **knowledge-producing workflow**, not just a documentation workflow.

That means every successful run produces artifacts that are eligible to become:

- runtime task guidance
- canonical wiki memory
- Hermes candidates
- future rules, skills, and process knowledge

### 2.2 Trust Is Graduated

Not every analyze output should become trusted canon immediately.

The lifecycle must preserve a trust ladder:

| Layer | Artifact Type                               | Example                           | Trust                      |
| ----- | ------------------------------------------- | --------------------------------- | -------------------------- |
| L0    | Raw analyze output                          | `.bbg/knowledge/workspace/*.json` | structured but provisional |
| L1    | Human-readable wiki memory                  | `docs/wiki/concepts/*.md`         | canonical local memory     |
| L1.5  | Hermes candidate objects                    | draft flow/risk/rule candidates   | reviewable                 |
| L2    | Local promoted process/rule/skill knowledge | local stable guidance             | trusted local              |
| L3    | BBG-global promoted assets                  | reusable cross-project patterns   | trusted global             |

The system should never jump directly from low-confidence AI inference to globally trusted knowledge.

---

## 3. Lifecycle Overview

### 3.1 End-to-End Loop

```text
bbg analyze
  → write structured knowledge
  → write wiki summaries
  → register Hermes runtime artifacts
  → derive Hermes candidates
  → future task uses knowledge
  → implementation / review / verify produce new evidence
  → Hermes logs evaluation and outcomes
  → analyze refresh merges stronger evidence into next baseline
```

### 3.2 Lifecycle States

Each knowledge item should move through explicit states:

1. `observed`
2. `inferred`
3. `candidate`
4. `confirmed-local`
5. `promoted-local`
6. `eligible-global`
7. `promoted-global`
8. `stale`
9. `superseded`

Definitions:

- `observed`: directly extracted from code or config
- `inferred`: model-derived interpretation from multiple signals or LLM reasoning
- `candidate`: registered in Hermes for refinement/review
- `confirmed-local`: corroborated by task work, verification, or human answer
- `promoted-local`: trusted for local wiki/process/rule use
- `eligible-global`: stable enough to consider beyond the project
- `promoted-global`: promoted into BBG-global assets
- `stale`: sources changed enough that review is needed
- `superseded`: replaced by newer knowledge

---

## 4. Knowledge Object Model

### 4.1 Unifying Analyze and Hermes Objects

Analyze currently emits many JSON files. Hermes currently thinks in runs, artifacts, evaluations, and candidates. The missing piece is a shared object model at the knowledge-item level.

```typescript
interface AnalyzeKnowledgeItem {
  id: string;
  runId: string;
  kind:
    | "capability"
    | "critical-flow"
    | "contract-surface"
    | "domain-context"
    | "runtime-constraint"
    | "risk-item"
    | "decision-record"
    | "change-impact"
    | "analysis-dimension";
  title: string;
  summary: string;
  payloadPath: string;
  sourcePaths: string[];
  provenance: KnowledgeProvenance[];
  confidence: number;
  status:
    | "observed"
    | "inferred"
    | "candidate"
    | "confirmed-local"
    | "promoted-local"
    | "eligible-global"
    | "promoted-global"
    | "stale"
    | "superseded";
  supersedes: string[];
  supersededBy: string | null;
  relatedIds: string[];
  reviewRequired: boolean;
  freshness: {
    lastValidatedAt: string | null;
    lastTouchedSourceAt: string | null;
  };
}

interface KnowledgeProvenance {
  source:
    | "static-analysis"
    | "business-signal"
    | "interview-answer"
    | "llm-inference"
    | "task-runtime"
    | "verification"
    | "incident-review"
    | "human-confirmation";
  ref: string;
  confidenceImpact: number;
  note: string;
}
```

### 4.2 Why This Matters

Without item-level lifecycle metadata:

- analyze outputs are hard to track across runs
- Hermes cannot distinguish stable knowledge from tentative knowledge
- task verification cannot precisely confirm or reject prior analysis
- stale knowledge cannot be retired safely

---

## 5. Analyze Output to Hermes Candidate Flow

### 5.1 Candidate Creation Policy

Not every analyze item should become a Hermes candidate. Candidate creation should be selective.

Create Hermes candidates for analyze items when any of these are true:

1. the item is new and confidence is medium or high
2. the item changed materially from the previous analyze run
3. the item has high operational or business importance
4. the item introduces a project-specific analysis dimension
5. the item has implications for future rules, skills, or process docs

### 5.2 Candidate Worthiness by Item Type

| Analyze Item       | Candidate Worthiness | Typical Promotion Target                    |
| ------------------ | -------------------- | ------------------------------------------- |
| capability         | medium               | wiki concept / business module page         |
| critical-flow      | very high            | canonical wiki concept / process doc        |
| contract-surface   | high                 | architecture contract page / local rule     |
| domain-context     | high                 | domain model wiki page                      |
| runtime-constraint | high                 | rule / process / architecture doc           |
| risk-item          | high                 | risk page / verification checklist / rule   |
| decision-record    | medium-high          | decision page / process guidance            |
| change-impact      | medium               | runtime task guidance, not always canonical |
| analysis-dimension | very high            | future focused-analysis strategy            |

### 5.3 Candidate Registration Flow

```text
analyze completes
  → compare current knowledge items vs prior baseline
  → classify items as new / changed / unchanged / weakened
  → for new or materially changed high-value items:
       create hermes_candidates rows
       attach evidence links
       mark source_run_id = analyze run
       set draft target recommendation
```

Recommended draft targets:

- `critical-flow` → `wiki concept` or `process`
- `risk-item` → `wiki report`, `rule`, or `verification guidance`
- `runtime-constraint` → `rule` or `process`
- `analysis-dimension` → `local skill draft` or focused-analysis recipe

---

## 6. Reuse During Future Development

### 6.1 Runtime Consumption

Future `bbg start` and related task-routing workflows should continue reading `.bbg/knowledge/`, but should also benefit from Hermes-promoted knowledge.

Recommended retrieval order for development tasks:

1. current task context
2. local canonical wiki memory
3. promoted local rules and skills
4. current analyze knowledge items
5. local Hermes candidates
6. global promoted BBG knowledge
7. raw artifacts

This matches the Hermes memory-routing philosophy: canonical over candidate, local over remote, trusted over tentative.

### 6.2 What Task Execution Should Reuse

When a task starts, it should attempt to reuse:

- matched capabilities
- matched critical flows
- matched contracts
- matched risks
- matched decisions
- impacted repos and reviewer hints
- promoted local guidance derived from earlier analyze runs

### 6.3 What Task Execution Should Return

A task should produce back-reference evidence when it confirms or refutes prior knowledge.

Examples:

- a feature task confirms a previously inferred flow step
- a bug fix disproves an assumed failure mode
- a verification run confirms a risk hotspot is real
- an incident review introduces a new runtime constraint

That evidence should link back to the original knowledge item IDs.

---

## 7. Verification and Outcome Feedback

### 7.1 Verification as Confidence Uplift

Verification should be treated as the strongest non-human confidence signal for operational knowledge.

Confidence uplift order:

1. human confirmation
2. verification evidence
3. successful task execution with no contradiction
4. repeated code evidence across runs
5. LLM inference

### 7.2 Verification Outcomes

For each relevant knowledge item, verification can produce one of four outcomes:

- `confirmed`
- `refined`
- `contradicted`
- `unrelated`

```typescript
interface KnowledgeValidationResult {
  knowledgeItemId: string;
  outcome: "confirmed" | "refined" | "contradicted" | "unrelated";
  evidenceRefs: string[];
  notes: string;
  suggestedStatus: "confirmed-local" | "candidate" | "stale" | "superseded";
  confidenceDelta: number;
}
```

### 7.3 Regression and Incident Feedback

Incidents and regressions are especially valuable because they often reveal where analyze was too optimistic.

Incident evidence should be able to:

- increase risk severity
- downgrade confidence in a critical flow
- create a new runtime constraint
- split one domain context into two if the earlier model was wrong
- mark prior assumptions as rejected

---

## 8. Refresh and Baseline Update Policy

### 8.1 Analyze Must Be Incremental

Each analyze run should compare itself with the prior run and classify changes.

```text
previous baseline
  vs
current run
  → unchanged
  → strengthened
  → weakened
  → new
  → removed
```

### 8.2 Status Transition Rules

Recommended transitions:

| From            | Trigger                                 | To              |
| --------------- | --------------------------------------- | --------------- |
| observed        | multiple corroborating sources          | inferred        |
| inferred        | Hermes registration                     | candidate       |
| candidate       | confirmed by task/verify/human          | confirmed-local |
| confirmed-local | stable repeated validation              | promoted-local  |
| promoted-local  | cross-project evidence and verification | eligible-global |
| eligible-global | promotion decision                      | promoted-global |
| any             | source drift without validation         | stale           |
| any             | replaced by better item                 | superseded      |

### 8.3 Do Not Silently Rewrite History

If a new analyze run disagrees with a previous trusted item, the system should not overwrite silently.

It should:

1. create a newer candidate or revised item
2. link the conflict
3. downgrade or mark the older item as stale
4. require review before promotion or replacement

This preserves auditability and avoids knowledge corruption.

---

## 9. Local vs Global Hermes Responsibilities

### 9.1 Local Hermes

Project-local Hermes should own:

- intake of analyze outputs
- local candidate creation
- local refinement into wiki/process/rule/skill drafts
- runtime reuse in future tasks
- local verification-backed promotion

### 9.2 Central Hermes

BBG-central Hermes should only receive items that have already matured locally.

Escalation criteria for global consideration:

1. promoted-local or near-equivalent confidence
2. appears in multiple projects or stacks
3. evidence-backed beyond one repo/workspace
4. likely reusable as rule/skill/template/workflow

This avoids polluting global BBG assets with project-specific folklore.

---

## 10. Canonical Targets by Knowledge Type

### 10.1 Promotion Map

| Knowledge Type     | Default Local Canonical Target        | Possible Global Target             |
| ------------------ | ------------------------------------- | ---------------------------------- |
| capability         | wiki concept page                     | rarely global                      |
| critical-flow      | wiki concept or process page          | workflow guidance pattern          |
| contract-surface   | architecture doc / rule               | API governance rule                |
| domain-context     | wiki concept page                     | domain modeling guidance           |
| runtime-constraint | rule / process page                   | security/performance rule          |
| risk-item          | report / checklist / rule             | quality gate / verification rule   |
| decision-record    | wiki decision/process page            | sometimes reusable process pattern |
| change-impact      | task guidance only, usually local     | rarely global                      |
| analysis-dimension | focused-analysis recipe / skill draft | reusable analysis skill            |

### 10.2 Important Boundary

Some knowledge should remain local even if useful.

Examples:

- project-specific domain names
- one-off integration details
- repo-specific coupling hotspots
- organization-specific decision history

Global Hermes should only receive the reusable pattern, not the project’s private facts.

---

## 11. Recommended Implementation Phases

### Phase 1: Analyze Item Index

- generate stable item IDs for all major analyze outputs
- persist lifecycle metadata beside knowledge JSON
- record previous-run comparison

### Phase 2: Hermes Candidate Registration

- create candidates from selected analyze items
- attach evidence and recommended draft target
- expose analyze-origin candidates in Hermes commands

### Phase 3: Runtime Back-Reference Capture

- let task execution and verification emit validation results against knowledge item IDs
- store confirmation/refinement/contradiction events

### Phase 4: Local Promotion Policy

- define when a knowledge item becomes promoted-local
- automate wiki/process/rule draft generation from confirmed candidates

### Phase 5: Cross-Project Escalation

- intake mature local knowledge into central Hermes
- cluster reusable patterns
- verify before BBG-global promotion

---

## 12. Anti-Patterns

1. Treating analyze artifacts as disposable reports
2. Promoting low-confidence LLM inference directly into canonical rules
3. Overwriting earlier knowledge without recording contradiction or supersession
4. Sending project-specific details straight into global Hermes
5. Failing to let tasks and verification amend prior analysis
6. Storing only document-level provenance instead of item-level provenance
7. Splitting analyze, wiki, and Hermes into isolated systems with no shared IDs

---

## 13. Success Criteria

The lifecycle design succeeds when:

1. every successful analyze run produces reusable knowledge items with stable IDs
2. important new or changed analyze items are visible in Hermes candidate review
3. future tasks automatically benefit from prior analyze knowledge
4. verification and incidents can confirm or contradict prior knowledge precisely
5. the next analyze run becomes better because of evidence produced by real work
6. local knowledge improves continuously without polluting global BBG memory

---

## 14. Final Recommendation

The recommended posture is:

> `bbg analyze` should be the front door of project understanding, `.bbg/knowledge/` should be the runtime substrate, `docs/wiki/` should be the canonical human memory, and Hermes should be the governed learning engine that turns repeated, verified understanding into lasting reusable knowledge.

In short:

- analyze creates structured knowledge
- wiki makes it readable
- Hermes governs refinement and promotion
- tasks and verification enrich it
- later analyze runs start from a stronger baseline
