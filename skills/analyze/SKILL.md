---
name: analyze
category: architecture
visibility: user
description: AI-driven BBG project analysis for full workspace business/technical architecture or focused business-function analysis; use instead of running a public bbg analyze CLI command
---

# Analyze Skill

Use this skill when the user asks to analyze a target project, all sub-projects, a business domain, a business process, a feature area, or a specific business function.

Do not ask the user to run `bbg analyze`. Analyze is an AI workflow. The CLI only provides an internal evidence runner.

## Operating Model

- The AI agent performs reasoning: business architecture, technical architecture, process inference, contradictions, unknowns, and evidence-backed claims.
- BBG performs deterministic work: repository scanning, evidence graph generation, schema validation, docs/wiki/Hermes persistence, and progress state.
- The internal command is `bbg analyze-agent`. It is for this skill only and should not be presented as the user-facing entrypoint.
- Progress is automatic: AI sessions use stable text progress that remains visible in captured transcripts; real human terminals may use TUI cards. Use `--progress tui` only when the user explicitly asks for terminal TUI output.

## Workflow

1. Confirm `.bbg/config.json` exists. If missing, tell the user to run `bbg init` first.
2. Determine scope from the user request:
   - Full workspace analysis: use all registered repositories.
   - Focused business analysis: preserve the user phrase exactly as the focus query, for example `售后流程分析`.
   - Repo-limited analysis: only use `--repo` or `--repos` internally when the user explicitly names repositories or the scope is unambiguous.
3. Run the internal evidence pass:
   - Full workspace: `bbg analyze-agent`
   - Focused business point: `bbg analyze-agent "<focus query>"`
   - Explicit repo: `bbg analyze-agent "<focus query>" --repo <repo>`
4. If the result is partial with `AI action required`, read `.bbg/analyze/ai/agent-task.md` first, then read the referenced request, schema, evidence graph, evidence index, domain lexicon, topology, contracts, critical flows, and business chains.
5. Write `.bbg/analyze/ai/response.json` as valid JSON. Do not write prose or Markdown into that file.
6. Rerun the same `bbg analyze-agent ...` command until the run completes or a real blocker remains.
7. Summarize the final result to the user with the most important docs, business conclusions, technical conclusions, unknowns, and recommended next analysis or implementation steps.

## Required Analysis Dimensions

For full workspace analysis, cover:

- Business scope: product purpose, actors, external systems, value streams, and bounded contexts.
- Business capabilities: capability map, owning repositories, user-facing/admin/backend responsibility split.
- Business flows: key end-to-end flows, triggers, state transitions, sync/async/manual steps, failure branches, compensation paths, and Mermaid diagrams when useful.
- Domain model: key business objects, DTO/entity evidence, lifecycle states, and terminology.
- Technical architecture: repository roles, stack, frameworks, major modules, boundaries, dependency direction, shared packages, runtime assumptions.
- Integration contracts: HTTP/API, UI-to-service, shared domain models, events, third-party integrations, versioning, and error semantics.
- Quality/risk: security-sensitive flows, auth/tenant/data boundaries, transaction boundaries, operational hotspots, test coverage gaps, and change impact.
- Knowledge integration: ensure docs, `.bbg/knowledge/`, wiki, Hermes intake, and lifecycle/run-diff artifacts are updated.

For focused analysis, start from the business phrase, not from a fixed directory name. Search semantically across routes, API paths, controllers, services, DTOs/entities, tests, page names, i18n text, config, and dependency names. Include both matching evidence and evidence gaps.

## Evidence Rules

- Every important claim must include evidence references in `response.json`.
- Prefer code and BBG evidence over directory guesses.
- If evidence is weak, write `unknowns` instead of inventing facts.
- Do not hardcode target-project-specific terms into BBG itself.
- Use web search only for external domain/framework/current-practice context, not as a replacement for local repository evidence.

## Response Contract

Use the schema in `.bbg/analyze/ai/response.schema.json`. The response must be shaped as:

```json
{
  "version": 1,
  "runId": "<same runId>",
  "inputSignature": "<same inputSignature>",
  "analysis": {
    "enabled": true,
    "mode": "handoff",
    "provider": "<current AI tool or null>",
    "modelClass": "premium",
    "generatedAt": "<ISO timestamp>",
    "recommendedDimensions": [],
    "businessArchitectureNarrative": [],
    "technicalArchitectureNarrative": [],
    "coreBusinessChains": [],
    "keyBusinessObjects": [],
    "decisionHypotheses": [],
    "unknowns": [],
    "contradictions": [],
    "claims": [],
    "promptPreview": []
  }
}
```

Populate arrays with real analysis. Empty arrays are only acceptable when there is genuinely no evidence for that section.

## Output Style

- Default to the project's `documentationLanguage`; if unknown, use Chinese.
- The final user-facing summary should be concise and actionable.
- Do not expose internal handoff mechanics unless the run cannot complete.

## Related

- `.bbg/harness/skills/business-analysis/SKILL.md`
- `.bbg/harness/skills/architecture-analysis/SKILL.md`
- `.bbg/harness/skills/cross-repo-analysis/SKILL.md`
- `.bbg/harness/skills/hermes-intake/SKILL.md`
