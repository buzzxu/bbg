import { createAnalyzeRunId, writeAnalyzeRunState } from "../runtime/analyze-runs.js";
import { writeAnalyzeInterviewState } from "../runtime/analyze-interview.js";
import { writeAnalyzeWikiArtifacts } from "../runtime/wiki.js";
import { resolveDocumentationLanguage } from "../config/documentation-language.js";
import { buildAnalyzeKnowledgeModel } from "./analysis-model.js";
import { deriveRepoBusinessAnalysis } from "./business-analysis.js";
import { runAnalyzeDeepInterview } from "./deep-interview.js";
import { discoverAnalyzeSelection } from "./discovery.js";
import { writeAnalyzeDocs } from "./emit-docs.js";
import { writeAnalyzeKnowledge } from "./emit-knowledge.js";
import { deriveAnalyzeFocusSummary, enrichAnalyzeFocusSummary } from "./focus-analysis.js";
import { pruneStaleAnalyzeArtifacts } from "./prune-stale.js";
import { analyzeSelectedRepos } from "./repo-analysis.js";
import type { AnalyzeOrchestratorResult, AnalyzePhaseSummary, RunAnalyzeCommandInput } from "./types.js";
import { fuseWorkspaceAnalysis } from "./workspace-fusion.js";

export async function runAnalyzeOrchestrator(input: RunAnalyzeCommandInput): Promise<AnalyzeOrchestratorResult> {
  const phases: AnalyzePhaseSummary[] = [];
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
  const startedAt = new Date().toISOString();
  const runId = createAnalyzeRunId();
  const technical = await analyzeSelectedRepos(input.cwd, selection.selectedRepos);
  phases.push({
    name: "technical-analysis" as const,
    status: "completed" as const,
    details: technical.map((repo) => `${repo.repo.name}: ${repo.stack.language}/${repo.stack.framework}`),
  });
  const business = deriveRepoBusinessAnalysis(technical);
  phases.push({
    name: "business-analysis" as const,
    status: "completed" as const,
    details: business.map((repo) => `${repo.repoName}: ${repo.responsibilities.join("; ") || "no responsibilities inferred"}`),
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
  const interview = await runAnalyzeDeepInterview({
    cwd: input.cwd,
    technical,
    business,
    fusion,
    command: input,
  });
  phases.push(interview.phase);
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
  phases.push({
    name: "workflow-analysis",
    status: "completed",
    details: [`flows=${model.criticalFlows.length}`, `focus=${focus?.query ?? "none"}`],
  });
  phases.push({
    name: "contract-analysis",
    status: "completed",
    details: [`contracts=${model.contractSurfaces.length}`, `constraints=${model.runtimeConstraints.length}`],
  });
  phases.push({
    name: "risk-impact-analysis",
    status: "completed",
    details: [`risks=${model.riskSurface.length}`, `changes=${model.changeImpact.length}`, `decisions=${model.decisionRecords.length}`],
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
  const enrichedFocus = enrichAnalyzeFocusSummary({
    focus,
    technical,
    business,
    model,
  });
  const docs = await writeAnalyzeDocs({
    cwd: input.cwd,
    technical,
    business,
    fusion,
    interview: interview.summary,
    model,
    focus: enrichedFocus,
    documentationLanguage,
  });
  phases.push({
    name: "emit-docs" as const,
    status: "completed" as const,
    details: docs.docsUpdated.slice(0, 8),
  });
  const knowledge = await writeAnalyzeKnowledge({
    cwd: input.cwd,
    technical,
    business,
    fusion,
    interview: interview.summary,
    model,
    focus: enrichedFocus,
  });
  phases.push({
    name: "emit-knowledge" as const,
    status: "completed" as const,
    details: knowledge.knowledgeUpdated.slice(0, 8),
  });
  const wiki = await writeAnalyzeWikiArtifacts({
    cwd: input.cwd,
    fusion,
    interview: interview.summary,
    model,
    focus: enrichedFocus?.query ?? null,
    documentationLanguage,
  });
  phases.push({
    name: "emit-wiki" as const,
    status: "completed" as const,
    details: wiki.wikiPaths.slice(0, 8),
  });

  const interviewState = {
    version: 1,
    runId,
    updatedAt: new Date().toISOString(),
    summary: {
      ...interview.summary,
      artifactsUpdated: [
        ".bbg/knowledge/workspace/business-context.json",
        ".bbg/knowledge/workspace/constraints.json",
        ".bbg/knowledge/workspace/capabilities.json",
        ".bbg/knowledge/workspace/critical-flows.json",
        ".bbg/knowledge/workspace/contracts.json",
        ".bbg/knowledge/workspace/domain-model.json",
        ".bbg/knowledge/workspace/risk-surface.json",
        ".bbg/knowledge/workspace/decisions.json",
        ".bbg/knowledge/workspace/change-impact.json",
        "docs/business/project-context.md",
        "docs/business/capability-map.md",
        "docs/business/critical-flows.md",
        "docs/business/domain-model.md",
        "docs/architecture/integration-contracts.md",
        "docs/architecture/runtime-constraints.md",
        "docs/architecture/risk-surface.md",
        "docs/architecture/decision-history.md",
        "docs/architecture/change-impact-map.md",
        "docs/wiki/concepts/project-context.md",
        ...(interview.summary.pendingQuestionsPath ? [interview.summary.pendingQuestionsPath] : []),
      ],
    },
  };
  await writeAnalyzeInterviewState(input.cwd, interviewState);

  phases.push({
    name: "write-state",
    status: "completed",
    details: [`runId=${runId}`],
  });

  const status = interview.summary.pendingQuestions.length > 0 ? ("partial" as const) : ("completed" as const);
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
    warnings: [],
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
      projectContextPath: docs.projectContextPath,
      docsUpdated: [...docs.docsUpdated, ...wiki.wikiPaths],
      knowledgeUpdated: knowledge.knowledgeUpdated,
      phases,
      interview: interviewState.summary,
      focus: enrichedFocus,
      focusedAnalysisPath: docs.focusedAnalysisPath,
    },
  };
}
