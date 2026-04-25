import { createAnalyzeRunId, writeAnalyzeRunState } from "../runtime/analyze-runs.js";
import { writeAnalyzeInterviewState } from "../runtime/analyze-interview.js";
import { buildAnalyzeProgressEvent, writeAnalyzeCurrentProgress } from "../runtime/analyze-progress.js";
import { planAnalyzeAiExecution } from "../runtime/ai-analysis-runner.js";
import { writeAnalyzeWikiArtifacts } from "../runtime/wiki.js";
import { reconcileAnalyzeAiResult } from "./ai-reconcile.js";
import { readAnalyzeAiReasoningResponse, writeAnalyzeAiReasoningContract } from "./ai-reasoning-contract.js";
import { resolveDocumentationLanguage } from "../config/documentation-language.js";
import { buildAnalyzeKnowledgeModel } from "./analysis-model.js";
import { deriveRepoBusinessAnalysis } from "./business-analysis.js";
import { runAnalyzeDeepInterview } from "./deep-interview.js";
import { discoverAnalyzeSelection } from "./discovery.js";
import { writeAnalyzeDocs } from "./emit-docs.js";
import { writeAnalyzeKnowledge } from "./emit-knowledge.js";
import {
  buildAnalyzeEvidenceGraph,
  enrichTechnicalAnalysisWithEvidenceGraph,
  writeAnalyzeEvidenceGraphArtifacts,
} from "./evidence-graph.js";
import { deriveAnalyzeFocusSummary, enrichAnalyzeFocusSummary } from "./focus-analysis.js";
import { writeAnalyzeHermesIntake } from "./hermes-intake.js";
import { enrichAnalyzeKnowledgeModel } from "./knowledge-items.js";
import { pruneStaleAnalyzeArtifacts } from "./prune-stale.js";
import { analyzeSelectedRepos } from "./repo-analysis.js";
import { runAnalyzeSocraticInterview } from "./socratic-engine.js";
import type {
  AnalyzeFocusSummary,
  AnalyzeOrchestratorResult,
  AnalyzePhaseSummary,
  RunAnalyzeCommandInput,
} from "./types.js";
import { fuseWorkspaceAnalysis } from "./workspace-fusion.js";

async function reportAnalyzeProgress(
  input: RunAnalyzeCommandInput,
  eventInput: Parameters<typeof buildAnalyzeProgressEvent>[0],
): Promise<void> {
  const event = buildAnalyzeProgressEvent(eventInput);
  await writeAnalyzeCurrentProgress(input.cwd, event);
  await input.progress?.(event);
}

function buildAnalyzeReplayCommand(input: {
  focus: AnalyzeFocusSummary | null;
  repos: string[];
  refresh?: boolean;
  interviewMode?: string;
}): string {
  const args = ["bbg", "analyze-agent"];
  if (input.focus?.query) {
    args.push(JSON.stringify(input.focus.query));
  }
  if (input.repos.length === 1) {
    args.push("--repo", input.repos[0]!);
  } else if (input.repos.length > 1) {
    args.push("--repos", input.repos.join(","));
  }
  if (input.refresh) {
    args.push("--refresh");
  }
  if (input.interviewMode && input.interviewMode !== "auto") {
    args.push("--interview", input.interviewMode);
  }
  return args.join(" ");
}

export async function runAnalyzeOrchestrator(input: RunAnalyzeCommandInput): Promise<AnalyzeOrchestratorResult> {
  const phases: AnalyzePhaseSummary[] = [];
  const startedAt = new Date().toISOString();
  const runId = createAnalyzeRunId();
  await reportAnalyzeProgress(input, {
    runId,
    phase: "discovery",
    status: "running",
    message: "Discovering BBG configuration and target repositories.",
  });
  const selection = await discoverAnalyzeSelection(input.cwd, input.repos);
  const documentationLanguage = resolveDocumentationLanguage(selection.config);
  phases.push({
    name: "discovery" as const,
    status: "completed" as const,
    details: [
      `scope=${selection.scope}`,
      `repos=${selection.selectedRepos.map((repo) => repo.name).join(", ") || "none"}`,
    ],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "discovery",
    status: "completed",
    message: `Discovered ${selection.selectedRepos.length} repository target(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "technical-analysis",
    status: "running",
    message: "Scanning repository stacks, dependencies, tests, routes, APIs, and DTO/entity signals.",
  });
  const rawTechnical = await analyzeSelectedRepos(input.cwd, selection.selectedRepos);
  phases.push({
    name: "technical-analysis" as const,
    status: "completed" as const,
    details: rawTechnical.map((repo) => `${repo.repo.name}: ${repo.stack.language}/${repo.stack.framework}`),
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "technical-analysis",
    status: "completed",
    message: `Collected technical signals from ${rawTechnical.length} repo(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "evidence-graph",
    status: "running",
    message: "Building evidence graph from code references.",
  });
  const evidenceGraph = await buildAnalyzeEvidenceGraph({
    cwd: input.cwd,
    runId,
    technical: rawTechnical,
  });
  const evidenceGraphPaths = await writeAnalyzeEvidenceGraphArtifacts({
    cwd: input.cwd,
    graph: evidenceGraph,
  });
  const technical = enrichTechnicalAnalysisWithEvidenceGraph({
    technical: rawTechnical,
    graph: evidenceGraph,
  });
  phases.push({
    name: "evidence-graph" as const,
    status: "completed" as const,
    details: [
      `files=${evidenceGraph.files.length}`,
      `routes=${evidenceGraph.routes.length}`,
      `apis=${evidenceGraph.apiEndpoints.length}`,
      `entities=${evidenceGraph.dtoEntities.length}`,
      evidenceGraphPaths[evidenceGraphPaths.length - 1] ?? ".bbg/analyze/evidence/evidence-graph.json",
    ],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "evidence-graph",
    status: "completed",
    message: `Indexed evidence graph with ${evidenceGraph.files.length} file(s), ${evidenceGraph.apiEndpoints.length} API endpoint(s), and ${evidenceGraph.routes.length} route(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "business-analysis",
    status: "running",
    message: "Inferring repository responsibilities and business capabilities from evidence.",
  });
  const business = deriveRepoBusinessAnalysis(technical);
  phases.push({
    name: "business-analysis" as const,
    status: "completed" as const,
    details: business.map(
      (repo) => `${repo.repoName}: ${repo.responsibilities.join("; ") || "no responsibilities inferred"}`,
    ),
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "business-analysis",
    status: "completed",
    message: `Inferred business signals for ${business.length} repo(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "workspace-fusion",
    status: "running",
    message: "Fusing repositories into workspace topology and integration edges.",
  });
  const fusion = fuseWorkspaceAnalysis({
    scope: selection.scope,
    technical,
    business,
  });
  phases.push({
    name: "workspace-fusion" as const,
    status: "completed" as const,
    details: [
      `repos=${fusion.repos.length}`,
      `edges=${fusion.integrationEdges.length}`,
      `businessModules=${fusion.businessModules.length}`,
    ],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "workspace-fusion",
    status: "completed",
    message: `Fused workspace topology with ${fusion.integrationEdges.length} inferred edge(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "focus-analysis",
    status: "running",
    message: input.focus
      ? `Resolving focus query: ${input.focus}`
      : "No focus query provided; using workspace-wide analysis.",
  });
  const focus = deriveAnalyzeFocusSummary({
    focus: input.focus,
    technical,
    business,
    fusion,
  });
  phases.push({
    name: "focus-analysis" as const,
    status: focus ? "completed" : "skipped",
    details: focus
      ? [
          `query=${focus.query}`,
          `repos=${focus.matchedRepos.join(", ") || "none"}`,
          `signals=${focus.matchedSignals.slice(0, 4).join(" | ") || "none"}`,
        ]
      : ["none"],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "focus-analysis",
    status: focus ? "completed" : "skipped",
    message: focus
      ? `Matched focus against ${focus.matchedRepos.length} repo(s).`
      : "Skipped focus analysis because no focus query was provided.",
    details: phases[phases.length - 1]?.details ?? [],
  });
  const useLegacyInterview =
    process.env.BBG_ANALYZE_LEGACY_INTERVIEW === "1" || process.env.BBG_ANALYZE_INTERVIEW_V2 === "0";
  await reportAnalyzeProgress(input, {
    runId,
    phase: "deep-interview",
    status: "running",
    message: "Running Socratic interview and applying evidence-backed assumptions.",
  });
  const interview = useLegacyInterview
    ? await runAnalyzeDeepInterview({
        cwd: input.cwd,
        technical,
        business,
        fusion,
        command: input,
      })
    : await runAnalyzeSocraticInterview({
        cwd: input.cwd,
        technical,
        business,
        fusion,
        command: input,
        focus,
      });
  phases.push(interview.phase);
  await reportAnalyzeProgress(input, {
    runId,
    phase: "deep-interview",
    status: interview.phase.status,
    message:
      interview.phase.status === "pending"
        ? "Interview has pending questions that need AI or human answers."
        : "Interview context has been captured.",
    details: interview.phase.details,
    nextAction:
      interview.phase.status === "pending"
        ? (interview.summary.pendingQuestionsPath ?? "Answer pending analyze interview questions.")
        : null,
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "capability-analysis",
    status: "running",
    message: "Deriving capabilities, domain contexts, workflows, contracts, and risks.",
  });
  const model = buildAnalyzeKnowledgeModel({
    technical,
    business,
    fusion,
    interview: interview.summary,
    focus,
  });
  phases.push({
    name: "capability-analysis",
    status: "completed",
    details: [`capabilities=${model.capabilities.length}`, `domainContexts=${model.domainContexts.length}`],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "capability-analysis",
    status: "completed",
    message: `Derived ${model.capabilities.length} capability candidate(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  phases.push({
    name: "workflow-analysis",
    status: "completed",
    details: [`flows=${model.criticalFlows.length}`, `focus=${focus?.query ?? "none"}`],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "workflow-analysis",
    status: "completed",
    message: `Derived ${model.criticalFlows.length} critical flow candidate(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  phases.push({
    name: "contract-analysis",
    status: "completed",
    details: [`contracts=${model.contractSurfaces.length}`, `constraints=${model.runtimeConstraints.length}`],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "contract-analysis",
    status: "completed",
    message: `Derived ${model.contractSurfaces.length} contract surface(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  phases.push({
    name: "risk-impact-analysis",
    status: "completed",
    details: [
      `risks=${model.riskSurface.length}`,
      `changes=${model.changeImpact.length}`,
      `decisions=${model.decisionRecords.length}`,
    ],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "risk-impact-analysis",
    status: "completed",
    message: `Mapped ${model.riskSurface.length} risk item(s) and ${model.changeImpact.length} impact target(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "prepare-ai-context",
    status: "running",
    message: "Preparing provider-agnostic AI deep analysis contract.",
  });
  const aiExecution = planAnalyzeAiExecution(selection.config.runtime);
  phases.push({
    name: "prepare-ai-context",
    status: aiExecution.enabled ? "completed" : "skipped",
    details: [
      `mode=${aiExecution.mode}`,
      `provider=${aiExecution.provider ?? "none"}`,
      `modelClass=${aiExecution.modelClass ?? "none"}`,
      aiExecution.reason ?? "none",
    ],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "prepare-ai-context",
    status: aiExecution.enabled ? "completed" : "skipped",
    message: aiExecution.enabled
      ? "AI deep analysis contract is ready."
      : "AI deep analysis is disabled in runtime config.",
    details: phases[phases.length - 1]?.details ?? [],
  });
  const enrichedModel = enrichAnalyzeKnowledgeModel(model);
  const aiReasoningContract = await writeAnalyzeAiReasoningContract({
    cwd: input.cwd,
    runId,
    execution: aiExecution,
    technical,
    business,
    fusion,
    interview: interview.summary,
    focus,
    model: enrichedModel,
    evidenceGraph,
    replayCommand: buildAnalyzeReplayCommand({
      focus,
      repos: selection.selectedRepos.map((repo) => repo.name),
      refresh: input.refresh,
      interviewMode: input.interview?.mode,
    }),
  });
  const contractedAiAnalysis = await readAnalyzeAiReasoningResponse({
    cwd: input.cwd,
    runId,
    inputSignature: aiReasoningContract.inputSignature,
  });
  const aiAnalysis = contractedAiAnalysis;
  phases.push({
    name: "ai-analysis",
    status: aiAnalysis ? (aiAnalysis.enabled ? "completed" : "skipped") : "pending",
    details: aiAnalysis
      ? [
          `dimensions=${aiAnalysis.recommendedDimensions.length}`,
          `chains=${aiAnalysis.coreBusinessChains.length}`,
          `unknowns=${aiAnalysis.unknowns.length}`,
          "source=external-contract",
        ]
      : [
          "source=missing-external-response",
          `request=${aiReasoningContract.requestPath}`,
          `instructions=${aiReasoningContract.instructionsPath}`,
          `agentTask=${aiReasoningContract.agentTaskPath}`,
          `response=${aiReasoningContract.responsePath}`,
        ],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "ai-analysis",
    status: aiAnalysis ? (aiAnalysis.enabled ? "completed" : "skipped") : "pending",
    message: aiAnalysis
      ? `Loaded external AI analysis with ${aiAnalysis.claims.length} claim(s).`
      : "Waiting for AI deep analysis response; static local synthesis is disabled.",
    details: phases[phases.length - 1]?.details ?? [],
    nextAction: aiAnalysis
      ? null
      : "Current AI agent must read .bbg/analyze/ai/agent-task.md, write .bbg/analyze/ai/response.json, then rerun bbg analyze-agent.",
  });
  const reconciled = aiAnalysis ? reconcileAnalyzeAiResult({ model, ai: aiAnalysis }) : { model, reconciliation: null };
  const finalModel = reconciled.model;
  phases.push({
    name: "reconcile-ai-analysis",
    status: reconciled.reconciliation ? "completed" : "skipped",
    details: reconciled.reconciliation
      ? [
          `adoptedDimensions=${reconciled.reconciliation.adoptedDimensions.length}`,
          `adoptedChains=${reconciled.reconciliation.adoptedChains.length}`,
          `review=${reconciled.reconciliation.reviewRequired.length}`,
        ]
      : ["no-ai-reconciliation"],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "reconcile-ai-analysis",
    status: reconciled.reconciliation ? "completed" : "skipped",
    message: reconciled.reconciliation
      ? "Reconciled AI analysis into workspace knowledge model."
      : "Skipped AI reconciliation because no external AI response was available.",
    details: phases[phases.length - 1]?.details ?? [],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "prune-stale",
    status: "running",
    message: "Pruning stale analyze artifacts from earlier repository sets.",
  });
  const pruned = await pruneStaleAnalyzeArtifacts({
    cwd: input.cwd,
    config: selection.config,
  });
  phases.push({
    name: "prune-stale" as const,
    status: "completed" as const,
    details: pruned.removed.length > 0 ? pruned.removed.slice(0, 8) : ["none"],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "prune-stale",
    status: "completed",
    message: `Pruned ${pruned.removed.length} stale artifact(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  const enrichedFocus = enrichAnalyzeFocusSummary({
    focus,
    technical,
    business,
    model: finalModel,
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "emit-docs",
    status: "running",
    message: "Writing business, architecture, workflow, and focused analysis documents.",
  });
  const docs = await writeAnalyzeDocs({
    cwd: input.cwd,
    technical,
    business,
    fusion,
    interview: interview.summary,
    model: finalModel,
    focus: enrichedFocus,
    documentationLanguage,
  });
  phases.push({
    name: "emit-docs" as const,
    status: "completed" as const,
    details: docs.docsUpdated.slice(0, 8),
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "emit-docs",
    status: "completed",
    message: `Wrote ${docs.docsUpdated.length} documentation artifact(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "emit-knowledge",
    status: "running",
    message: "Writing structured knowledge, evidence index, lifecycle, and run diff artifacts.",
  });
  const knowledge = await writeAnalyzeKnowledge({
    cwd: input.cwd,
    runId,
    scope: selection.scope,
    repos: selection.selectedRepos.map((repo) => repo.name),
    technical,
    business,
    fusion,
    interview: interview.summary,
    model: finalModel,
    focus: enrichedFocus,
    aiAnalysis,
    reconciliation: reconciled.reconciliation,
    evidenceGraph,
    aiReasoningContractPaths: [
      aiReasoningContract.requestPath,
      aiReasoningContract.instructionsPath,
      aiReasoningContract.agentTaskPath,
      aiReasoningContract.responseSchemaPath,
    ],
  });
  phases.push({
    name: "emit-knowledge" as const,
    status: "completed" as const,
    details: knowledge.knowledgeUpdated.slice(0, 8),
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "emit-knowledge",
    status: "completed",
    message: `Wrote ${knowledge.knowledgeUpdated.length} knowledge artifact(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "emit-hermes-intake",
    status: "running",
    message: "Preparing Hermes learning intake from analyze knowledge snapshot.",
  });
  if (knowledge.snapshotPath) {
    const hermes = await writeAnalyzeHermesIntake({
      cwd: input.cwd,
      runId,
      snapshotPath: knowledge.snapshotPath,
    });
    knowledge.knowledgeUpdated.push(hermes.artifactsPath, hermes.candidatesPath);
    phases.push({
      name: "emit-hermes-intake",
      status: "completed",
      details: [
        `${hermes.artifactsPath} (+${hermes.artifactsAdded})`,
        `${hermes.candidatesPath} (+${hermes.candidatesAdded})`,
      ],
    });
    await reportAnalyzeProgress(input, {
      runId,
      phase: "emit-hermes-intake",
      status: "completed",
      message: `Prepared Hermes intake with ${hermes.artifactsAdded} artifact(s) and ${hermes.candidatesAdded} candidate(s).`,
      details: phases[phases.length - 1]?.details ?? [],
    });
  } else {
    phases.push({
      name: "emit-hermes-intake",
      status: "skipped",
      details: ["no snapshot"],
    });
    await reportAnalyzeProgress(input, {
      runId,
      phase: "emit-hermes-intake",
      status: "skipped",
      message: "Skipped Hermes intake because no knowledge snapshot was emitted.",
      details: phases[phases.length - 1]?.details ?? [],
    });
  }
  await reportAnalyzeProgress(input, {
    runId,
    phase: "emit-wiki",
    status: "running",
    message: "Writing wiki summary and concept pages.",
  });
  const wiki = await writeAnalyzeWikiArtifacts({
    cwd: input.cwd,
    fusion,
    interview: interview.summary,
    model: finalModel,
    focus: enrichedFocus?.query ?? null,
    evidenceGraph,
    documentationLanguage,
  });
  phases.push({
    name: "emit-wiki" as const,
    status: "completed" as const,
    details: wiki.wikiPaths.slice(0, 8),
  });
  await reportAnalyzeProgress(input, {
    runId,
    phase: "emit-wiki",
    status: "completed",
    message: `Wrote ${wiki.wikiPaths.length} wiki artifact(s).`,
    details: phases[phases.length - 1]?.details ?? [],
  });

  const aiResponsePending = aiExecution.enabled && !aiAnalysis;
  const aiPendingWarning = aiResponsePending
    ? "AI deep analysis response missing; current AI agent must read .bbg/analyze/ai/agent-task.md, write .bbg/analyze/ai/response.json, then rerun bbg analyze-agent."
    : null;
  const interviewState = {
    version: 1,
    runId,
    updatedAt: new Date().toISOString(),
    summary: {
      ...interview.summary,
      artifactsUpdated: [
        ".bbg/knowledge/workspace/business-context.json",
        ".bbg/knowledge/workspace/constraints.json",
        ".bbg/knowledge/workspace/evidence-graph.json",
        ".bbg/knowledge/workspace/domain-lexicon.json",
        ".bbg/knowledge/workspace/analysis-dimensions.json",
        ".bbg/knowledge/workspace/capabilities.json",
        ".bbg/knowledge/workspace/critical-flows.json",
        ".bbg/knowledge/workspace/business-chains.json",
        ".bbg/knowledge/workspace/contracts.json",
        ".bbg/knowledge/workspace/domain-model.json",
        ".bbg/knowledge/workspace/risk-surface.json",
        ".bbg/knowledge/workspace/decisions.json",
        ".bbg/knowledge/workspace/change-impact.json",
        ...(aiAnalysis ? [".bbg/knowledge/workspace/ai-analysis.json"] : []),
        ...(reconciled.reconciliation ? [".bbg/knowledge/workspace/reconciliation-report.json"] : []),
        ".bbg/knowledge/workspace/knowledge-items.json",
        ".bbg/knowledge/workspace/evidence-index.json",
        ".bbg/knowledge/workspace/lifecycle.json",
        ".bbg/knowledge/workspace/run-diff.json",
        ".bbg/analyze/ai/request.json",
        ".bbg/analyze/ai/instructions.md",
        ".bbg/analyze/ai/agent-task.md",
        ".bbg/analyze/ai/response.schema.json",
        ".bbg/knowledge/hermes/analyze-artifacts.json",
        ".bbg/knowledge/hermes/analyze-candidates.json",
        "docs/business/project-context.md",
        "docs/business/analysis-dimensions.md",
        "docs/business/capability-map.md",
        "docs/business/critical-flows.md",
        "docs/business/business-chains.md",
        "docs/business/domain-model.md",
        "docs/architecture/integration-contracts.md",
        "docs/architecture/runtime-constraints.md",
        "docs/architecture/risk-surface.md",
        "docs/architecture/decision-history.md",
        "docs/architecture/change-impact-map.md",
        "docs/wiki/concepts/project-context.md",
        ...(knowledge.snapshotPath ? [knowledge.snapshotPath] : []),
        ...(interview.summary.pendingQuestionsPath ? [interview.summary.pendingQuestionsPath] : []),
      ],
    },
  };
  await writeAnalyzeInterviewState(input.cwd, interviewState);

  await reportAnalyzeProgress(input, {
    runId,
    phase: "write-state",
    status: "running",
    message: "Writing final analyze run state.",
  });
  phases.push({
    name: "write-state",
    status: "completed",
    details: [`runId=${runId}`],
  });

  const status =
    interview.summary.pendingQuestions.length > 0 || aiResponsePending ? ("partial" as const) : ("completed" as const);
  const state = {
    version: 1,
    runId,
    status,
    scope: selection.scope,
    repos: selection.selectedRepos.map((repo) => repo.name),
    startedAt,
    updatedAt: new Date().toISOString(),
    docsUpdated: [...docs.docsUpdated, ...wiki.wikiPaths],
    knowledgeUpdated: knowledge.knowledgeUpdated,
    warnings: aiPendingWarning ? [aiPendingWarning] : [],
    failures: [],
    phases,
    focus,
    focusedAnalysis: enrichedFocus
      ? {
          query: enrichedFocus.query,
          repos: enrichedFocus.matchedRepos,
          contracts: enrichedFocus.matchedContracts,
          risks: enrichedFocus.riskHotspots,
        }
      : null,
    interview: {
      mode: interview.summary.mode,
      asked: interview.summary.asked,
      answered: interview.summary.answered,
      unresolvedGaps: interview.summary.unresolvedGaps,
    },
  };
  await writeAnalyzeRunState(input.cwd, state);
  await reportAnalyzeProgress(input, {
    runId,
    phase: aiResponsePending ? "ai-analysis" : "write-state",
    status: state.status,
    message: aiResponsePending
      ? "Analyze is partial because AI deep analysis response is still missing."
      : `Analyze finished with status ${state.status}.`,
    details: aiResponsePending
      ? [
          `agentTask=${aiReasoningContract.agentTaskPath}`,
          `response=${aiReasoningContract.responsePath}`,
          `instructions=${aiReasoningContract.instructionsPath}`,
        ]
      : [`runId=${runId}`],
    nextAction: aiPendingWarning,
    progressPercent: aiResponsePending ? undefined : 100,
  });

  return {
    state,
    result: {
      runId,
      status: state.status,
      scope: state.scope,
      analyzedRepos: selection.selectedRepos.map((repo) => repo.name),
      technicalArchitecturePath: docs.technicalArchitecturePath,
      businessArchitecturePath: docs.businessArchitecturePath,
      dependencyGraphPath: docs.dependencyGraphPath,
      analysisDimensionsPath: docs.analysisDimensionsPath,
      capabilityMapPath: docs.capabilityMapPath,
      criticalFlowsPath: docs.criticalFlowsPath,
      integrationContractsPath: docs.integrationContractsPath,
      runtimeConstraintsPath: docs.runtimeConstraintsPath,
      riskSurfacePath: docs.riskSurfacePath,
      decisionHistoryPath: docs.decisionHistoryPath,
      changeImpactMapPath: docs.changeImpactMapPath,
      repoDocs: docs.repoDocs,
      repositoryDocs: docs.repositoryDocs,
      workspaceTopologyPath: docs.workspaceTopologyPath,
      integrationMapPath: docs.integrationMapPath,
      moduleMapPath: docs.moduleMapPath,
      coreFlowsPath: docs.coreFlowsPath,
      businessChainsPath: docs.businessChainsPath,
      projectContextPath: docs.projectContextPath,
      docsUpdated: [...docs.docsUpdated, ...wiki.wikiPaths],
      knowledgeUpdated: knowledge.knowledgeUpdated,
      phases,
      interview: interviewState.summary,
      focus: enrichedFocus,
      focusedAnalysisPath: docs.focusedAnalysisPath,
      aiAgentTaskPath: aiResponsePending ? aiReasoningContract.agentTaskPath : null,
      aiResponsePath: aiResponsePending ? aiReasoningContract.responsePath : null,
      nextAction: aiPendingWarning,
    },
  };
}
