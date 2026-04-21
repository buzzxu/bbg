# Socratic Analyze Interview -- AI-Driven Business Comprehension Design

> **Status**: Draft  
> **Created**: 2026-04-20  
> **Scope**: `bbg analyze` pipeline deep-interview redesign  
> **Prerequisite**: Current `src/analyze/deep-interview.ts` (v1), existing `skills/deep-interview/SKILL.md` plan

---

## 1. Problem Statement

### 1.1 Current State Diagnosis

The existing `deep-interview.ts` (516 lines) operates as a **template-based gap-filler**, not a Socratic interviewer:

| Aspect       | Current Behavior                                      | Problem                                                                          |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Questions    | 6 predefined strings, fixed order                     | Cannot adapt to project-specific domain                                          |
| Triggering   | Fires once, single-pass                               | No iterative deepening based on answers                                          |
| Scoring      | Formula-based (`0.2 + count * 0.14`)                  | Confidence is arithmetic, not semantic                                           |
| Non-TTY mode | Generates canned assumptions from regex               | Assumptions are generic, not derived from actual code understanding              |
| Integration  | Results only feed `constraints`, `decisions`, `risks` | Does not influence `capabilities`, `flows`, `contracts`, `dimensions`            |
| Adaptivity   | Zero                                                  | Same 6 questions whether the project is an e-commerce platform or an IoT gateway |

The existing skill plan (`2026-04-03-deep-interview.md`) defines a Socratic methodology for **requirement elicitation** (new features), but does **not** address the analyze pipeline's need: **understanding an existing codebase's business logic through code-evidence-driven questioning**.

### 1.2 Target State

A Socratic interview system that:

1. **Generates questions from code evidence**, not from a fixed template
2. **Adapts question dimensions to the project's actual domain** (e-commerce gets different questions than a CMS)
3. **Iteratively deepens understanding** -- each answer refines the next question
4. **Directly shapes all 9 knowledge model outputs**, not just 3
5. **Works in 3 modes**: human-interactive, AI-agent-driven, fully-autonomous (LLM self-interview)
6. **Supports session persistence and resumption** across multiple `bbg analyze` runs

---

## 2. Architecture Overview

### 2.1 Three-Layer Design

```
┌─────────────────────────────────────────────────────────────────┐
│              Layer 3: Interview Orchestration                    │
│  Session lifecycle, mode selection, round management,           │
│  persistence, resume, convergence detection                     │
├─────────────────────────────────────────────────────────────────┤
│              Layer 2: Socratic Engine                            │
│  Question generation, pressure strategies, contradiction        │
│  detection, dimension targeting, score computation              │
├─────────────────────────────────────────────────────────────────┤
│              Layer 1: Evidence Collector                         │
│  Code signal extraction, ambiguity detection from analysis      │
│  artifacts, knowledge gap identification from evidence          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Pipeline Integration Point

```
orchestrator.ts (current flow):

  discovery
    → technical-analysis (4 basic analyzers)
    → business-signal-extraction
    → business-analysis
    → workspace-fusion
    → focus-analysis
    → deep-interview  ← ★ REDESIGN TARGET
    → knowledge-model-build
    → emit-docs / emit-knowledge / emit-wiki

orchestrator.ts (proposed flow):

  discovery
    → technical-analysis
    → business-signal-extraction
    → business-analysis
    → workspace-fusion
    → focus-analysis
    → ★ socratic-interview (iterative, multi-round)
    │     ↕ feeds back into ↕
    │   knowledge-model-build (incremental)
    │     ↕ generates new questions from ↕
    │   knowledge-gap-detection
    │     → loop until convergence
    → final knowledge-model-build
    → emit-docs / emit-knowledge / emit-wiki
```

**Key change**: The interview is no longer a single phase that runs once. It becomes an **iterative loop** that alternates between questioning and model-building until the knowledge model converges or the round budget is exhausted.

---

## 3. Detailed Design

### 3.1 Layer 1: Evidence Collector

#### 3.1.1 Purpose

Transform raw analysis artifacts into structured **evidence items** that the Socratic Engine can reason about. Each evidence item carries a clarity score indicating how well-understood that piece of knowledge is.

#### 3.1.2 Evidence Item Schema

```typescript
interface EvidenceItem {
  id: string; // stable hash of source + content
  source: EvidenceSource;
  category: EvidenceCategory;
  content: string; // human-readable description
  codeReferences: CodeReference[]; // file:line pointers
  clarity: number; // 0.0 = opaque, 1.0 = crystal clear
  clarityRationale: string; // why this clarity score
  relatedDimensions: AnalyzeDimension[]; // which interview dimensions this touches
  contradictions: string[]; // IDs of other evidence items this conflicts with
}

type EvidenceSource =
  | { type: "static-analysis"; analyzer: string }
  | { type: "business-signal"; signalType: string }
  | { type: "interview-answer"; roundId: number }
  | { type: "llm-inference"; promptId: string }
  | { type: "human-confirmation"; timestamp: string };

type EvidenceCategory =
  | "architecture-pattern"
  | "domain-entity"
  | "business-capability"
  | "integration-boundary"
  | "data-flow"
  | "state-machine"
  | "access-control"
  | "error-handling"
  | "performance-constraint"
  | "deployment-topology"
  | "business-rule"
  | "domain-event"
  | "external-dependency";

interface CodeReference {
  repo: string;
  file: string;
  lineRange: [number, number];
  snippet: string; // 1-3 lines of context
  symbolName?: string; // class/function name if applicable
}
```

#### 3.1.3 Evidence Extraction Pipeline

```
Input: RepoTechnicalAnalysis[] + RepoBusinessAnalysis[] + WorkspaceFusionResult

Step 1: Structural Evidence (from static analysis)
  - Architecture pattern signals → evidence items with clarity
  - Each structure marker → evidence with code references
  - Dependency relationships → integration evidence

Step 2: Business Signal Evidence (from repo-business-signals.ts)
  - Route entrypoints → capability evidence
  - API entrypoints → contract evidence
  - Domain terms → entity evidence (LOW clarity if only from naming)
  - Entity terms → data model evidence
  - External integrations → dependency evidence
  - Risk markers → constraint evidence

Step 3: Cross-Repo Evidence (from workspace-fusion)
  - Integration edges → data-flow evidence
  - Shared domain terms → domain-event evidence (MEDIUM clarity)
  - Business modules → capability evidence

Step 4: Clarity Scoring
  For each evidence item, compute clarity:
  - Has code reference with implementation detail → +0.3
  - Has multiple corroborating sources → +0.2
  - Confirmed by human/interview answer → +0.3
  - Only derived from naming convention → -0.2
  - Contradicts another evidence item → -0.3
  - Appears in multiple repos (cross-validated) → +0.1
```

#### 3.1.4 Ambiguity Detection

Evidence items with clarity < 0.5 are flagged as **ambiguous**. Ambiguity is further classified:

```typescript
interface AmbiguitySignal {
  evidenceId: string;
  type: AmbiguityType;
  severity: "critical" | "significant" | "minor";
  description: string;
  suggestedDimension: AnalyzeDimension;
}

type AmbiguityType =
  | "naming-only" // entity detected only from class name, no usage context
  | "orphan-capability" // capability with no traced flow
  | "missing-error-handling" // happy path visible, no error path
  | "unclear-state-machine" // entity has status field but transitions unknown
  | "phantom-integration" // integration keyword found but no clear contract
  | "contradictory-signals" // two evidence items conflict
  | "single-source" // knowledge from only one file/signal
  | "implicit-business-rule" // logic exists in code but business intent unknown
  | "untraced-dependency" // dependency listed but usage pattern unclear
  | "missing-domain-boundary"; // entities shared across contexts without clear ownership
```

---

### 3.2 Layer 2: Socratic Engine

#### 3.2.1 Interview Dimensions (Project-Adaptive)

Replace the current 6 fixed dimensions with a **two-tier dimension system**:

**Tier 1: Universal Dimensions (always present)**

| #   | Dimension                   | Weight | Purpose                                                        |
| --- | --------------------------- | ------ | -------------------------------------------------------------- |
| 1   | Business Goal & Value Chain | 0.20   | What value does this system deliver? To whom?                  |
| 2   | Core Domain Model           | 0.18   | What are the key entities, their lifecycle, and relationships? |
| 3   | Critical Business Flows     | 0.18   | What are the end-to-end flows that must never break?           |
| 4   | Integration Contracts       | 0.12   | How do repos/services/external systems communicate?            |
| 5   | Failure & Risk Topology     | 0.12   | Where are the fragile points? What happens when they fail?     |
| 6   | Operational Constraints     | 0.10   | Security, performance, compliance, deployment constraints      |
| 7   | Evolution Intent            | 0.10   | Where is the system headed? What's being deprecated?           |

**Tier 2: Domain-Specific Dimensions (auto-discovered)**

Based on the evidence collected in Layer 1, the engine proposes additional dimensions. Examples:

| If Evidence Contains...                 | Auto-Add Dimension                   | Weight |
| --------------------------------------- | ------------------------------------ | ------ |
| Payment/order/transaction signals       | Transaction Consistency & Settlement | 0.15   |
| Multi-tenant/RBAC/permission signals    | Tenant Isolation & Access Model      | 0.15   |
| Real-time/WebSocket/push signals        | Real-time Data Synchronization       | 0.12   |
| Workflow/approval/state-machine signals | Business Process State Machines      | 0.14   |
| Template/poster/share signals           | Content Generation & Distribution    | 0.12   |
| Inventory/stock/warehouse signals       | Inventory Accuracy & Reservation     | 0.13   |
| Scheduling/cron/queue signals           | Async Job Orchestration & Delivery   | 0.12   |

When Tier 2 dimensions are added, all weights are re-normalized so they sum to 1.0.

```typescript
interface InterviewDimension {
  id: string;
  name: string;
  nameZh: string;
  weight: number;
  tier: 1 | 2;
  score: number; // 0.0 = fully ambiguous, 1.0 = fully understood
  triggeredBy: string[]; // evidence IDs that triggered this dimension
  relatedEvidence: string[]; // evidence IDs relevant to this dimension
  roundsTargeted: number; // how many rounds have targeted this dimension
  lastTargetedRound: number | null;
}
```

#### 3.2.2 Composite Understanding Score

```
U_composite = Σ(w_i × s_i) / Σ(w_i)
```

Where `s_i` is the understanding score (0.0 = opaque, 1.0 = clear) for dimension `i`, and `w_i` is the normalized weight. This inverts the ambiguity score from the existing skill plan -- higher is better.

**Convergence threshold**: The interview loop terminates when `U_composite >= threshold`:

| Profile    | Threshold | Typical Rounds | Use Case                                        |
| ---------- | --------- | -------------- | ----------------------------------------------- |
| Quick      | >= 0.55   | 3-5            | Fast scan, team already familiar with codebase  |
| Standard   | >= 0.70   | 5-12           | Default, balanced depth vs. time                |
| Deep       | >= 0.82   | 10-20          | New team member onboarding, architecture review |
| Exhaustive | >= 0.90   | 15-30          | Pre-migration audit, compliance review          |

#### 3.2.3 Question Generation Strategy

**Core principle**: Every question must be **grounded in code evidence** and target a specific ambiguity signal.

```typescript
interface GeneratedQuestion {
  id: string;
  roundNumber: number;
  targetDimension: string;
  targetAmbiguity: AmbiguitySignal;
  pressureStrategy: PressureStrategy;
  question: string;
  questionZh: string;
  codeContext: CodeReference[]; // code snippets that motivated this question
  expectedAnswerType: "free-text" | "choice" | "confirmation" | "enumeration";
  choices?: string[]; // for choice-type questions
  fallbackAssumption: string; // what to assume if no answer
  fallbackConfidence: number; // confidence of the assumption
}
```

**Question Generation Pipeline**:

```
1. Rank ambiguity signals by severity × dimension weight
2. Filter: skip dimensions targeted in last 2 rounds (anti-fixation)
3. Select top ambiguity signal as target
4. Select pressure strategy based on ambiguity type:
     - naming-only → Concrete Example strategy
     - contradictory-signals → Contradiction Probing strategy
     - orphan-capability → Root Cause Drilling strategy
     - missing-error-handling → Failure Mode (Negative Space) strategy
     - unclear-state-machine → Boundary Decision Forcing strategy
     - phantom-integration → Dependency Verification strategy
     - implicit-business-rule → Hidden Assumption Surfacing strategy
5. Compose question from template + code evidence context
6. Generate fallback assumption for non-interactive mode
```

#### 3.2.4 Pressure Strategies (Extended)

Retain the 6 strategies from the existing skill plan, and add 2 analysis-specific strategies:

**Strategy 7: Code-Grounded Verification**

> **When**: Evidence was derived from code patterns but business intent is unclear  
> **Pattern**: "I found `{codeSnippet}` in `{file}`. This looks like it handles `{inferredPurpose}`. Is that correct? What's the business rule behind this logic?"
>
> Example:
>
> ```
> I found this in OrderService.java:125:
>   if (order.getStatus() == PAID && inventory.reserve(order.getItems())) {
>     order.setStatus(CONFIRMED);
>   }
> This looks like it transitions an order from PAID to CONFIRMED only if inventory
> can be reserved. Is that the correct business rule? What happens if the reservation
> partially succeeds (some items available, some not)?
> ```

**Strategy 8: Cross-Repo Boundary Probing**

> **When**: Integration edges detected between repos but the contract is unclear  
> **Pattern**: "Repo `{frontend}` appears to call `{backend}` for `{capability}`. What data flows between them? Who owns the contract? What happens when the API changes?"
>
> Example:
>
> ```
> The frontend (shop-h5) has API calls that map to endpoints in the backend
> (shop-server) around "order" and "product" domains. When the backend team
> changes an order-related API, how does the frontend team learn about it?
> Is there a shared contract (OpenAPI spec, TypeScript types) or is it informal?
> ```

#### 3.2.5 Answer Processing

Each answer goes through a structured processing pipeline:

```
1. Parse: Extract structured information from free-text answer
   - Named entities (system names, team names, technology names)
   - Business rules (if-then statements, constraints)
   - Enumerated items (lists of flows, entities, constraints)
   - Negations (what the system does NOT do)

2. Validate: Check consistency with existing evidence
   - Does the answer contradict any existing evidence item?
   - Does the answer confirm an existing assumption?
   - Does the answer reveal a new dimension not yet tracked?

3. Integrate: Create new evidence items from the answer
   - Source type: 'interview-answer'
   - Clarity: 0.8 for direct confirmations, 0.6 for partial answers
   - Link to related code references if mentioned

4. Re-score: Update dimension scores
   - Targeted dimension: adjust based on ambiguity reduction
   - Side-effect dimensions: adjust if answer touches other areas
   - Detect: new ambiguity signals from the answer itself

5. Cascade: Propagate changes to knowledge model
   - New entity → update domain-contexts
   - New flow → update critical-flows
   - New constraint → update runtime-constraints
   - New integration detail → update contract-surfaces
```

---

### 3.3 Layer 3: Interview Orchestration

#### 3.3.1 Three Execution Modes

```typescript
type InterviewMode =
  | "interactive" // human answers via TTY prompt
  | "agent-assisted" // AI agent (Claude/Codex) answers on behalf of human
  | "autonomous"; // LLM self-interviews using code evidence

interface InterviewConfig {
  mode: InterviewMode;
  profile: "quick" | "standard" | "deep" | "exhaustive";
  maxRounds: number;
  roundBudgetPerDimension: number;
  autoAssume: boolean; // auto-generate assumptions for unanswered questions
  language: "en" | "zh";
  llmProvider?: LLMProviderConfig; // required for 'autonomous' mode
}
```

**Mode behaviors**:

| Mode           | Question Display   | Answer Source                  | Assumption Policy                         | LLM Required                     |
| -------------- | ------------------ | ------------------------------ | ----------------------------------------- | -------------------------------- |
| interactive    | Terminal prompt    | Human types                    | Optional, offered after skip              | No                               |
| agent-assisted | Markdown in output | AI agent parses and responds   | Auto-generate for skipped                 | No (host agent provides answers) |
| autonomous     | Internal (logged)  | LLM reasons from code evidence | All answers are LLM-generated assumptions | Yes                              |

**Autonomous mode** is the key innovation for AI-driven analysis. The flow:

```
For each round:
  1. Generate question from ambiguity signal
  2. Compose a prompt to the LLM:
     - Include the question
     - Include relevant code snippets (from evidence items)
     - Include current knowledge model state
     - Ask: "Based on the code evidence, what is the most likely answer?
             Rate your confidence 0.0-1.0. List any assumptions."
  3. Parse LLM response as an interview answer
  4. Process answer through the standard pipeline
  5. Mark answer source as 'llm-inference' with confidence
```

#### 3.3.2 Session Lifecycle

```
                    ┌──────────┐
                    │  create   │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
              ┌─────│ pre-scan │ ── collect evidence, detect ambiguity,
              │     └────┬─────┘    propose dimensions, compute initial scores
              │          │
              │     ┌────▼─────┐
              │     │  round N │ ◄─────────────────┐
              │     └────┬─────┘                    │
              │          │                          │
              │     ┌────▼──────────┐               │
              │     │ process answer│               │
              │     └────┬──────────┘               │
              │          │                          │
              │     ┌────▼──────────┐    ┌─────┐    │
              │     │ update model  │───►│check│────┘ U < threshold
              │     └───────────────┘    │conv.│       AND rounds < max
              │                          └──┬──┘
              │                             │ U >= threshold
              │                             │ OR rounds >= max
              │                        ┌────▼─────┐
              │                        │crystallize│
              │                        └────┬──────┘
              │                             │
              │     ┌────▼──────┐      ┌────▼─────┐
              └────►│  suspend  │      │ complete │
                    └───────────┘      └──────────┘
                    (user interrupt      (threshold
                     or budget pause)     reached)
```

#### 3.3.3 Session State Persistence

```typescript
interface InterviewSession {
  // Identity
  sessionId: string; // UUID
  runId: string; // bbg analyze run ID
  slug: string; // human-readable slug

  // Configuration
  mode: InterviewMode;
  profile: string;
  threshold: number;
  maxRounds: number;
  language: "en" | "zh";

  // State
  status: "active" | "suspended" | "completed";
  currentRound: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;

  // Dimensions
  dimensions: InterviewDimension[];

  // Scores
  initialUnderstanding: number;
  currentUnderstanding: number;
  scoreHistory: Array<{
    round: number;
    composite: number;
    perDimension: Record<string, number>;
  }>;

  // Content
  rounds: InterviewRound[];
  evidence: EvidenceItem[];
  assumptions: InterviewAssumption[];
  pendingAmbiguities: AmbiguitySignal[];

  // Knowledge Model Snapshot (incremental)
  knowledgeModelDelta: Partial<AnalyzeKnowledgeModel>;
}

interface InterviewRound {
  roundNumber: number;
  question: GeneratedQuestion;
  answer: InterviewAnswer | null;
  scoreBefore: number;
  scoreAfter: number;
  dimensionDeltas: Record<string, number>;
  newEvidence: string[]; // evidence IDs created from this answer
  newAmbiguities: string[]; // ambiguity IDs discovered from this answer
  timestamp: string;
}

interface InterviewAnswer {
  source: "human" | "agent" | "llm";
  rawText: string;
  parsedEntities: string[];
  parsedRules: string[];
  parsedNegations: string[];
  confidence: number; // 1.0 for human, LLM-reported for autonomous
  contradictions: string[]; // evidence IDs this answer contradicts
}

interface InterviewAssumption {
  id: string;
  statement: string;
  status: "assumed" | "confirmed" | "rejected";
  source: "llm-inference" | "default-assumption" | "interview-answer";
  confidence: number;
  evidence: string[]; // evidence IDs supporting this assumption
  dimension: string;
  roundIntroduced: number;
  roundResolved: number | null;
}
```

Persisted to: `.bbg/analyze/interviews/{sessionId}.json`

#### 3.3.4 Convergence Detection

The interview loop terminates when ANY of these conditions is met:

```typescript
function shouldTerminate(session: InterviewSession): TerminationReason | null {
  // 1. Understanding threshold reached
  if (session.currentUnderstanding >= session.threshold) {
    return { reason: "threshold-reached", detail: `U=${session.currentUnderstanding}` };
  }

  // 2. Round budget exhausted
  if (session.currentRound >= session.maxRounds) {
    return { reason: "budget-exhausted", detail: `rounds=${session.currentRound}` };
  }

  // 3. Diminishing returns (score improved < 0.02 in last 3 rounds)
  const recent = session.scoreHistory.slice(-3);
  if (recent.length >= 3) {
    const delta = recent[recent.length - 1].composite - recent[0].composite;
    if (delta < 0.02) {
      return { reason: "diminishing-returns", detail: `delta=${delta} over 3 rounds` };
    }
  }

  // 4. No remaining high-severity ambiguities
  const criticalAmbiguities = session.pendingAmbiguities.filter((a) => a.severity === "critical");
  if (criticalAmbiguities.length === 0 && session.currentRound >= 3) {
    return { reason: "no-critical-ambiguity", detail: "all critical ambiguities resolved" };
  }

  return null; // continue
}
```

#### 3.3.5 Incremental Knowledge Model Updates

Unlike the current architecture where `buildAnalyzeKnowledgeModel` runs once after the interview, the new design supports **incremental updates**:

```
After each interview round:
  1. Process answer → new evidence items
  2. Compute: which parts of the knowledge model are affected
  3. Incrementally update only affected parts:
     - New entity confirmed → add to domainContexts
     - Flow step clarified → update specific criticalFlow
     - Constraint identified → add to runtimeConstraints
     - Business rule confirmed → add to decisionRecords
  4. Re-score dimensions based on updated model completeness
```

This avoids the wasteful pattern of rebuilding the entire 761-line model after each round.

```typescript
interface KnowledgeModelDelta {
  addedCapabilities: AnalyzeCapability[];
  updatedCapabilities: Array<{ name: string; patch: Partial<AnalyzeCapability> }>;
  addedFlows: AnalyzeCriticalFlow[];
  updatedFlows: Array<{ name: string; patch: Partial<AnalyzeCriticalFlow> }>;
  addedConstraints: AnalyzeRuntimeConstraint[];
  addedRisks: AnalyzeRiskItem[];
  addedDecisions: AnalyzeDecisionRecord[];
  addedDomainContexts: AnalyzeDomainContext[];
  updatedContracts: Array<{ name: string; patch: Partial<AnalyzeContractSurface> }>;
  addedDimensions: AnalyzeBusinessDimension[];
}
```

---

## 4. Socratic Questioning Patterns for Code Analysis

### 4.1 Pattern Catalog

Unlike requirement elicitation (where the human has all the answers), code analysis questioning has a unique characteristic: **the code itself contains answers that the interviewer should have already extracted**. The Socratic engine must balance:

- Questions it can answer from code (should self-answer in autonomous mode)
- Questions only a domain expert can answer (must ask human/agent)
- Questions where code gives hints but business intent is ambiguous (hybrid)

#### Pattern 1: Entity Lifecycle Probing

> **Trigger**: Entity detected with status/state field but transitions unclear  
> **Question template**: "{Entity} appears to have states: [{states}]. What triggers the transition from {stateA} to {stateB}? Can it ever go backwards? What happens to related {relatedEntities} when this transition occurs?"

#### Pattern 2: Capability Ownership Verification

> **Trigger**: Same capability term appears in multiple repos  
> **Question template**: "The '{capability}' capability appears in both {repoA} (as {evidenceA}) and {repoB} (as {evidenceB}). Which repo is the source of truth for {capability} logic? Does one delegate to the other, or do they implement it independently?"

#### Pattern 3: Missing Negative Path

> **Trigger**: Code shows happy-path implementation but no error handling for a specific failure mode  
> **Question template**: "In {file}:{line}, {operation} is performed. What should happen if {failureCondition}? I don't see explicit error handling for this case."

#### Pattern 4: Implicit Business Rule Extraction

> **Trigger**: Conditional logic in service/controller that appears to encode a business rule  
> **Question template**: "I found this logic in {file}:{line}: `{codeSnippet}`. This looks like a business rule: '{inferredRule}'. Is this correct? Under what circumstances was this rule established? Can it change?"

#### Pattern 5: Integration Contract Verification

> **Trigger**: Frontend makes API calls that map to backend endpoints  
> **Question template**: "The frontend calls `{apiPath}` expecting `{requestFormat}`. The backend serves this at `{controllerMethod}` returning `{responseFormat}`. Is this contract documented somewhere? What's the versioning strategy when the response format changes?"

#### Pattern 6: Data Consistency Boundary

> **Trigger**: Multiple writes to different stores/services in a single operation  
> **Question template**: "{operation} in {file} writes to both {storeA} and {storeB}. What happens if the write to {storeA} succeeds but {storeB} fails? Is there a compensation mechanism, or is eventual consistency acceptable here?"

#### Pattern 7: Domain Term Disambiguation

> **Trigger**: Same term used with apparently different meanings across repos  
> **Question template**: "The term '{term}' appears in {repoA} as {contextA} and in {repoB} as {contextB}. Are these the same concept? If different, what distinguishes them?"

#### Pattern 8: Flow Completeness Check

> **Trigger**: Traced flow has gaps (no clear path from entry to persistence)  
> **Question template**: "I can trace the '{flowName}' flow from {entryPoint} through {middleStep}, but lose the trail at {gapPoint}. What happens between {gapPoint} and {expectedEnd}? Are there async steps, message queues, or scheduled jobs involved?"

---

## 5. Knowledge Model Integration

### 5.1 Current vs. Proposed Data Flow

**Current**: Interview → 3 knowledge model outputs

```
interview.context.criticalFlows → criticalFlows (if confirmed)
interview.context.nonNegotiableConstraints → runtimeConstraints
interview.context.failureHotspots → riskSurface
interview.context.decisionHistory → decisionRecords
interview.assumptionsApplied → decisionRecords (assumed)
```

**Proposed**: Interview → ALL 9 knowledge model outputs + analysis dimensions

```
interview evidence → capabilities (new entities/capabilities confirmed)
interview evidence → criticalFlows (flow steps clarified, gaps filled)
interview evidence → contractSurfaces (contracts verified, formats confirmed)
interview evidence → domainContexts (boundaries clarified, ownership confirmed)
interview evidence → runtimeConstraints (constraints from direct testimony)
interview evidence → riskSurface (risks confirmed or de-risked by answers)
interview evidence → decisionRecords (explicit decisions + confirmed assumptions)
interview evidence → changeImpact (impact chains validated by domain expert)
interview evidence → analysisDimensions (project-specific dimensions discovered)
```

### 5.2 Confidence Uplift Model

Interview answers increase confidence of knowledge model items through a structured uplift:

```typescript
function computeConfidenceUplift(
  item: { confidence: number },
  answerSource: "human" | "agent" | "llm",
  answerType: "direct-confirmation" | "partial-confirmation" | "contradiction" | "new-info",
): number {
  const baseUplift: Record<string, Record<string, number>> = {
    human: {
      "direct-confirmation": 0.25,
      "partial-confirmation": 0.12,
      contradiction: -0.15, // reduces confidence, needs resolution
      "new-info": 0.18,
    },
    agent: {
      "direct-confirmation": 0.18,
      "partial-confirmation": 0.08,
      contradiction: -0.1,
      "new-info": 0.12,
    },
    llm: {
      "direct-confirmation": 0.1,
      "partial-confirmation": 0.05,
      contradiction: -0.08,
      "new-info": 0.08,
    },
  };

  return clampConfidence(item.confidence + (baseUplift[answerSource]?.[answerType] ?? 0));
}
```

Human answers get the highest uplift. LLM self-interview answers get meaningful but discounted uplift. Contradictions always reduce confidence, signaling a need for further investigation.

---

## 6. Autonomous Mode Design (LLM Self-Interview)

### 6.1 Rationale

When `bbg analyze --deep` runs inside an AI agent (or with `--autonomous`), the system can use an LLM to "interview itself" based on code evidence. This is the **AI-driven analysis** that replaces the current canned assumptions.

### 6.2 Self-Interview Prompt Architecture

Each round in autonomous mode uses a structured prompt:

```typescript
const AUTONOMOUS_ANSWER_PROMPT = `
You are analyzing a software project to understand its business logic and architecture.

## Current Understanding (from prior analysis)
{knowledgeModelSummary}

## Code Evidence
{relevantCodeSnippets}

## Question
{generatedQuestion}

## Instructions
1. Answer the question based ONLY on the code evidence provided
2. If the code clearly answers the question, state the answer with confidence 0.8-1.0
3. If the code gives hints but is ambiguous, state your best interpretation with confidence 0.4-0.6
4. If the code does not provide enough information, say "insufficient evidence" with confidence 0.1-0.2
5. List any assumptions you made
6. Note any contradictions with the current understanding

## Output Format (JSON)
{
  "answer": "your answer text",
  "confidence": 0.7,
  "assumptions": ["assumption 1", "assumption 2"],
  "contradictions": ["contradicts X because Y"],
  "newQuestions": ["follow-up question 1"],
  "evidenceUsed": ["file:line references"]
}
`;
```

### 6.3 Context Budget Management

For large codebases, the LLM context window is limited. The system uses **smart context selection** per question:

```
For each autonomous round:
  1. Identify the target ambiguity signal
  2. Trace: which code files/functions are relevant
  3. Rank by relevance to the specific question
  4. Fill context budget (default: 8K tokens for code, 4K for knowledge model)
  5. Include: targeted code snippets, not full files
```

### 6.4 Self-Interview Depth Control

| Code Evidence Clarity                     | LLM Action                                                       | Result                     |
| ----------------------------------------- | ---------------------------------------------------------------- | -------------------------- |
| Code clearly implements the behavior      | Auto-answer with high confidence                                 | Evidence item → confirmed  |
| Code hints at behavior but intent unclear | Auto-answer with medium confidence, flag for human review        | Evidence item → assumed    |
| No code evidence for the question         | Mark as "unknown", generate human-facing question                | Evidence item → pending    |
| Code contradicts current model            | Flag contradiction, attempt resolution, escalate if unresolvable | Evidence item → conflicted |

---

## 7. Output Artifacts

### 7.1 Enhanced Interview Summary

Replaces the current `AnalyzeInterviewSummary` with a richer structure:

```typescript
interface SocraticInterviewSummary {
  // Session metadata
  sessionId: string;
  mode: InterviewMode;
  profile: string;
  status: "completed" | "suspended" | "budget-exhausted" | "diminishing-returns";

  // Score progression
  initialUnderstanding: number;
  finalUnderstanding: number;
  threshold: number;
  convergenceCurve: Array<{ round: number; score: number }>;

  // Content summary
  totalRounds: number;
  questionsAsked: number;
  questionsAnswered: number;
  questionsByDimension: Record<string, number>;
  pressureStrategiesUsed: Record<string, number>;

  // Dimension breakdown
  dimensions: Array<{
    name: string;
    tier: 1 | 2;
    initialScore: number;
    finalScore: number;
    roundsTargeted: number;
  }>;

  // Evidence & Assumptions
  evidenceCollected: number;
  evidenceBySource: Record<string, number>;
  assumptionsMade: number;
  assumptionsConfirmed: number;
  assumptionsRejected: number;
  contradictionsFound: number;
  contradictionsResolved: number;

  // Knowledge model impact
  knowledgeModelDelta: KnowledgeModelDelta;

  // Pending items (for resume or human follow-up)
  pendingAmbiguities: AmbiguitySignal[];
  pendingQuestions: GeneratedQuestion[]; // questions that were generated but not yet answered
  humanReviewRequired: EvidenceItem[]; // items with LLM confidence < 0.5

  // Paths
  sessionPath: string;
  specPath: string | null;
}
```

### 7.2 Crystallized Analysis Document

When the interview reaches convergence, produce a **crystallized analysis**:

```markdown
# Project Analysis: {project-name}

> Generated by Socratic analyze interview
> Profile: {profile} | Rounds: {N} | Final understanding: {score}
> Mode: {mode} | Date: {date}

## 1. Business Overview

{Synthesized from businessGoal + interview answers}

## 2. Domain Model

{Bounded contexts, key entities, relationships, lifecycle}
{Mermaid ER diagram}

## 3. Core Business Flows

{Each critical flow with full trace, state transitions, error handling}
{Mermaid sequence diagrams}

## 4. Architecture Patterns

{Identified patterns with code evidence}

## 5. Integration Map

{Cross-repo and external contracts with confidence scores}

## 6. Risk Surface

{Ranked risks with evidence and suggested mitigations}

## 7. Assumptions & Open Questions

{All assumptions from the interview with status}
{Unresolved questions for human follow-up}

## 8. Understanding Audit Trail

{Dimension score progression chart}
{Round-by-round summary}
```

---

## 8. Knowledge Loop Integration

### 8.1 Design Goal

`bbg analyze` must not end at "generate some docs". Its output should become the **durable substrate** for future development, review, verification, and continuous learning.

The target closed loop is:

```
bbg analyze
  → .bbg/knowledge/            (structured machine-readable knowledge)
  → docs/wiki/                 (human-readable canonical memory)
  → Hermes intake/distill      (candidate learning and promotion)
  → bbg start / task routing   (future development consumes knowledge)
  → verify / review / outcome  (new evidence generated)
  → Hermes + analyze refresh   (knowledge enriched)
```

### 8.2 Canonical Storage Decision

The system should use a **three-tier trust model**:

| Tier   | Storage                                 | Role                                               | Trust Level |
| ------ | --------------------------------------- | -------------------------------------------------- | ----------- |
| Tier 1 | `.bbg/knowledge/` JSON                  | Structured source of truth for runtime consumption | High        |
| Tier 2 | `docs/wiki/`                            | Canonical human-facing project memory              | High        |
| Tier 3 | Hermes candidates / drafts / promotions | Learning and refinement pipeline                   | Graduated   |

This preserves the existing BBG architecture while making analyze outputs first-class Hermes inputs.

### 8.3 Analyze to Hermes Ingestion

Current BBG already writes analyze output to `.bbg/knowledge/` and `docs/wiki/`, and Hermes query already reads both. The missing step is to treat analyze output as an explicit **Hermes intake source** rather than only as query augmentation.

Proposed addition:

```typescript
interface AnalyzeKnowledgeSnapshot {
  runId: string;
  generatedAt: string;
  scope: "repo" | "workspace";
  focusQuery: string | null;
  knowledgePaths: string[];
  wikiPaths: string[];
  summary: {
    capabilities: number;
    criticalFlows: number;
    contracts: number;
    domainContexts: number;
    risks: number;
    decisions: number;
  };
  confidenceProfile: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
}
```

After each successful analyze run:

1. Persist the snapshot beside existing run state
2. Register the snapshot as a Hermes runtime artifact
3. Create Hermes candidate records for:
   - newly discovered critical flows
   - newly discovered contracts
   - new or changed domain contexts
   - new or changed risk items
   - project-specific analysis dimensions
4. Mark these candidates as `source = analyze`
5. Allow later Hermes distill / verify / promote to convert them into:
   - stable wiki concept pages
   - rules
   - skills
   - process docs

### 8.4 Knowledge Reuse During Development

The output of `bbg analyze` should remain directly consumable by runtime task routing, but also enrich future task execution through Hermes.

Proposed closed-loop behavior:

```
analyze run
  → capabilities / flows / contracts / risks enter .bbg/knowledge/
  → task router matches future task text against those artifacts
  → Hermes query augments with wiki + promoted knowledge
  → handoff context includes impacted repos / contracts / reviewer hints
  → verification emits workflow stability + regression evidence
  → Hermes records candidate evidence from the task outcome
  → next analyze refresh merges new evidence back into the project model
```

This means knowledge is not static. It becomes richer through:

1. **New feature delivery** -- newly clarified flows, entities, constraints
2. **Bug fixing** -- new failure hotspots and edge-case knowledge
3. **Verification and incidents** -- stronger risk models and decision history
4. **Hermes promotion** -- reusable lessons turned into durable governance assets

### 8.5 Focused Business Analysis Without New Complexity

The system already has a low-cost focus input via positional text (`bbg analyze "order payment flow"`). That should remain the only user-facing refinement mechanism for targeted analysis.

Design decision:

- Keep `bbg analyze` as the single entry point
- Keep focus as natural-language positional text, not a new `--focus` flag
- Allow optional `--repo` / `--repos` only when the user truly wants scoping
- Use the Socratic engine to treat focus text as a **priority lens**, not a different command

Examples:

```bash
bbg analyze
bbg analyze "订单支付流程"
bbg analyze --repo shop-server "库存扣减与补偿"
```

No extra concept needs to be learned. The user's mental model stays simple:

- `bbg analyze` = full workspace understanding
- `bbg analyze "某个业务功能"` = full understanding, but emphasize this business area

### 8.6 Knowledge Closure Rule

To make the loop explicit, the design should adopt this rule:

> Any knowledge produced by analyze that is later confirmed, corrected, or enriched during task execution, verification, or incident handling must be eligible to flow back into Hermes and the next analyze baseline.

This requires two lightweight conventions:

1. Every knowledge item carries provenance: `static-analysis`, `interview-answer`, `llm-inference`, `task-verification`, `incident-review`, `human-confirmation`
2. Every future runtime artifact can reference prior analyze item IDs when it confirms or amends them

---

## 9. Execution Model and UX

### 9.1 Primary UX Goal

The user should not need to learn multiple commands, modes, or AI-specific flags to use analyze.

Target experience:

```bash
bbg analyze
```

That single command should handle the rest.

### 9.2 Recommended Execution Model

`bbg analyze` should remain a **terminal command**, but analysis itself should execute **inside an AI agent context whenever deep understanding is required**.

This is already directionally how BBG works today through handoff. The design should formalize it as the official model:

| User Context                                       | System Behavior                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| Already inside Claude/Codex/Gemini/OpenCode/Cursor | Run analyze immediately in that AI context                              |
| In plain terminal, AI tool configured              | Prompt once for tool choice or use default, then hand off / auto-launch |
| In plain terminal, no explicit tool configured     | Offer supported tools and create a guided handoff                       |

So the answer to "analyze 应该进入 AI 中执行，还是在终端中执行" is:

> **用户从终端只输入一次 `bbg analyze`，但真正的深度分析应在 AI 上下文中执行。终端负责触发、选择工具、生成或自动完成 handoff；AI 负责理解和分析。**

### 9.3 Official Operational Flow

The design should standardize the flow below:

#### Flow A: Already in AI

```bash
bbg analyze
```

Behavior:

1. Detect current tool from `BBG_CURRENT_TOOL` or tool-specific env
2. Run analyze directly
3. Produce knowledge, wiki, and Hermes-ingestable artifacts

#### Flow B: Plain terminal, first-class guided handoff

```bash
bbg analyze
```

Behavior:

1. Detect that no AI context is active
2. Resolve configured/default available tools
3. If interactive TTY, ask a single question:
   - "Use which AI to run analysis? Claude / Codex / Gemini / OpenCode / Cursor"
4. Write handoff bundle
5. Prefer **auto-launch** into the selected tool when agent-runner is configured
6. Fall back to showing the replay instruction when auto-launch is unavailable

This keeps the command count at one while still respecting tool choice.

### 9.4 Auto-Launch Preference

To reduce user learning cost further, the target behavior should be:

1. `bbg analyze` in terminal
2. BBG detects no AI context
3. BBG chooses or asks for the AI tool once
4. BBG launches the configured tool automatically with the handoff context
5. The selected AI begins analysis from the generated handoff

If auto-launch cannot be completed, only then should BBG show the manual replay command.

This is better than requiring the user to understand:

- what `BBG_CURRENT_TOOL` is
- how handoff files work
- which exact replay command to run

Those remain implementation details, not user responsibilities.

### 9.5 Zero-New-Parameter Rule

The design should explicitly avoid adding user-facing flags for:

- execution mode selection
- AI tool routing in normal cases
- autonomous vs agent-assisted distinction
- knowledge persistence mode
- Hermes ingestion mode

These should be inferred from environment, config, and runtime capability.

Allowed user-facing controls should stay minimal:

```bash
bbg analyze
bbg analyze "支付退款链路"
bbg analyze --repo shop-server
bbg analyze --interview off
```

Everything else should be internal policy.

### 9.6 Focus-First but Not Flag-Heavy

For the requirement that users can "针对某个业务功能重点分析", the design should not introduce a separate command like `bbg analyze-focus` or a dense option set.

Instead:

1. Continue using natural-language positional focus text
2. Let the focus text influence:
   - repo ranking
   - ambiguity ranking
   - question generation priority
   - evidence retrieval priority
   - wiki summary emphasis
3. Still update the full workspace knowledge graph where relevant

That means the system can do both:

- **global knowledge refresh**
- **local business deep dive**

with the same command shape.

---

## 10. Migration Strategy

### 8.1 Phase 1: Evidence Layer (Non-Breaking)

- Add `EvidenceItem` and `AmbiguitySignal` types
- Build `EvidenceCollector` that transforms existing analysis artifacts into evidence items
- No changes to existing interview or model code
- New code: `src/analyze/evidence-collector.ts`

### 8.2 Phase 2: Socratic Engine (Behind Feature Flag)

- Implement `SocraticEngine` with question generation and answer processing
- Implement project-adaptive dimension discovery
- Feature flag: `--interview-v2` or `--socratic`
- New code: `src/analyze/socratic-engine.ts`, `src/analyze/interview-dimensions.ts`

### 8.3 Phase 3: Autonomous Mode (Behind Feature Flag)

- Add LLM client abstraction
- Implement self-interview loop
- Feature flag: `--autonomous` or combined with `--deep`
- New code: `src/analyze/llm-client.ts`, `src/analyze/autonomous-interview.ts`

### 8.4 Phase 4: Incremental Model Updates

- Refactor `analysis-model.ts` to support incremental updates
- Wire interview evidence directly into knowledge model
- Replace single `buildAnalyzeKnowledgeModel` call with iterative build
- Modified: `src/analyze/analysis-model.ts`, `src/analyze/orchestrator.ts`

### 8.5 Phase 5: Replace Default

- Make Socratic interview the default for `bbg analyze`
- Deprecate old 6-question interview
- Remove feature flags

---

## 11. Comparison: Current vs. Proposed

| Aspect              | Current (`deep-interview.ts`)     | Proposed (Socratic Analyze Interview)                    |
| ------------------- | --------------------------------- | -------------------------------------------------------- |
| Questions           | 6 fixed, same for all projects    | Dynamically generated from code evidence                 |
| Dimensions          | 6 universal, no adaptation        | 7 universal + N project-specific (auto-discovered)       |
| Scoring             | Arithmetic (`0.2 + count * 0.14`) | Weighted composite with evidence-backed dimension scores |
| Non-TTY behavior    | Canned regex-based assumptions    | LLM self-interview from code evidence (autonomous mode)  |
| Iteration           | Single-pass (runs once)           | Multi-round loop until convergence or budget exhaustion  |
| Model impact        | Feeds 3 of 9 model outputs        | Feeds all 9 model outputs + dimensions                   |
| Persistence         | Minimal (pending questions JSON)  | Full session state with round history and evidence chain |
| Resume              | Basic (pending answers only)      | Full session replay with context restoration             |
| Pressure strategies | None (plain questions)            | 8 strategies adapted to ambiguity type                   |
| Code grounding      | None (questions are abstract)     | Every question cites specific code evidence              |
| Adaptivity          | Zero                              | Discovers domain-specific dimensions from evidence       |
| Convergence         | None (fixed question count)       | Composite score with diminishing-returns detection       |
| Output              | Interview summary object          | Rich summary + crystallized analysis document            |

---

## 12. Open Questions

1. **LLM Provider Configuration**: Where should the LLM provider config live for autonomous mode? Options: `.bbg/config.json`, environment variables, CLI flags. Recommendation: environment variables plus existing runner config, with `.bbg/config.json` as optional override.

2. **Token Budget for Autonomous Mode**: How much token budget per round? The design assumes 8K for code + 4K for knowledge model + 2K for prompt/response = ~14K per round. At 20 rounds, that's ~280K tokens. Acceptable for deep analysis? Should this be configurable?

3. **Hybrid Mode**: Should there be a mode where LLM self-interviews first, then presents low-confidence findings to the human for confirmation? This would be the most efficient use of human time. Design assumes yes, but the UX should remain hidden behind the same `bbg analyze` entry point.

4. **Multi-Language Support**: The current system supports Chinese question/answer text. The Socratic engine should generate questions in the configured documentation language. How should bilingual code (Chinese comments in Java/TS code) be handled?

5. **Incremental vs. Full Rebuild**: The design proposes incremental model updates after each round. Is the implementation complexity justified, or should we rebuild the full model every N rounds (e.g., every 3-5 rounds) as a simpler approach?

6. **Evidence Item Lifecycle**: Should evidence items be immutable (new versions created) or mutable (updated in place)? Immutable is cleaner for audit trails but creates more data. Recommendation: immutable with `supersededBy` links.

---

## 13. Dependencies

| Dependency                            | Status               | Notes                                                                                                                                    |
| ------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Existing `deep-interview.ts`          | To be replaced       | Migration path in Section 8                                                                                                              |
| Existing `analysis-model.ts`          | To be refactored     | Add incremental update support                                                                                                           |
| Existing `orchestrator.ts`            | To be modified       | Add interview loop                                                                                                                       |
| LLM client abstraction                | New                  | Only for autonomous mode                                                                                                                 |
| Existing handoff and agent runner     | To be extended       | Preserve one-command UX while preferring AI-context execution and optional auto-launch                                                   |
| Existing Hermes lifecycle             | To be connected      | Analyze snapshots become explicit Hermes runtime artifacts and candidate sources                                                         |
| `skills/deep-interview/SKILL.md` plan | Complementary        | That skill is for requirement elicitation; this design is for code analysis. They share pressure strategies but serve different purposes |
| Tree-sitter AST (from prior design)   | Optional enhancement | Code references are more precise with AST, but evidence collector works with current regex-based signals                                 |

---

## 14. Success Metrics

| Metric                                            | Current Baseline         | Target                        |
| ------------------------------------------------- | ------------------------ | ----------------------------- |
| Knowledge model items with confidence > 0.7       | ~60% (hardcoded scores)  | > 80% (evidence-backed)       |
| Average evidence items per capability             | 0 (no evidence tracking) | >= 3                          |
| Critical flows with complete trace                | ~30% (gaps common)       | > 70%                         |
| Domain-specific dimensions per project            | 0 (5 fixed for all)      | 2-5 project-specific          |
| Analysis dimensions relevance (human rating)      | Not measured             | > 4/5 average                 |
| Time to reach "useful" understanding (human eval) | N/A                      | < 15 min for standard profile |
| Future tasks with matched impact guidance         | Not measured             | > 80% of medium+ tasks        |
| Analyze outputs ingested by Hermes                | 0 explicit ingest        | 100% of successful runs       |
| Manual steps required to start deep analyze       | 2-4 depending on tool    | 1 command by default          |
