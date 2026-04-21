import { rm } from "node:fs/promises";
import { join } from "node:path";
import type {
  AnalyzeFocusSummary,
  AnalyzeInterviewSummary,
  AnalyzeKnowledgeArtifacts,
  AnalyzeKnowledgeItem,
  AnalyzeKnowledgeModel,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  WorkspaceFusionResult,
} from "./types.js";
import { buildAnalyzeKnowledgeLifecycleStates, buildAnalyzeRunDiff } from "./knowledge-lifecycle.js";
import {
  buildAnalyzeKnowledgeItemsIndex,
  enrichAnalyzeKnowledgeModel,
  isAnalyzeCandidateWorthy,
} from "./knowledge-items.js";
import { applyValidationEventsToKnowledgeItems, type AnalyzeKnowledgeValidationEvent } from "./knowledge-validation.js";
import { collectAnalyzeEvidenceItems } from "./evidence-collector.js";
import { exists, readIfExists, writeTextFile } from "../utils/fs.js";

function parseKnowledgeItems(raw: string | null): AnalyzeKnowledgeItem[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as { items?: AnalyzeKnowledgeItem[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function parseValidationEvents(raw: string | null): AnalyzeKnowledgeValidationEvent[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as { events?: AnalyzeKnowledgeValidationEvent[] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export async function writeAnalyzeKnowledge(input: {
  cwd: string;
  runId: string;
  scope: "repo" | "workspace";
  repos: string[];
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
  const enrichedModel = enrichAnalyzeKnowledgeModel(input.model);

  for (const technical of input.technical) {
    const technicalKnowledgePath = `.bbg/knowledge/repos/${technical.repo.name}/technical.json`;
    const businessKnowledgePath = `.bbg/knowledge/repos/${technical.repo.name}/business.json`;
    const patternsKnowledgePath = `.bbg/knowledge/repos/${technical.repo.name}/patterns.json`;
    const business = businessByRepo.get(technical.repo.name);

    await writeTextFile(
      join(input.cwd, technicalKnowledgePath),
      `${JSON.stringify(
        {
          version: 2,
          runId: input.runId,
          repo: technical.repo.name,
          updatedAt,
          stack: technical.stack,
          structure: technical.structure,
          deps: technical.deps,
          testing: technical.testing,
        },
        null,
        2,
      )}\n`,
    );
    await writeTextFile(
      join(input.cwd, businessKnowledgePath),
      `${JSON.stringify(
        {
          version: 2,
          runId: input.runId,
          repo: technical.repo.name,
          updatedAt,
          description: technical.repo.description,
          type: technical.repo.type,
          responsibilities: business?.responsibilities ?? [],
          flowHints: business?.flowHints ?? [],
        },
        null,
        2,
      )}\n`,
    );
    await writeTextFile(
      join(input.cwd, patternsKnowledgePath),
      `${JSON.stringify(
        {
          version: 2,
          runId: input.runId,
          repo: technical.repo.name,
          updatedAt,
          patterns: technical.structure,
          dependencySignals: technical.deps,
        },
        null,
        2,
      )}\n`,
    );
    knowledgeUpdated.push(technicalKnowledgePath, businessKnowledgePath, patternsKnowledgePath);
  }

  const workspaceTopologyPath = ".bbg/knowledge/workspace/topology.json";
  await writeTextFile(
    join(input.cwd, workspaceTopologyPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        repos: input.fusion.repos.map((repo) => ({
          name: repo.name,
          type: repo.type,
          stack: repo.stack,
          deps: repo.deps,
        })),
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceTopologyPath);

  const workspaceIntegrationMapPath = ".bbg/knowledge/workspace/integration-map.json";
  await writeTextFile(
    join(input.cwd, workspaceIntegrationMapPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        edges: input.fusion.integrationEdges,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceIntegrationMapPath);

  const workspaceBusinessModulesPath = ".bbg/knowledge/workspace/business-modules.json";
  await writeTextFile(
    join(input.cwd, workspaceBusinessModulesPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        repos: input.fusion.businessModules,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceBusinessModulesPath);

  const workspaceCapabilitiesPath = ".bbg/knowledge/workspace/capabilities.json";
  await writeTextFile(
    join(input.cwd, workspaceCapabilitiesPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        source: "analyze",
        capabilities: enrichedModel.capabilities,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceCapabilitiesPath);

  const workspaceAnalysisDimensionsPath = ".bbg/knowledge/workspace/analysis-dimensions.json";
  await writeTextFile(
    join(input.cwd, workspaceAnalysisDimensionsPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        source: "analyze",
        dimensions: enrichedModel.analysisDimensions,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceAnalysisDimensionsPath);

  const workspaceCriticalFlowsPath = ".bbg/knowledge/workspace/critical-flows.json";
  await writeTextFile(
    join(input.cwd, workspaceCriticalFlowsPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        source: "analyze",
        flows: enrichedModel.criticalFlows,
        focus: null,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceCriticalFlowsPath);

  const workspaceContractsPath = ".bbg/knowledge/workspace/contracts.json";
  await writeTextFile(
    join(input.cwd, workspaceContractsPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        source: "analyze",
        contracts: enrichedModel.contractSurfaces,
        contractSurfaces: enrichedModel.contractSurfaces,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceContractsPath);

  const workspaceDomainModelPath = ".bbg/knowledge/workspace/domain-model.json";
  await writeTextFile(
    join(input.cwd, workspaceDomainModelPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        source: "analyze",
        contexts: enrichedModel.domainContexts,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceDomainModelPath);

  const workspaceBusinessContextPath = ".bbg/knowledge/workspace/business-context.json";
  await writeTextFile(
    join(input.cwd, workspaceBusinessContextPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        source: "analyze",
        interviewMode: input.interview?.mode ?? "off",
        assumptionsApplied: input.interview?.assumptionsApplied ?? [],
        businessGoal: input.interview?.context.businessGoal ?? null,
        criticalFlows: input.interview?.context.criticalFlows ?? [],
        systemBoundaries: input.interview?.context.systemBoundaries ?? [],
        failureHotspots: input.interview?.context.failureHotspots ?? [],
        decisionHistory: input.interview?.context.decisionHistory ?? [],
        capabilityCount: enrichedModel.capabilities.length,
        flowCount: enrichedModel.criticalFlows.length,
        confidence: input.interview?.confidenceAfter ?? null,
        unresolvedGaps: input.interview?.unresolvedGaps ?? [],
        socratic: input.interview?.socratic ?? null,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceBusinessContextPath);

  const workspaceConstraintsPath = ".bbg/knowledge/workspace/constraints.json";
  await writeTextFile(
    join(input.cwd, workspaceConstraintsPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        source: "analyze",
        interviewMode: input.interview?.mode ?? "off",
        assumptionsApplied:
          input.interview?.assumptionsApplied?.filter((assumption) => assumption.key === "nonNegotiableConstraints") ??
          [],
        constraints: input.interview?.context.nonNegotiableConstraints ?? [],
        constraintItems: enrichedModel.runtimeConstraints,
        confidence: input.interview?.confidenceAfter?.nonNegotiableConstraints ?? 0,
        unresolvedGaps: input.interview?.unresolvedGaps ?? [],
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceConstraintsPath);

  const workspaceRiskSurfacePath = ".bbg/knowledge/workspace/risk-surface.json";
  await writeTextFile(
    join(input.cwd, workspaceRiskSurfacePath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        source: "analyze",
        risks: enrichedModel.riskSurface,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceRiskSurfacePath);

  const workspaceDecisionsPath = ".bbg/knowledge/workspace/decisions.json";
  await writeTextFile(
    join(input.cwd, workspaceDecisionsPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        source: "analyze",
        decisions: enrichedModel.decisionRecords,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceDecisionsPath);

  const workspaceChangeImpactPath = ".bbg/knowledge/workspace/change-impact.json";
  await writeTextFile(
    join(input.cwd, workspaceChangeImpactPath),
    `${JSON.stringify(
      {
        version: 2,
        runId: input.runId,
        updatedAt,
        source: "analyze",
        entries: enrichedModel.changeImpact,
        impacts: enrichedModel.changeImpact,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceChangeImpactPath);

  const focusedAnalysisPath = ".bbg/knowledge/workspace/focused-analysis.json";
  if (input.focus) {
    await writeTextFile(
      join(input.cwd, focusedAnalysisPath),
      `${JSON.stringify(
        {
          version: 2,
          runId: input.runId,
          updatedAt,
          source: "analyze",
          focus: input.focus,
        },
        null,
        2,
      )}\n`,
    );
    knowledgeUpdated.push(focusedAnalysisPath);
  } else if (await exists(join(input.cwd, focusedAnalysisPath))) {
    await rm(join(input.cwd, focusedAnalysisPath), { force: true });
  }

  const initialKnowledgeItems = buildAnalyzeKnowledgeItemsIndex({
    runId: input.runId,
    model: enrichedModel,
  });
  const validationEvents = parseValidationEvents(
    await readIfExists(join(input.cwd, ".bbg", "knowledge", "workspace", "validation-events.json")),
  );
  const knowledgeItems = applyValidationEventsToKnowledgeItems({
    items: initialKnowledgeItems,
    events: validationEvents,
  });
  const evidenceItems = collectAnalyzeEvidenceItems({
    runId: input.runId,
    technical: input.technical,
    business: input.business,
    fusion: input.fusion,
    interview: input.interview,
    knowledgeItems,
  });
  const lifecycleStates = buildAnalyzeKnowledgeLifecycleStates(knowledgeItems);
  const previousKnowledgeItems = parseKnowledgeItems(
    await readIfExists(join(input.cwd, ".bbg", "knowledge", "workspace", "knowledge-items.json")),
  );
  const runDiff = buildAnalyzeRunDiff({
    currentItems: knowledgeItems,
    previousItems: previousKnowledgeItems,
  });

  const workspaceKnowledgeItemsPath = ".bbg/knowledge/workspace/knowledge-items.json";
  await writeTextFile(
    join(input.cwd, workspaceKnowledgeItemsPath),
    `${JSON.stringify(
      {
        version: 2,
        updatedAt,
        runId: input.runId,
        source: "analyze",
        items: knowledgeItems,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceKnowledgeItemsPath);

  const workspaceEvidenceIndexPath = ".bbg/knowledge/workspace/evidence-index.json";
  await writeTextFile(
    join(input.cwd, workspaceEvidenceIndexPath),
    `${JSON.stringify(
      {
        version: 2,
        updatedAt,
        runId: input.runId,
        source: "analyze",
        evidence: evidenceItems,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceEvidenceIndexPath);

  const workspaceLifecyclePath = ".bbg/knowledge/workspace/lifecycle.json";
  await writeTextFile(
    join(input.cwd, workspaceLifecyclePath),
    `${JSON.stringify(
      {
        version: 2,
        updatedAt,
        runId: input.runId,
        source: "analyze",
        states: lifecycleStates,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceLifecyclePath);

  const workspaceRunDiffPath = ".bbg/knowledge/workspace/run-diff.json";
  await writeTextFile(
    join(input.cwd, workspaceRunDiffPath),
    `${JSON.stringify(
      {
        version: 2,
        updatedAt,
        runId: input.runId,
        previousRunId: previousKnowledgeItems[0]?.runId ?? null,
        source: "analyze",
        summary: runDiff.summary,
        changes: runDiff.changes,
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(workspaceRunDiffPath);

  const snapshotPath = `.bbg/analyze/runs/${input.runId}/knowledge-snapshot.json`;
  await writeTextFile(
    join(input.cwd, snapshotPath),
    `${JSON.stringify(
      {
        version: 1,
        runId: input.runId,
        createdAt: updatedAt,
        scope: input.scope,
        repos: input.repos,
        focusQuery: input.focus?.query ?? null,
        interviewMode: input.interview?.mode ?? "off",
        paths: {
          knowledgeItems: workspaceKnowledgeItemsPath,
          evidenceIndex: workspaceEvidenceIndexPath,
          lifecycle: workspaceLifecyclePath,
          runDiff: workspaceRunDiffPath,
          wikiSummaryPaths: [],
          domainFiles: knowledgeUpdated.filter((pathValue) => pathValue.startsWith(".bbg/knowledge/")),
        },
        counts: {
          knowledgeItems: knowledgeItems.length,
          evidenceItems: evidenceItems.length,
          candidateEligibleItems: knowledgeItems.filter((item) => isAnalyzeCandidateWorthy(item)).length,
        },
        confidenceProfile: {
          high: knowledgeItems.filter((item) => item.confidence >= 0.8).length,
          medium: knowledgeItems.filter((item) => item.confidence >= 0.55 && item.confidence < 0.8).length,
          low: knowledgeItems.filter((item) => item.confidence < 0.55).length,
        },
      },
      null,
      2,
    )}\n`,
  );
  knowledgeUpdated.push(snapshotPath);

  return { knowledgeUpdated, snapshotPath };
}
