import { rm } from "node:fs/promises";
import { join } from "node:path";
import type {
  AnalyzeFocusSummary,
  AnalyzeKnowledgeModel,
  AnalyzeInterviewSummary,
  AnalyzeKnowledgeArtifacts,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  WorkspaceFusionResult,
} from "./types.js";
import { exists, writeTextFile } from "../utils/fs.js";

export async function writeAnalyzeKnowledge(input: {
  cwd: string;
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
  interview: AnalyzeInterviewSummary | null;
  model: AnalyzeKnowledgeModel;
  focus: AnalyzeFocusSummary | null;
}): Promise<AnalyzeKnowledgeArtifacts> {
  const updatedAt = new Date().toISOString();
  const knowledgeUpdated: string[] = [];
  const businessByRepo = new Map(input.business.map((entry) => [entry.repoName, entry] as const));

  for (const technical of input.technical) {
    const technicalKnowledgePath = `.bbg/knowledge/repos/${technical.repo.name}/technical.json`;
    const businessKnowledgePath = `.bbg/knowledge/repos/${technical.repo.name}/business.json`;
    const patternsKnowledgePath = `.bbg/knowledge/repos/${technical.repo.name}/patterns.json`;
    const business = businessByRepo.get(technical.repo.name);

    await writeTextFile(
      join(input.cwd, technicalKnowledgePath),
      `${JSON.stringify({
        version: 1,
        repo: technical.repo.name,
        updatedAt,
        stack: technical.stack,
        structure: technical.structure,
        deps: technical.deps,
        testing: technical.testing,
      }, null, 2)}\n`,
    );
    await writeTextFile(
      join(input.cwd, businessKnowledgePath),
      `${JSON.stringify({
        version: 1,
        repo: technical.repo.name,
        updatedAt,
        description: technical.repo.description,
        type: technical.repo.type,
        responsibilities: business?.responsibilities ?? [],
        flowHints: business?.flowHints ?? [],
      }, null, 2)}\n`,
    );
    await writeTextFile(
      join(input.cwd, patternsKnowledgePath),
      `${JSON.stringify({
        version: 1,
        repo: technical.repo.name,
        updatedAt,
        patterns: technical.structure,
        dependencySignals: technical.deps,
      }, null, 2)}\n`,
    );
    knowledgeUpdated.push(technicalKnowledgePath, businessKnowledgePath, patternsKnowledgePath);
  }

  const workspaceTopologyPath = ".bbg/knowledge/workspace/topology.json";
  await writeTextFile(
    join(input.cwd, workspaceTopologyPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      repos: input.fusion.repos.map((repo) => ({
        name: repo.name,
        type: repo.type,
        stack: repo.stack,
        deps: repo.deps,
      })),
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceTopologyPath);

  const workspaceIntegrationMapPath = ".bbg/knowledge/workspace/integration-map.json";
  await writeTextFile(
    join(input.cwd, workspaceIntegrationMapPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      edges: input.fusion.integrationEdges,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceIntegrationMapPath);

  const workspaceBusinessModulesPath = ".bbg/knowledge/workspace/business-modules.json";
  await writeTextFile(
    join(input.cwd, workspaceBusinessModulesPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      repos: input.fusion.businessModules,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceBusinessModulesPath);

  const workspaceCapabilitiesPath = ".bbg/knowledge/workspace/capabilities.json";
  await writeTextFile(
    join(input.cwd, workspaceCapabilitiesPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      source: "analyze",
      capabilities: input.model.capabilities,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceCapabilitiesPath);

  const workspaceAnalysisDimensionsPath = ".bbg/knowledge/workspace/analysis-dimensions.json";
  await writeTextFile(
    join(input.cwd, workspaceAnalysisDimensionsPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      source: "analyze",
      dimensions: input.model.analysisDimensions,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceAnalysisDimensionsPath);

  const workspaceCriticalFlowsPath = ".bbg/knowledge/workspace/critical-flows.json";
  await writeTextFile(
    join(input.cwd, workspaceCriticalFlowsPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      source: "analyze",
      flows: input.model.criticalFlows,
      focus: null,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceCriticalFlowsPath);

  const workspaceContractsPath = ".bbg/knowledge/workspace/contracts.json";
  await writeTextFile(
    join(input.cwd, workspaceContractsPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      source: "analyze",
      contractSurfaces: input.model.contractSurfaces,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceContractsPath);

  const workspaceDomainModelPath = ".bbg/knowledge/workspace/domain-model.json";
  await writeTextFile(
    join(input.cwd, workspaceDomainModelPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      source: "analyze",
      contexts: input.model.domainContexts,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceDomainModelPath);

  const workspaceBusinessContextPath = ".bbg/knowledge/workspace/business-context.json";
  await writeTextFile(
    join(input.cwd, workspaceBusinessContextPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      source: "analyze",
      interviewMode: input.interview?.mode ?? "off",
      assumptionsApplied: input.interview?.assumptionsApplied ?? [],
      businessGoal: input.interview?.context.businessGoal ?? null,
      criticalFlows: input.interview?.context.criticalFlows ?? [],
      systemBoundaries: input.interview?.context.systemBoundaries ?? [],
      failureHotspots: input.interview?.context.failureHotspots ?? [],
      decisionHistory: input.interview?.context.decisionHistory ?? [],
      capabilityCount: input.model.capabilities.length,
      flowCount: input.model.criticalFlows.length,
      confidence: input.interview?.confidenceAfter ?? null,
      unresolvedGaps: input.interview?.unresolvedGaps ?? [],
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceBusinessContextPath);

  const workspaceConstraintsPath = ".bbg/knowledge/workspace/constraints.json";
  await writeTextFile(
    join(input.cwd, workspaceConstraintsPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      source: "analyze",
      interviewMode: input.interview?.mode ?? "off",
      assumptionsApplied: input.interview?.assumptionsApplied
        ?.filter((assumption) => assumption.key === "nonNegotiableConstraints")
        ?? [],
      constraints: input.interview?.context.nonNegotiableConstraints ?? [],
      confidence: input.interview?.confidenceAfter?.nonNegotiableConstraints ?? 0,
      unresolvedGaps: input.interview?.unresolvedGaps ?? [],
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceConstraintsPath);

  const workspaceRiskSurfacePath = ".bbg/knowledge/workspace/risk-surface.json";
  await writeTextFile(
    join(input.cwd, workspaceRiskSurfacePath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      source: "analyze",
      risks: input.model.riskSurface,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceRiskSurfacePath);

  const workspaceDecisionsPath = ".bbg/knowledge/workspace/decisions.json";
  await writeTextFile(
    join(input.cwd, workspaceDecisionsPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      source: "analyze",
      decisions: input.model.decisionRecords,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceDecisionsPath);

  const workspaceChangeImpactPath = ".bbg/knowledge/workspace/change-impact.json";
  await writeTextFile(
    join(input.cwd, workspaceChangeImpactPath),
    `${JSON.stringify({
      version: 1,
      updatedAt,
      source: "analyze",
      impacts: input.model.changeImpact,
    }, null, 2)}\n`,
  );
  knowledgeUpdated.push(workspaceChangeImpactPath);

  const focusedAnalysisPath = ".bbg/knowledge/workspace/focused-analysis.json";
  if (input.focus) {
    await writeTextFile(
      join(input.cwd, focusedAnalysisPath),
      `${JSON.stringify({
        version: 1,
        updatedAt,
        source: "analyze",
        focus: input.focus,
      }, null, 2)}\n`,
    );
    knowledgeUpdated.push(focusedAnalysisPath);
  } else if (await exists(join(input.cwd, focusedAnalysisPath))) {
    await rm(join(input.cwd, focusedAnalysisPath), { force: true });
  }

  return { knowledgeUpdated };
}
