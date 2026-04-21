# `bbg analyze` UX Design

**Date:** 2026-04-20  
**Status:** Draft  
**Scope:** Final user interaction model for `bbg analyze`  
**Related:** `2026-04-20-socratic-analyze-interview-design.md`

---

## 1. Goal

Define a final user experience for `bbg analyze` that:

1. keeps the entry point extremely simple
2. runs deep analysis in the right AI context
3. supports full-workspace analysis and business-focus analysis
4. feeds results into `.bbg/knowledge/`, `docs/wiki/`, and Hermes
5. does not force users to learn extra flags, modes, or internal concepts

---

## 2. Product Principle

### 2.1 One Command Rule

The user should only need to remember:

```bash
bbg analyze
```

And optionally:

```bash
bbg analyze "some business topic"
```

Everything else should be inferred by BBG.

### 2.2 Entry in Terminal, Understanding in AI

`bbg analyze` should remain a terminal command, but deep understanding should happen in AI context.

This means:

- the terminal is the orchestration surface
- AI is the analysis surface
- handoff and tool routing are implementation details
- the user should not need to understand those details to use the feature

### 2.3 No New Cognitive Load

The design should avoid introducing new user-facing concepts such as:

- analyze mode selection
- AI execution mode selection
- Hermes ingestion flags
- knowledge persistence flags
- autonomous/self-interview flags
- separate focus commands

The system may use those internally, but they should not become part of the normal user workflow.

---

## 3. Supported User Intents

`bbg analyze` should cover three user intents with the same command shape.

### 3.1 Intent A: Full Workspace Understanding

```bash
bbg analyze
```

Meaning:

- understand the whole workspace
- refresh business and technical knowledge
- update knowledge store, wiki, and Hermes-ingestable artifacts

### 3.2 Intent B: Business-Focused Deep Dive

```bash
bbg analyze "payment refund flow"
bbg analyze "订单支付流程"
```

Meaning:

- still analyze the workspace as a whole
- but prioritize this business topic in:
  - repo matching
  - evidence retrieval
  - ambiguity ranking
  - Socratic questioning
  - output summaries

### 3.3 Intent C: Repo-Scoped Analysis

```bash
bbg analyze --repo shop-server
bbg analyze --repo shop-server "库存扣减与补偿"
```

Meaning:

- scope the analysis to one repo or selected repos
- optionally still apply business-topic prioritization

This is advanced but still acceptable because repo scoping already exists and is easy to understand.

---

## 4. Final Command Shape

### 4.1 User-Facing Syntax

Keep the command surface minimal:

```bash
bbg analyze [focus...]
bbg analyze --repo <name> [focus...]
bbg analyze --repos <a,b,c> [focus...]
bbg analyze --interview off
bbg analyze --json
```

### 4.2 Rules

1. Focus remains a positional natural-language string, not a dedicated `--focus` flag.
2. `--repo` and `--repos` remain for explicit scoping.
3. `--interview off` remains only as an escape hatch.
4. No new flags should be added for:
   - tool selection in the common path
   - handoff behavior
   - autonomous mode
   - Hermes ingestion
   - wiki generation

---

## 5. Execution Model

### 5.1 Official Model

The official model should be:

> The user runs `bbg analyze` in the terminal. BBG detects whether it is already inside an AI tool. If yes, it runs analysis immediately. If not, BBG chooses or asks for the AI tool once, prepares the handoff, and preferably launches the selected AI automatically.

### 5.2 Why This Model

This model balances four realities:

1. analysis orchestration belongs in CLI
2. deep business/architecture understanding belongs in AI
3. users may prefer different AI tools
4. users should not be forced to manually manage prompts and handoff files every time

### 5.3 Decision Table

| Runtime Situation                                         | UX Behavior                                               | Expected User Effort                |
| --------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| Already inside Claude/Codex/Gemini/OpenCode/Cursor        | Run immediately                                           | 1 command                           |
| In terminal, default AI configured, auto-launch available | Auto-launch selected AI and continue                      | 1 command                           |
| In terminal, multiple tools configured, TTY available     | Ask one tool-choice question, then auto-launch or handoff | 1 command + 1 selection             |
| In terminal, no auto-launch available                     | Write handoff and show replay guidance                    | 1 command + manual open as fallback |
| In non-TTY / CI style environment                         | Emit structured handoff JSON                              | machine-consumable                  |

---

## 6. Tool Selection UX

### 6.1 User Goal

The user may care which AI tool performs the analysis, but should not need to memorize environment variables like `BBG_CURRENT_TOOL`.

### 6.2 UX Rule

When no active AI context is detected:

1. BBG resolves available tools from config and defaults
2. if only one tool is effectively available, use it silently
3. if multiple tools are available and the session is interactive, ask exactly one question

Recommended prompt:

```text
Run analysis in which AI?
Claude / Codex / Gemini / OpenCode / Cursor
```

### 6.3 Persistence Rule

The selected tool should become the new default for subsequent analyze runs unless the user changes it later.

This reduces repeated friction without adding CLI complexity.

---

## 7. Auto-Launch and Handoff

### 7.1 Preferred Behavior

Handoff should still exist internally, but auto-launch should become the preferred path whenever possible.

Desired flow:

```text
user runs: bbg analyze
  → BBG detects no AI context
  → BBG selects tool
  → BBG prepares analyze handoff bundle
  → BBG launches chosen AI with that context
  → selected AI continues analysis
```

### 7.2 Fallback Behavior

If BBG cannot auto-launch the selected AI:

1. write handoff JSON and Markdown
2. show a single clear replay instruction
3. tell the user where the handoff lives

This fallback is important, but it should not be the default teaching path.

### 7.3 Internal vs External Complexity

The following are internal implementation details and should stay invisible to most users:

- `BBG_CURRENT_TOOL`
- pending handoff JSON
- handoff consumed state
- replay command construction
- autonomous vs agent-assisted execution mode

Users should see only:

- a command
- possibly one AI choice prompt
- then analysis starts

---

## 8. Focused Business Analysis UX

### 8.1 Requirement

The user wants to ask for targeted analysis of a business function without learning a new command family.

### 8.2 UX Decision

Natural-language focus text remains the only primary way to express that intent.

Examples:

```bash
bbg analyze "login and tenant permission flow"
bbg analyze "海报生成与分享链路"
bbg analyze --repo admin-web "运营配置流程"
```

### 8.3 System Interpretation

Focus text should influence:

1. repo ranking
2. evidence retrieval
3. ambiguity signal priority
4. Socratic question generation
5. generated business summary ordering
6. focused wiki/report section generation

### 8.4 Important Constraint

Focused analysis is not a completely separate mode. It is a prioritization lens over the same underlying knowledge model.

That ensures:

- focused runs still enrich the global knowledge base
- the system does not fragment into isolated reports
- future tasks can reuse knowledge learned from a focused run

---

## 9. Output UX

### 9.1 User Should Receive Three Kinds of Value

After analyze completes, the user should see:

1. a short run summary
2. where the key artifacts were written
3. what knowledge was improved

### 9.2 Recommended Terminal Output Shape

Keep the output concise and decision-oriented.

Recommended sections:

1. Run summary
2. Focus summary, if present
3. Key findings summary
4. Artifact paths
5. Pending questions or low-confidence areas

### 9.3 Avoid Dumping Too Much Raw Detail

The terminal should not print the entire knowledge model. It should print a compact digest and point to:

- `.bbg/knowledge/`
- `docs/wiki/`
- generated architecture/business docs

This keeps the command usable while preserving depth in durable artifacts.

---

## 10. Knowledge Persistence UX

### 10.1 Product Promise

Users should be able to trust that analyze is not a throwaway report.

The product promise should be:

> Every successful analyze run becomes durable project memory that future development can reuse.

### 10.2 User-Visible Mental Model

The user does not need to know every storage layer. The system can explain it simply as:

- `bbg analyze` updates the project knowledge base
- it also refreshes the project wiki
- future tasks and reviews will automatically reuse that knowledge

### 10.3 Actual Storage Layers

Internally, the command writes to:

1. `.bbg/knowledge/` for structured runtime reuse
2. `docs/wiki/` for human-readable memory
3. Hermes runtime/candidate pipeline for learning closure

But these layers should be presented as one product capability: **persistent reusable project understanding**.

---

## 11. Closed-Loop Learning UX

### 11.1 Product Requirement

Analyze should not only help the current moment. It should improve future work.

### 11.2 Closed Loop

The intended user-facing story is:

1. run `bbg analyze`
2. get project understanding
3. later run `bbg start "some task"`
4. BBG automatically reuses prior capabilities, flows, contracts, risks, and decisions
5. verification and review produce new evidence
6. the knowledge base becomes richer over time

### 11.3 What the User Should Notice

The user should gradually notice that:

- task routing becomes more accurate
- impacted repos/contracts are identified earlier
- reviewer hints become more precise
- business flows and risk hotspots become more complete
- repeated explanation overhead decreases

That is the practical value of integrating analyze with Hermes and wiki.

---

## 12. UX Anti-Patterns to Avoid

1. Requiring users to choose between `analyze`, `deep-analyze`, `analyze-focus`, `analyze-ai`, `analyze-hermes`
2. Requiring users to manually set environment variables before every run
3. Teaching handoff files as a normal user concept
4. Splitting "global analysis" and "focused business analysis" into unrelated workflows
5. Making users choose between wiki mode, knowledge mode, or Hermes mode
6. Printing huge terminal dumps instead of durable artifacts
7. Treating AI tool choice as a low-level configuration problem

---

## 13. Recommended Product Wording

### 13.1 Command Description

Current wording is too shallow:

> Analyze all or selected repositories

Recommended wording:

> Build reusable technical and business understanding for the workspace or a focused business area

### 13.2 Handoff Messaging

Current messaging is technically correct, but should evolve toward a more user-centered framing.

Recommended framing:

```text
Deep analysis runs best inside an AI tool.
BBG has prepared the analysis context and will continue in: Claude
```

If manual fallback is needed:

```text
Open the selected AI and continue with the prepared analysis handoff.
Replay command: ...
```

### 13.3 Success Messaging

Recommended summary message after completion:

```text
Analysis updated the project knowledge base, wiki, and architecture reports.
Future tasks can reuse the refreshed capabilities, flows, contracts, risks, and decisions.
```

---

## 14. Implementation Policy

### 14.1 UX Policy

For normal users, the command policy should be:

- one main command
- one optional natural-language focus
- one optional repo scope
- zero extra AI-specific flags in the normal path

### 14.2 Internal Policy

Internally BBG may still support:

- handoff bundles
- runtime AI detection
- auto-launch runners
- autonomous self-interview
- Hermes ingestion policies

But those remain internal execution machinery.

### 14.3 Product Boundary

The product should optimize for:

- low learning cost
- high reuse of knowledge
- strong AI-native analysis quality
- gradual accumulation of project memory

not for exposing every internal system knob.

---

## 15. Final Recommendation

The final recommended model is:

1. Keep `bbg analyze` as the single analysis entry point.
2. Keep natural-language focus as positional text.
3. Run deep analysis in AI context by default.
4. Use terminal only as the orchestration layer.
5. Prefer auto-launch over manual replay.
6. Always write results into `.bbg/knowledge/` and `docs/wiki/`.
7. Explicitly feed analyze outputs into Hermes so future work can reuse and refine them.
8. Never require users to understand the internal distinction between analyze, wiki, knowledge, and Hermes pipelines.

In short:

> The best UX for `bbg analyze` is not more flags. It is one command, AI-native execution, durable knowledge output, and automatic reuse in future development.
