# Hermes Completion Design

## Goal

Complete Hermes as a dual-layer governed learning system for BBG:

1. **Local Hermes** inside each generated target project captures execution, evaluates outcomes, distills candidate knowledge, and refines trusted local memory.
2. **Central Hermes** inside BBG aggregates cross-project candidates, verifies reusable patterns, and promotes validated assets into global skills, rules, templates, and workflows.

The design goal is not blind autonomy. Hermes should become more capable over time through evidence-backed learning, while keeping human-readable wiki content and governed promotion decisions as the source of trust.

## Product Definition

Hermes is a dual-layer, governed learning system:

- **project-local learning first** so each target project becomes better at its own work
- **cross-project distillation second** so BBG itself becomes better at generating future projects
- **promotion only after verification** so repeated experience becomes trusted skill, not accidental folklore

## Current State After K1-K5

BBG already has the following foundations:

- governance generation for `agents/`, `skills/`, `rules/`, `commands/`, `hooks/`, `contexts/`, and `workflows/`
- project knowledge structure in `docs/raw/`, `docs/wiki/`, and `.bbg/knowledge.db`
- wiki workflows for ingest, query, lint, compile, refresh, audit, stale review, and promotion
- trust-oriented knowledge metadata for freshness, contradictions, summary layers, query history, and candidate updates

What is still missing is the full Hermes learning loop:

- unified runtime execution records
- unified evaluation records
- first-class candidate objects across more than wiki updates
- local refinement and promotion pipelines
- cross-project candidate intake and verification
- skill-generation and skill-promotion machinery
- meta-learning about which workflows and skills work best

## Target Architecture

### Layer 1: Local Hermes

Each generated target project should contain a local Hermes runtime with these responsibilities:

- capture task execution and artifacts
- evaluate success, quality, reproducibility, and reuse potential
- distill candidate knowledge from runs and evaluations
- refine candidates into local canonical wiki pages, local skills, local rules, or local process docs
- decide whether a candidate remains local or should be escalated upward
- route future queries through trusted local memory before broader memory layers

### Layer 2: Central Hermes

BBG itself should host a central Hermes layer with these responsibilities:

- intake candidate assets from many projects
- normalize and cluster similar candidates
- verify reusable patterns with evals and benchmark tasks
- promote verified assets into global BBG skills, rules, templates, and workflows
- distribute promoted assets back into future generations of target projects

### Core Principle

**Local first, central second. Candidate first, promotion later. Evidence before trust.**

## End-to-End Learning Loop

Hermes should eventually support this governed loop:

1. **Execute** — a task, workflow, or agent run happens
2. **Evaluate** — the outcome is scored for correctness, quality, reproducibility, and reuse potential
3. **Distill** — the system extracts candidate knowledge from repeated or high-value runs
4. **Refine** — the candidate becomes a local wiki update, local skill draft, local rule draft, or local process update
5. **Promote** — the refined object is either kept local, escalated to org scope, escalated to BBG-global scope, or rejected
6. **Reuse** — future tasks consult the best available local or global memory before acting

## Memory Architecture

### L0 — Operational Memory

Short-lived execution memory:

- current task state
- recent commands
- runtime artifacts
- transient failures and retries

### L1 — Local Canonical Memory

Trusted project-local knowledge:

- canonical wiki pages
- local rules
- local skills
- local processes

### L1.5 — Local Candidate Memory

Not-yet-promoted project-local drafts:

- candidate wiki updates
- draft local skills
- draft rule changes
- candidate process updates

### L2 — Org or Team Memory

Reusable but not global assets:

- team playbooks
- org conventions
- stack-specific guidance shared across related repos

### L3 — BBG Global Distilled Memory

Cross-project verified assets:

- global skills
- global rules
- workflow templates
- benchmark-backed patterns

### L4 — Meta-Learning Memory

Knowledge about what learning and execution strategies work best:

- which skill combinations produce the highest success rate
- which workflow sequences minimize retries and cost
- which candidates most often deserve promotion
- which task types should route to which skills first

## Query and Memory Routing

Future Hermes routing should follow this retrieval order:

1. current task context
2. local canonical memory
3. local stable skills and rules
4. local candidate memory
5. org memory
6. BBG global distilled memory
7. raw sources and runtime artifacts

Routing should prioritize:

- canonical over candidate
- local over remote
- trusted over ambiguous
- fresher over stale
- contradiction-free over open-contradiction knowledge

## Core Data Model for K6

K6 is the first completion phase after K1-K5. Its purpose is to create the structured learning substrate needed by every later Hermes phase.

### `hermes_runs`

Represents a single execution attempt.

Suggested fields:

- `run_id`
- `task_type`
- `task_ref`
- `project_scope`
- `agent_used`
- `skill_used`
- `workflow_used`
- `input_ref`
- `started_at`
- `ended_at`
- `status`
- `error_kind`

### `hermes_run_artifacts`

Represents outputs created or consumed by a run.

Suggested fields:

- `run_id`
- `artifact_type`
- `artifact_ref`
- `content_hash`
- `provenance_kind`

### `hermes_evaluations`

Represents the evaluation of a run.

Suggested fields:

- `run_id`
- `correctness`
- `quality`
- `reproducibility`
- `regression_risk`
- `reuse_potential`
- `confidence`
- `evaluated_at`

### `hermes_candidates`

Represents a distilled candidate object.

Suggested fields:

- `candidate_id`
- `source_run_id`
- `candidate_type`
- `proposed_target`
- `rationale`
- `confidence`
- `status`
- `created_at`
- `reviewed_at`

### `hermes_candidate_evidence`

Links candidates to supporting runs, artifacts, pages, and evaluations.

## Candidate Taxonomy

Hermes should treat candidates as first-class objects with explicit type boundaries:

- `wiki`
- `skill`
- `rule`
- `workflow`
- `eval`
- `memory`

This avoids collapsing every useful pattern into wiki-only updates and prepares the system for later skill-generation and workflow-generation phases.

## Promotion Model

Every candidate should end in one of these states:

- `local_only`
- `org_level`
- `global_bbg`
- `rejected`
- `superseded`

Promotion should require evidence, not intuition.

Suggested promotion gates:

- enough supporting evidence
- repeated success, not a single lucky run
- acceptable confidence level
- no unresolved contradictions that invalidate the recommendation
- freshness still current enough to matter
- successful verification for higher-scope promotion

## Skill Generation Model

Hermes should **not** auto-promote every successful task into a skill.

Recommended skill-generation flow:

1. detect repeated, high-value, reusable patterns
2. create a draft skill from run history and distilled rationale
3. create verification tasks or benchmark cases for that draft skill
4. verify the draft skill with the eval harness
5. promote to local, org, or global scope only after verification
6. demote or supersede if later evidence weakens it

This keeps the system from becoming noisy, brittle, or full of accidental folklore.

## Hermes Completion Gap List

The remaining gaps after K1-K5 are:

1. missing unified runtime execution model
2. missing unified evaluation model
3. missing first-class candidate model across multiple candidate types
4. missing local distillation and refinement pipeline
5. missing local skill layering and local memory routing
6. missing cross-project candidate intake and aggregation
7. missing skill verification and promotion engine
8. missing meta-learning metrics and optimization logic

## Recommended Phase Map

### K6 — Runtime / Eval / Candidate Model

Build the structured data substrate:

- run schema
- artifact registry
- evaluation schema
- candidate schema
- minimum local queryability

### K7 — Local Distillation and Refinement

Convert structured evidence into local draft knowledge and local canonical knowledge.

### K8 — Local Memory Router

Route future work through local wiki, local skills, local rules, and local candidates.

### K9 — Cross-Project Candidate Intake

Collect and normalize candidate objects across multiple BBG-generated projects.

### K10 — Skill Verification and Promotion Engine

Verify draft skills and promote reusable assets into BBG-global scope.

### K11 — Meta-Learning Layer

Optimize which workflows, skills, and routing strategies are selected over time.

## Scope Boundaries

Hermes completion should not begin by introducing:

- vector search as the first answer to memory routing
- external black-box trust services
- automatic self-editing without review boundaries
- forced promotion of every durable answer
- opaque trust scores without evidence trails

These may become future extensions, but they are not the core of a governed Hermes system.

## Recommended Immediate Next Step

The first implementation phase should be **K6: Hermes runtime / eval / candidate data model**.

Why K6 first:

- every later phase depends on structured evidence
- it creates the raw material needed for distillation and promotion
- it allows local learning to become queryable instead of anecdotal
- it avoids prematurely generating skills before the system can verify them

## Success Criteria for Hermes Completion

Hermes can be considered substantially complete only when:

- execution and evaluation are recorded structurally
- candidate knowledge is generated systematically
- local project memory improves project-specific execution
- verified reusable patterns can graduate into higher scopes
- BBG can distill cross-project lessons into global assets
- the system can measure that performance improves over time
