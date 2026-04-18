import { createAnalyzeRunId, writeAnalyzeRunState } from "../runtime/analyze-runs.js";
import { writeAnalyzeWikiArtifacts } from "../runtime/wiki.js";
import { deriveRepoBusinessAnalysis } from "./business-analysis.js";
import { discoverAnalyzeSelection } from "./discovery.js";
import { writeAnalyzeDocs } from "./emit-docs.js";
import { writeAnalyzeKnowledge } from "./emit-knowledge.js";
import { analyzeSelectedRepos } from "./repo-analysis.js";
import type { AnalyzeOrchestratorResult, RunAnalyzeCommandInput } from "./types.js";
import { fuseWorkspaceAnalysis } from "./workspace-fusion.js";

export async function runAnalyzeOrchestrator(input: RunAnalyzeCommandInput): Promise<AnalyzeOrchestratorResult> {
  const selection = await discoverAnalyzeSelection(input.cwd, input.repos);
  const startedAt = new Date().toISOString();
  const runId = createAnalyzeRunId();
  const technical = await analyzeSelectedRepos(input.cwd, selection.selectedRepos);
  const business = deriveRepoBusinessAnalysis(technical);
  const fusion = fuseWorkspaceAnalysis({
    scope: selection.scope,
    technical,
    business,
  });
  const docs = await writeAnalyzeDocs({
    cwd: input.cwd,
    technical,
    business,
    fusion,
  });
  const knowledge = await writeAnalyzeKnowledge({
    cwd: input.cwd,
    technical,
    business,
    fusion,
  });
  const wiki = await writeAnalyzeWikiArtifacts({
    cwd: input.cwd,
    fusion,
  });

  const state = {
    version: 1,
    runId,
    status: "completed" as const,
    scope: selection.scope,
    repos: selection.selectedRepos.map((repo) => repo.name),
    startedAt,
    updatedAt: new Date().toISOString(),
    docsUpdated: [...docs.docsUpdated, ...wiki.wikiPaths],
    knowledgeUpdated: knowledge.knowledgeUpdated,
    warnings: [],
    failures: [],
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
      repoDocs: docs.repoDocs,
      repositoryDocs: docs.repositoryDocs,
      workspaceTopologyPath: docs.workspaceTopologyPath,
      integrationMapPath: docs.integrationMapPath,
      moduleMapPath: docs.moduleMapPath,
      coreFlowsPath: docs.coreFlowsPath,
      docsUpdated: [...docs.docsUpdated, ...wiki.wikiPaths],
      knowledgeUpdated: knowledge.knowledgeUpdated,
    },
  };
}
