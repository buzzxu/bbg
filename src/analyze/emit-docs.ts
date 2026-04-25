import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { DocumentationLanguage } from "../config/documentation-language.js";
import { getAnalyzeDocCopy } from "./doc-copy.js";
import type {
  AnalyzeDocArtifacts,
  AnalyzeFocusSummary,
  AnalyzeKnowledgeModel,
  AnalyzeInterviewSummary,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  WorkspaceFusionResult,
} from "./types.js";
import { writeLanguageGuideDocs } from "./language-docs.js";
import { exists, writeTextFile } from "../utils/fs.js";

function toBulletList(values: string[], emptyLabel = "(none)"): string {
  if (values.length === 0) {
    return `- ${emptyLabel}`;
  }
  return values.map((value) => `- ${value}`).join("\n");
}

function toLinkedList(values: Array<{ label: string; path: string }>): string {
  return values.map((value) => `- [${value.label}](${value.path})`).join("\n");
}

function mermaidNodeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "node";
}

function toMermaidFlow(flow: AnalyzeKnowledgeModel["criticalFlows"][number]): string {
  const repos = [...new Set(flow.steps.map((step) => step.repo))];
  const lines = ["```mermaid", "flowchart LR"];
  for (const repo of repos) {
    lines.push(`  ${mermaidNodeId(repo)}["${repo}"]`);
  }
  for (let index = 0; index < repos.length - 1; index += 1) {
    lines.push(`  ${mermaidNodeId(repos[index])} --> ${mermaidNodeId(repos[index + 1])}`);
  }
  if (repos.length === 1) {
    lines.push(`  ${mermaidNodeId(repos[0])}`);
  }
  lines.push("```");
  return lines.join("\n");
}

export async function writeAnalyzeDocs(input: {
  cwd: string;
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
  interview: AnalyzeInterviewSummary | null;
  model: AnalyzeKnowledgeModel;
  focus: AnalyzeFocusSummary | null;
  documentationLanguage: DocumentationLanguage;
}): Promise<AnalyzeDocArtifacts> {
  const copy = getAnalyzeDocCopy(input.documentationLanguage);
  const updatedAt = new Date().toISOString();
  const technicalArchitecturePath = "docs/architecture/technical-architecture.md";
  const businessArchitecturePath = "docs/architecture/business-architecture.md";
  const dependencyGraphPath = "docs/architecture/repo-dependency-graph.md";
  const analysisDimensionsPath = "docs/business/analysis-dimensions.md";
  const capabilityMapPath = "docs/business/capability-map.md";
  const criticalFlowsPath = "docs/business/critical-flows.md";
  const integrationContractsPath = "docs/architecture/integration-contracts.md";
  const runtimeConstraintsPath = "docs/architecture/runtime-constraints.md";
  const riskSurfacePath = "docs/architecture/risk-surface.md";
  const decisionHistoryPath = "docs/architecture/decision-history.md";
  const changeImpactMapPath = "docs/architecture/change-impact-map.md";
  const workspaceTopologyPath = "docs/architecture/workspace-topology.md";
  const integrationMapPath = "docs/architecture/integration-map.md";
  const moduleMapPath = "docs/business/module-map.md";
  const coreFlowsPath = "docs/business/core-flows.md";
  const businessChainsPath = "docs/business/business-chains.md";
  const projectContextPath = "docs/business/project-context.md";
  const domainModelPath = "docs/business/domain-model.md";
  const focusedAnalysisPath = "docs/workflows/focused-analysis.md";
  const repoDocs: string[] = [];
  const repositoryDocs: string[] = [];
  const docsUpdated: string[] = [
    technicalArchitecturePath,
    businessArchitecturePath,
    dependencyGraphPath,
    analysisDimensionsPath,
    capabilityMapPath,
    criticalFlowsPath,
    integrationContractsPath,
    runtimeConstraintsPath,
    riskSurfacePath,
    decisionHistoryPath,
    changeImpactMapPath,
    workspaceTopologyPath,
    integrationMapPath,
    moduleMapPath,
    coreFlowsPath,
    businessChainsPath,
    projectContextPath,
    domainModelPath,
  ];

  const technicalContent = [
    `# ${copy.technicalArchitecture}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    `## ${copy.repositories}`,
    "",
    ...input.fusion.repos.map((repo) =>
      [
        `### ${repo.name}`,
        "",
        `- ${copy.type}: ${repo.type}`,
        `- ${copy.stack}: ${repo.stack.language} / ${repo.stack.framework}`,
        `- ${copy.languageVersion}: ${repo.stack.languageVersion ?? "unknown"}`,
        `- ${copy.frameworkVersion}: ${repo.stack.frameworkVersion ?? "unknown"}`,
        `- ${copy.build}: ${repo.stack.buildTool}`,
        `- ${copy.test}: ${repo.testing.framework}`,
        "",
      ].join("\n"),
    ),
    `## ${copy.overview}`,
    "",
    ...(input.model.technicalArchitectureNarrative.length > 0
      ? input.model.technicalArchitectureNarrative.map((entry) => `- ${entry}`)
      : [`- ${copy.none}`]),
  ].join("\n");

  const businessContent = [
    `# ${copy.businessArchitecture}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    `## ${copy.businessGoal}`,
    "",
    `- ${input.interview?.context.businessGoal ?? copy.inferredGoalNotConfirmedYet}`,
    "",
    `## ${copy.moduleResponsibilities}`,
    "",
    ...input.fusion.businessModules.map((module) =>
      [
        `### ${module.name}`,
        "",
        `- ${copy.description}: ${module.description || copy.notProvided}`,
        `- ${copy.ownershipHint}: ${module.type}`,
        ...module.responsibilities.map((responsibility) => `- ${copy.responsibility}: ${responsibility}`),
        "",
      ].join("\n"),
    ),
    `## ${copy.overview}`,
    "",
    ...(input.model.businessArchitectureNarrative.length > 0
      ? input.model.businessArchitectureNarrative.map((entry) => `- ${entry}`)
      : [`- ${copy.none}`]),
  ].join("\n");

  const dependencyContent = [
    `# ${copy.repoDependencyGraph}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    `## ${copy.dependencies}`,
    "",
    toBulletList(
      input.fusion.integrationEdges.map((edge) => `${edge.from} -> ${edge.to}`),
      copy.none,
    ),
    "",
  ].join("\n");

  const capabilityMapContent = [
    `# ${copy.capabilityMap}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    ...input.model.capabilities.map((capability) =>
      [
        `## ${capability.name}`,
        "",
        `- ${copy.description}: ${capability.description}`,
        `- ${copy.repositories}: ${capability.owningRepos.join(", ")}`,
        `- ${copy.confidence}: ${capability.confidence}`,
        "",
        `### ${copy.moduleResponsibilities}`,
        "",
        ...capability.responsibilities.map((responsibility) => `- ${responsibility}`),
        "",
        `### ${copy.evidence}`,
        "",
        `- ${capability.evidence.summary}`,
        ...(capability.evidence.signals.length > 0
          ? [`- ${copy.evidenceSignals}: ${capability.evidence.signals.join(", ")}`]
          : []),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const analysisDimensionsContent = [
    `# ${copy.analysisDimensions}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    ...input.model.analysisDimensions.map((dimension) =>
      [
        `## ${dimension.name}`,
        "",
        `- ${copy.dimensionDescription}: ${dimension.description}`,
        `- ${copy.repositories}: ${dimension.supportingRepos.join(", ") || copy.none}`,
        `- ${copy.category}: ${dimension.category ?? copy.none}`,
        `- ${copy.recommendedPriority}: ${dimension.recommendedPriority ?? copy.none}`,
        `- ${copy.confidence}: ${dimension.confidence}`,
        "",
        `### ${copy.businessObjects}`,
        "",
        ...(dimension.businessObjects?.length
          ? dimension.businessObjects.map((entry) => `- ${entry}`)
          : [`- ${copy.none}`]),
        "",
        `### ${copy.rationale}`,
        "",
        `- ${dimension.rationale}`,
        "",
        `### ${copy.keyQuestions}`,
        "",
        ...(dimension.keyQuestions?.length ? dimension.keyQuestions.map((entry) => `- ${entry}`) : [`- ${copy.none}`]),
        "",
        `### ${copy.evidence}`,
        "",
        `- ${dimension.evidence.summary}`,
        ...(dimension.evidence.signals.length > 0
          ? [`- ${copy.evidenceSignals}: ${dimension.evidence.signals.join(", ")}`]
          : []),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const criticalFlowsContent = [
    `# ${copy.criticalFlowAnalysis}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    ...input.model.criticalFlows.map((flow) =>
      [
        `## ${flow.summary}`,
        "",
        `- ${copy.confidence}: ${flow.confidence}`,
        `- ${copy.primaryActor}: ${flow.primaryActor ?? copy.none}`,
        `- ${copy.businessObject}: ${flow.businessObject ?? copy.none}`,
        `- ${copy.trigger}: ${flow.trigger ?? copy.none}`,
        `- ${copy.goal}: ${flow.goal ?? flow.summary}`,
        `- ${copy.participatingRepos}: ${flow.participatingRepos.join(", ") || copy.none}`,
        `- ${copy.participatingModules}: ${flow.participatingModules.join(", ") || copy.none}`,
        `- ${copy.contracts}: ${flow.contracts.join(", ") || copy.none}`,
        "",
        `### ${copy.preconditions}`,
        "",
        ...(flow.preconditions?.length ? flow.preconditions.map((entry) => `- ${entry}`) : [`- ${copy.none}`]),
        "",
        `### ${copy.likelyFlowSequence}`,
        "",
        ...flow.steps.map((step) => `1. ${step.repo}: ${step.action} (${step.boundary})`),
        "",
        `### ${copy.stateTransitions}`,
        "",
        ...(flow.stateTransitions?.length
          ? flow.stateTransitions.map(
              (entry) => `- ${entry.businessObject}: ${entry.fromState} -> ${entry.toState} (${entry.trigger})`,
            )
          : [`- ${copy.none}`]),
        "",
        "### Mermaid",
        "",
        toMermaidFlow(flow),
        "",
        `### ${copy.failureBranches}`,
        "",
        ...(flow.failureBranches?.length
          ? flow.failureBranches.map((branch) => `- ${branch.title}: ${branch.condition} -> ${branch.impact}`)
          : flow.failurePoints.length > 0
            ? flow.failurePoints.map((point) => `- ${point}`)
            : [`- ${copy.none}`]),
        "",
        `### ${copy.compensations}`,
        "",
        ...(flow.compensations?.length ? flow.compensations.map((entry) => `- ${entry}`) : [`- ${copy.none}`]),
        "",
        `### ${copy.invariants}`,
        "",
        ...(flow.invariants?.length ? flow.invariants.map((entry) => `- ${entry}`) : [`- ${copy.none}`]),
        "",
        `### ${copy.observabilityHints}`,
        "",
        ...(flow.observabilityHints?.length
          ? flow.observabilityHints.map((entry) => `- ${entry}`)
          : [`- ${copy.none}`]),
        "",
        `### ${copy.evidence}`,
        "",
        `- ${flow.evidence.summary}`,
        ...(flow.evidence.signals.length > 0 ? [`- ${copy.evidenceSignals}: ${flow.evidence.signals.join(", ")}`] : []),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const integrationContractsContent = [
    `# ${copy.integrationContracts}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    ...input.model.contractSurfaces.map((contract) =>
      [
        `## ${contract.name}`,
        "",
        `- ${copy.contractType}: ${contract.type}`,
        `- ${copy.owners}: ${contract.owners.join(", ") || copy.none}`,
        `- ${copy.consumers}: ${contract.consumers.join(", ") || copy.none}`,
        `- ${copy.trustBoundary}: ${contract.boundary}`,
        `- ${copy.confidence}: ${contract.confidence}`,
        "",
        `### ${copy.evidence}`,
        "",
        `- ${contract.evidence.summary}`,
        ...(contract.evidence.signals.length > 0
          ? [`- ${copy.evidenceSignals}: ${contract.evidence.signals.join(", ")}`]
          : []),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const runtimeConstraintsContent = [
    `# ${copy.runtimeConstraints}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    ...input.model.runtimeConstraints.map((constraint) =>
      [
        `## ${constraint.statement}`,
        "",
        `- ${copy.category}: ${constraint.category}`,
        `- ${copy.confidence}: ${constraint.confidence}`,
        `- ${copy.evidence}: ${constraint.evidence.summary}`,
        ...(constraint.evidence.signals.length > 0
          ? [`- ${copy.evidenceSignals}: ${constraint.evidence.signals.join(", ")}`]
          : []),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const riskSurfaceContent = [
    `# ${copy.riskSurface}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    ...input.model.riskSurface.map((risk) =>
      [
        `## ${risk.title}`,
        "",
        `- ${copy.severity}: ${risk.severity}`,
        `- ${copy.repositories}: ${risk.affectedRepos.join(", ") || copy.none}`,
        `- ${copy.confidence}: ${risk.confidence}`,
        "",
        `### ${copy.rationale}`,
        "",
        ...risk.reasons.map((reason) => `- ${reason}`),
        "",
        `### ${copy.evidence}`,
        "",
        `- ${risk.evidence.summary}`,
        ...(risk.evidence.signals.length > 0 ? [`- ${copy.evidenceSignals}: ${risk.evidence.signals.join(", ")}`] : []),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const decisionHistoryContent = [
    `# ${copy.decisionHistoryDoc}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    ...input.model.decisionRecords.map((decision) =>
      [
        `## ${decision.statement}`,
        "",
        `- ${copy.status}: ${decision.status}`,
        `- ${copy.confidence}: ${decision.confidence}`,
        `- ${copy.rationale}: ${decision.rationale}`,
        ...(decision.evidence.signals.length > 0
          ? [`- ${copy.evidenceSignals}: ${decision.evidence.signals.join(", ")}`]
          : []),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const changeImpactContent = [
    `# ${copy.changeImpactMap}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    ...input.model.changeImpact.map((impact) =>
      [
        `## ${impact.target}`,
        "",
        `- ${copy.repositories}: ${impact.impactedRepos.join(", ") || copy.none}`,
        `- ${copy.contracts}: ${impact.impactedContracts.join(", ") || copy.none}`,
        `- ${copy.reviewerHints}: ${impact.reviewerHints.join(", ") || copy.none}`,
        `- ${copy.confidence}: ${impact.confidence}`,
        "",
        `### ${copy.test}`,
        "",
        ...(impact.impactedTests.length > 0 ? impact.impactedTests.map((test) => `- ${test}`) : [`- ${copy.none}`]),
        "",
        `### ${copy.evidence}`,
        "",
        `- ${impact.evidence.summary}`,
        ...(impact.evidence.signals.length > 0
          ? [`- ${copy.evidenceSignals}: ${impact.evidence.signals.join(", ")}`]
          : []),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const workspaceTopologyContent = [
    `# ${copy.workspaceTopology}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    `## ${copy.repositories}`,
    "",
    ...input.fusion.repos.map((repo) =>
      [
        `### ${repo.name}`,
        "",
        `- ${copy.type}: ${repo.type}`,
        `- ${copy.stack}: ${repo.stack.language} / ${repo.stack.framework}`,
        `- ${copy.languageVersion}: ${repo.stack.languageVersion ?? "unknown"}`,
        `- ${copy.frameworkVersion}: ${repo.stack.frameworkVersion ?? "unknown"}`,
        `- ${copy.directDependencies}: ${repo.deps.length > 0 ? repo.deps.join(", ") : copy.none}`,
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const integrationMapContent = [
    `# ${copy.integrationMap}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    `## ${copy.repoEdges}`,
    "",
    toBulletList(input.fusion.integrationEdges.map((edge) => `${edge.from} -> ${edge.to}`)),
    "",
  ].join("\n");

  const moduleMapContent = [
    `# ${copy.moduleMap}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    `## ${copy.repositories}`,
    "",
    ...input.fusion.repos.map((repo) =>
      [
        `### ${repo.name}`,
        "",
        `- ${copy.description}: ${repo.description || copy.notProvided}`,
        `- ${copy.structureMarkers}: ${repo.structure.length > 0 ? repo.structure.join(", ") : copy.none}`,
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const coreFlowsContent = [
    `# ${copy.coreFlows}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    `## ${copy.interviewConfirmedFlows}`,
    "",
    ...(input.model.criticalFlows.length
      ? input.model.criticalFlows.map((flow) => `- ${flow.summary}`)
      : [`- ${copy.notConfirmedYet}`]),
    "",
    `## ${copy.currentFlowHypotheses}`,
    "",
    toLinkedList([
      { label: copy.analysisDimensions, path: "analysis-dimensions.md" },
      { label: copy.criticalFlowAnalysis, path: "critical-flows.md" },
      { label: copy.businessChains, path: "business-chains.md" },
      ...input.model.criticalFlows.slice(0, 5).map((flow) => ({ label: flow.summary, path: "critical-flows.md" })),
    ]),
    "",
  ].join("\n");

  const businessChainsContent = [
    `# ${copy.businessChains}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    ...(input.model.businessChains.length > 0
      ? input.model.businessChains.map((chain) =>
          [
            `## ${chain.summary}`,
            "",
            `- ${copy.primaryActor}: ${chain.primaryActor ?? copy.none}`,
            `- ${copy.businessObject}: ${chain.businessObject ?? copy.none}`,
            `- ${copy.trigger}: ${chain.trigger ?? copy.none}`,
            `- ${copy.goal}: ${chain.goal ?? chain.summary}`,
            `- ${copy.contracts}: ${chain.contracts.join(", ") || copy.none}`,
            "",
            `### ${copy.preconditions}`,
            "",
            ...(chain.preconditions?.length ? chain.preconditions.map((entry) => `- ${entry}`) : [`- ${copy.none}`]),
            "",
            `### ${copy.stateTransitions}`,
            "",
            ...(chain.stateTransitions?.length
              ? chain.stateTransitions.map(
                  (entry) => `- ${entry.businessObject}: ${entry.fromState} -> ${entry.toState} (${entry.trigger})`,
                )
              : [`- ${copy.none}`]),
            "",
            `### ${copy.failureBranches}`,
            "",
            ...(chain.failureBranches?.length
              ? chain.failureBranches.map((entry) => `- ${entry.title}: ${entry.condition} -> ${entry.impact}`)
              : [`- ${copy.none}`]),
            "",
            `### ${copy.compensations}`,
            "",
            ...(chain.compensations?.length ? chain.compensations.map((entry) => `- ${entry}`) : [`- ${copy.none}`]),
            "",
            `### ${copy.invariants}`,
            "",
            ...(chain.invariants?.length ? chain.invariants.map((entry) => `- ${entry}`) : [`- ${copy.none}`]),
            "",
          ].join("\n"),
        )
      : [`- ${copy.none}`]),
  ].join("\n");

  const projectContextContent = [
    `# ${copy.projectContext}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    `${copy.overview}: ${copy.projectContextOverview}`,
    "",
    `## ${copy.keyDocs}`,
    "",
    toLinkedList([
      { label: copy.analysisDimensions, path: "analysis-dimensions.md" },
      { label: copy.capabilityMap, path: "capability-map.md" },
      { label: copy.criticalFlowAnalysis, path: "critical-flows.md" },
      { label: copy.businessChains, path: "business-chains.md" },
      { label: copy.domainModel, path: "domain-model.md" },
      { label: copy.integrationContracts, path: "../architecture/integration-contracts.md" },
      { label: copy.runtimeConstraints, path: "../architecture/runtime-constraints.md" },
      { label: copy.riskSurface, path: "../architecture/risk-surface.md" },
      { label: copy.decisionHistoryDoc, path: "../architecture/decision-history.md" },
      { label: copy.changeImpactMap, path: "../architecture/change-impact-map.md" },
    ]),
    "",
    `## ${copy.businessGoal}`,
    "",
    `- ${input.interview?.context.businessGoal ?? copy.notConfirmedYet}`,
    "",
    `## ${copy.systemBoundaries}`,
    "",
    ...(input.interview?.context.systemBoundaries.length
      ? input.interview.context.systemBoundaries.map((boundary) => `- ${boundary}`)
      : [`- ${copy.notConfirmedYet}`]),
    "",
    `## ${copy.nonNegotiableConstraints}`,
    "",
    ...(input.interview?.context.nonNegotiableConstraints.length
      ? input.interview.context.nonNegotiableConstraints.map((constraint) => `- ${constraint}`)
      : [`- ${copy.notConfirmedYet}`]),
    "",
    `## ${copy.failureHotspots}`,
    "",
    ...(input.interview?.context.failureHotspots.length
      ? input.interview.context.failureHotspots.map((hotspot) => `- ${hotspot}`)
      : [`- ${copy.notConfirmedYet}`]),
    "",
    `## ${copy.decisionHistory}`,
    "",
    ...(input.interview?.context.decisionHistory.length
      ? input.interview.context.decisionHistory.map((decision) => `- ${decision}`)
      : [`- ${copy.noneRecordedYet}`]),
    "",
    `## ${copy.businessObjects}`,
    "",
    ...(input.model.keyBusinessObjects.length > 0
      ? input.model.keyBusinessObjects.map((entry) => `- ${entry}`)
      : [`- ${copy.none}`]),
    "",
    `## Unknowns`,
    "",
    ...(input.model.unknowns.length > 0 ? input.model.unknowns.map((entry) => `- ${entry}`) : [`- ${copy.none}`]),
    "",
    `## ${copy.aiInferredAssumptions}`,
    "",
    ...(input.interview?.assumptionsApplied.length
      ? input.interview.assumptionsApplied.flatMap((assumption) => [
          `### ${assumption.key}`,
          "",
          ...assumption.values.map((value) => `- ${value}`),
          `- ${copy.rationale}: ${assumption.rationale}`,
          ...(assumption.evidence.length > 0 ? [`- ${copy.evidence}: ${assumption.evidence.join(", ")}`] : []),
          "",
        ])
      : [`- ${copy.none}`]),
    "",
  ].join("\n");

  const domainModelContent = [
    `# ${copy.domainModel}`,
    "",
    `${copy.updatedAt}: ${updatedAt}`,
    "",
    ...input.model.domainContexts.map((context) =>
      [
        `## ${context.name}`,
        "",
        `- ${copy.repositories}: ${context.ownerRepo}`,
        `- ${copy.description}: ${context.summary}`,
        `- ${copy.confidence}: ${context.confidence}`,
        "",
        `### ${copy.coreConcepts}`,
        "",
        ...(context.coreConcepts.length > 0
          ? context.coreConcepts.map((concept) => `- ${concept}`)
          : [`- ${copy.none}`]),
        "",
        `### ${copy.evidence}`,
        "",
        `- ${context.evidence.summary}`,
        ...(context.evidence.signals.length > 0
          ? [`- ${copy.evidenceSignals}: ${context.evidence.signals.join(", ")}`]
          : []),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  if (input.focus) {
    const focusedContent = [
      `# ${input.focus.query}`,
      "",
      `${copy.updatedAt}: ${updatedAt}`,
      "",
      `## ${copy.repositories}`,
      "",
      ...(input.focus.matchedRepos.length > 0
        ? input.focus.matchedRepos.map((repo) => `- ${repo}`)
        : [`- ${copy.none}`]),
      "",
      "## Intent",
      "",
      `- ${input.focus.intent ?? copy.none}`,
      "",
      `## ${copy.businessObjects}`,
      "",
      ...((input.focus.matchedEntities ?? []).length > 0
        ? (input.focus.matchedEntities ?? []).map((entry) => `- ${entry}`)
        : [`- ${copy.none}`]),
      "",
      `## ${copy.businessChains}`,
      "",
      ...((input.focus.matchedChains ?? []).length > 0
        ? (input.focus.matchedChains ?? []).map((entry) => `- ${entry}`)
        : [`- ${copy.none}`]),
      "",
      `## ${copy.likelyFlowSequence}`,
      "",
      ...(input.focus.likelyEntrypoints.length > 0
        ? input.focus.likelyEntrypoints.map((entry) => `- ${entry}`)
        : [`- ${copy.none}`]),
      "",
      "## Mermaid",
      "",
      [
        "```mermaid",
        "flowchart LR",
        ...input.focus.matchedRepos.map((repo) => `  ${mermaidNodeId(repo)}["${repo}"]`),
        ...input.focus.matchedRepos
          .slice(0, -1)
          .map((repo, index) => `  ${mermaidNodeId(repo)} --> ${mermaidNodeId(input.focus!.matchedRepos[index + 1])}`),
        "```",
      ].join("\n"),
      "",
      `## ${copy.contracts}`,
      "",
      ...(input.focus.matchedContracts.length > 0
        ? input.focus.matchedContracts.map((entry) => `- ${entry}`)
        : [`- ${copy.none}`]),
      "",
      `## ${copy.riskSurface}`,
      "",
      ...(input.focus.riskHotspots.length > 0
        ? input.focus.riskHotspots.map((entry) => `- ${entry}`)
        : [`- ${copy.none}`]),
      "",
      `## ${copy.reviewerHints}`,
      "",
      ...(input.focus.reviewerHints.length > 0
        ? input.focus.reviewerHints.map((entry) => `- ${entry}`)
        : [`- ${copy.none}`]),
      "",
      `## ${copy.rationale}`,
      "",
      ...input.focus.rationale.map((entry) => `- ${entry}`),
      "",
      "## Semantic Expansions",
      "",
      ...((input.focus.semanticExpansions ?? []).length > 0
        ? (input.focus.semanticExpansions ?? []).map((entry) => `- ${entry}`)
        : [`- ${copy.none}`]),
      "",
      "## Follow-up Questions",
      "",
      ...((input.focus.followupQuestions ?? []).length > 0
        ? (input.focus.followupQuestions ?? []).map((entry) => `- ${entry}`)
        : [`- ${copy.none}`]),
      "",
      `## ${copy.evidenceSignals}`,
      "",
      ...(input.focus.matchedSignals.length > 0
        ? input.focus.matchedSignals.map((entry) => `- ${entry}`)
        : [`- ${copy.none}`]),
      "",
    ].join("\n");
    await writeTextFile(join(input.cwd, focusedAnalysisPath), focusedContent);
    docsUpdated.push(focusedAnalysisPath);
  } else if (await exists(join(input.cwd, focusedAnalysisPath))) {
    await rm(join(input.cwd, focusedAnalysisPath), { force: true });
  }

  await writeTextFile(join(input.cwd, technicalArchitecturePath), technicalContent);
  await writeTextFile(join(input.cwd, businessArchitecturePath), businessContent);
  await writeTextFile(join(input.cwd, dependencyGraphPath), dependencyContent);
  await writeTextFile(join(input.cwd, analysisDimensionsPath), analysisDimensionsContent);
  await writeTextFile(join(input.cwd, capabilityMapPath), capabilityMapContent);
  await writeTextFile(join(input.cwd, criticalFlowsPath), criticalFlowsContent);
  await writeTextFile(join(input.cwd, integrationContractsPath), integrationContractsContent);
  await writeTextFile(join(input.cwd, runtimeConstraintsPath), runtimeConstraintsContent);
  await writeTextFile(join(input.cwd, riskSurfacePath), riskSurfaceContent);
  await writeTextFile(join(input.cwd, decisionHistoryPath), decisionHistoryContent);
  await writeTextFile(join(input.cwd, changeImpactMapPath), changeImpactContent);
  await writeTextFile(join(input.cwd, workspaceTopologyPath), workspaceTopologyContent);
  await writeTextFile(join(input.cwd, integrationMapPath), integrationMapContent);
  await writeTextFile(join(input.cwd, moduleMapPath), moduleMapContent);
  await writeTextFile(join(input.cwd, coreFlowsPath), coreFlowsContent);
  await writeTextFile(join(input.cwd, businessChainsPath), businessChainsContent);
  await writeTextFile(join(input.cwd, projectContextPath), projectContextContent);
  await writeTextFile(join(input.cwd, domainModelPath), domainModelContent);

  for (const technical of input.technical) {
    const repoDocPath = `docs/architecture/repos/${technical.repo.name}.md`;
    const repositoryDocPath = `docs/repositories/${technical.repo.name}.md`;
    const repoContent = [
      `# ${technical.repo.name} ${copy.technicalArchitecture}`,
      "",
      `${copy.updatedAt}: ${updatedAt}`,
      "",
      `## ${copy.technicalSummary}`,
      "",
      `- ${copy.stack}: ${technical.stack.language} / ${technical.stack.framework}`,
      `- ${copy.languageVersion}: ${technical.stack.languageVersion ?? "unknown"}`,
      `- ${copy.frameworkVersion}: ${technical.stack.frameworkVersion ?? "unknown"}`,
      `- ${copy.build}: ${technical.stack.buildTool}`,
      `- ${copy.test}: ${technical.testing.framework}`,
      "",
      `## ${copy.structureMarkers}`,
      "",
      toBulletList(technical.structure, copy.none),
      "",
      `## ${copy.dependencyMarkers}`,
      "",
      toBulletList(technical.deps, copy.none),
      "",
    ].join("\n");
    const repositorySummaryContent = [
      `# ${technical.repo.name}`,
      "",
      `${copy.updatedAt}: ${updatedAt}`,
      "",
      `## ${copy.summary}`,
      "",
      `- ${copy.type}: ${technical.repo.type}`,
      `- ${copy.description}: ${technical.repo.description || copy.notProvided}`,
      `- ${copy.stack}: ${technical.stack.language} / ${technical.stack.framework}`,
      `- ${copy.languageVersion}: ${technical.stack.languageVersion ?? "unknown"}`,
      `- ${copy.frameworkVersion}: ${technical.stack.frameworkVersion ?? "unknown"}`,
      "",
      "## Signals",
      "",
      `- ${copy.structureMarkers}: ${technical.structure.length > 0 ? technical.structure.join(", ") : copy.none}`,
      `- ${copy.dependencyMarkers}: ${technical.deps.length > 0 ? technical.deps.join(", ") : copy.none}`,
      "",
    ].join("\n");
    await writeTextFile(join(input.cwd, repoDocPath), repoContent);
    await writeTextFile(join(input.cwd, repositoryDocPath), repositorySummaryContent);
    repoDocs.push(repoDocPath);
    repositoryDocs.push(repositoryDocPath);
    docsUpdated.push(repoDocPath, repositoryDocPath);
  }

  const architectureIndexPath = "docs/architecture/index.md";
  const architectureIndex = [
    `# ${copy.architectureIndex}`,
    "",
    `- [${copy.technicalArchitecture}](technical-architecture.md)`,
    `- [${copy.businessArchitecture}](business-architecture.md)`,
    `- [${copy.repoDependencyGraph}](repo-dependency-graph.md)`,
    `- [${copy.businessChains}](../business/business-chains.md)`,
    `- [${copy.integrationContracts}](integration-contracts.md)`,
    `- [${copy.runtimeConstraints}](runtime-constraints.md)`,
    `- [${copy.riskSurface}](risk-surface.md)`,
    `- [${copy.decisionHistoryDoc}](decision-history.md)`,
    `- [${copy.changeImpactMap}](change-impact-map.md)`,
    `- [${copy.languageGuides}](languages/README.md)`,
    "",
    `## ${copy.repoFiles}`,
    "",
    ...repoDocs.map(
      (docPath) => `- [${docPath.split("/").at(-1) ?? docPath}](repos/${docPath.split("/").at(-1) ?? ""})`,
    ),
    "",
  ].join("\n");
  await writeTextFile(join(input.cwd, architectureIndexPath), architectureIndex);
  docsUpdated.push(architectureIndexPath);

  const languageDocs = await writeLanguageGuideDocs({
    cwd: input.cwd,
    technical: input.technical,
  });
  docsUpdated.push(...languageDocs);

  return {
    technicalArchitecturePath,
    businessArchitecturePath,
    dependencyGraphPath,
    analysisDimensionsPath,
    capabilityMapPath,
    criticalFlowsPath,
    integrationContractsPath,
    runtimeConstraintsPath,
    riskSurfacePath,
    decisionHistoryPath,
    changeImpactMapPath,
    repoDocs,
    repositoryDocs,
    workspaceTopologyPath,
    integrationMapPath,
    moduleMapPath,
    coreFlowsPath,
    businessChainsPath,
    projectContextPath,
    focusedAnalysisPath: input.focus ? focusedAnalysisPath : null,
    docsUpdated,
  };
}
