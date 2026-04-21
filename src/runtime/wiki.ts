import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import type { DocumentationLanguage } from "../config/documentation-language.js";
import { getAnalyzeDocCopy } from "../analyze/doc-copy.js";
import type { AnalyzeInterviewSummary, AnalyzeKnowledgeModel, WorkspaceFusionResult } from "../analyze/types.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";

const WIKI_INDEX_PATH = "docs/wiki/index.md";
const WIKI_LOG_PATH = "docs/wiki/log.md";
const WORKSPACE_ANALYSIS_SUMMARY_PATH = "docs/wiki/reports/workspace-analysis-summary.md";
const WORKFLOW_STABILITY_SUMMARY_PATH = "docs/wiki/reports/workflow-stability-summary.md";
const REGRESSION_RISK_SUMMARY_PATH = "docs/wiki/reports/regression-risk-summary.md";
const GENERATED_CONCEPTS_START = "<!-- BBG:BEGIN GENERATED CONCEPTS -->";
const GENERATED_CONCEPTS_END = "<!-- BBG:END GENERATED CONCEPTS -->";
const GENERATED_REPORTS_START = "<!-- BBG:BEGIN GENERATED REPORTS -->";
const GENERATED_REPORTS_END = "<!-- BBG:END GENERATED REPORTS -->";

function normalizePath(pathValue: string): string {
  return pathValue.replaceAll("\\", "/");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function topicTokens(topic: string): string[] {
  return topic
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function replaceOrAppendManagedBlock(
  content: string,
  heading: string,
  start: string,
  end: string,
  lines: string[],
): string {
  const block = [start, ...lines, end].join("\n");
  if (content.includes(start) && content.includes(end)) {
    const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
    return content.replace(pattern, block);
  }

  const headingPattern = new RegExp(`(^## ${escapeRegExp(heading)}\\s*$)`, "m");
  const match = content.match(headingPattern);
  if (!match || match.index === undefined) {
    return `${content.trimEnd()}\n\n## ${heading}\n\n${block}\n`;
  }

  const insertAt = match.index + match[0].length;
  return `${content.slice(0, insertAt)}\n\n${block}${content.slice(insertAt)}`;
}

async function ensureWikiScaffold(cwd: string): Promise<void> {
  if (!(await exists(join(cwd, WIKI_INDEX_PATH)))) {
    await writeTextFile(
      join(cwd, WIKI_INDEX_PATH),
      [
        "# Wiki Index",
        "",
        "This file is the canonical wiki entrypoint.",
        "",
        "## Concepts",
        "",
        "## Decisions",
        "",
        "## Reports",
        "",
        "## Processes",
        "",
      ].join("\n"),
    );
  }

  if (!(await exists(join(cwd, WIKI_LOG_PATH)))) {
    await writeTextFile(
      join(cwd, WIKI_LOG_PATH),
      ["# Wiki Log", "", "This append-only log records wiki maintenance activity in chronological order.", ""].join(
        "\n",
      ),
    );
  }
}

async function updateWikiIndex(input: {
  cwd: string;
  generatedConcepts?: Array<{ path: string; title: string; summary: string }>;
  generatedReports?: Array<{ path: string; title: string; summary: string }>;
}): Promise<void> {
  await ensureWikiScaffold(input.cwd);
  let content = await readTextFile(join(input.cwd, WIKI_INDEX_PATH));

  if (input.generatedConcepts) {
    const conceptLines =
      input.generatedConcepts.length > 0
        ? input.generatedConcepts.map(
            (entry) => `- [${entry.title}](./${entry.path.replace("docs/wiki/", "")}) - ${entry.summary}`,
          )
        : ["- (none)"];
    content = replaceOrAppendManagedBlock(
      content,
      "Concepts",
      GENERATED_CONCEPTS_START,
      GENERATED_CONCEPTS_END,
      conceptLines,
    );
  }

  if (input.generatedReports) {
    const reportLines =
      input.generatedReports.length > 0
        ? input.generatedReports.map(
            (entry) => `- [${entry.title}](./${entry.path.replace("docs/wiki/", "")}) - ${entry.summary}`,
          )
        : ["- (none)"];
    content = replaceOrAppendManagedBlock(
      content,
      "Reports",
      GENERATED_REPORTS_START,
      GENERATED_REPORTS_END,
      reportLines,
    );
  }

  await writeTextFile(join(input.cwd, WIKI_INDEX_PATH), content.endsWith("\n") ? content : `${content}\n`);
}

async function collectConceptEntries(cwd: string): Promise<Array<{ path: string; title: string; summary: string }>> {
  const conceptsRoot = join(cwd, "docs", "wiki", "concepts");
  if (!(await exists(conceptsRoot))) {
    return [];
  }

  const files = await readdir(conceptsRoot);
  const entries = files
    .filter((file) => file.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => {
      const stem = basename(file, ".md");
      return {
        path: `docs/wiki/concepts/${file}`,
        title: stem.replaceAll("-", " "),
        summary: stem.startsWith("repo-")
          ? "Repository overview and structure summary."
          : "Durable task and workflow context.",
      };
    });

  return entries;
}

function defaultReportEntries(): Array<{ path: string; title: string; summary: string }> {
  return [
    {
      path: WORKSPACE_ANALYSIS_SUMMARY_PATH,
      title: "Workspace Analysis Summary",
      summary: "Repository topology, integration edges, and business modules.",
    },
    {
      path: WORKFLOW_STABILITY_SUMMARY_PATH,
      title: "Workflow Stability Summary",
      summary: "Latest verification health and runtime bottlenecks.",
    },
    {
      path: REGRESSION_RISK_SUMMARY_PATH,
      title: "Regression Risk Summary",
      summary: "Latest regression signals and follow-up actions.",
    },
  ];
}

async function appendWikiLog(input: {
  cwd: string;
  event: string;
  subject: string;
  updates: string[];
  notes?: string[];
}): Promise<void> {
  await ensureWikiScaffold(input.cwd);
  const date = new Date().toISOString().slice(0, 10);
  const entry = [
    `## [${date}] ${input.event} | ${input.subject}`,
    "",
    ...input.updates.map((update) => `- Updated: ${update}`),
    ...(input.notes ?? []).map((note) => `- ${note}`),
    "",
  ].join("\n");
  const existing = await readTextFile(join(input.cwd, WIKI_LOG_PATH));
  await writeTextFile(join(input.cwd, WIKI_LOG_PATH), `${existing.trimEnd()}\n\n${entry}`);
}

function wikiFrontmatter(input: {
  title: string;
  type: "concept" | "report";
  status?: "draft" | "active";
  sources: string[];
  tags: string[];
  related?: string[];
}): string {
  return [
    "---",
    `title: ${input.title}`,
    `type: ${input.type}`,
    `status: ${input.status ?? "active"}`,
    "sources:",
    ...unique(input.sources).map((source) => `  - ${normalizePath(source)}`),
    `last_updated: ${new Date().toISOString().slice(0, 10)}`,
    "tags:",
    ...input.tags.map((tag) => `  - ${tag}`),
    "related:",
    ...(input.related ?? ["docs/wiki/index.md"]).map((related) => `  - ${normalizePath(related)}`),
    "---",
    "",
  ].join("\n");
}

export async function writeAnalyzeWikiArtifacts(input: {
  cwd: string;
  fusion: WorkspaceFusionResult;
  interview: AnalyzeInterviewSummary | null;
  model: AnalyzeKnowledgeModel;
  focus: string | null;
  documentationLanguage: DocumentationLanguage;
}): Promise<{ wikiPaths: string[] }> {
  const copy = getAnalyzeDocCopy(input.documentationLanguage);
  await ensureWikiScaffold(input.cwd);
  const wikiPaths = [WIKI_INDEX_PATH, WIKI_LOG_PATH];
  const conceptEntries: Array<{ path: string; title: string; summary: string }> = [];
  const reportEntries: Array<{ path: string; title: string; summary: string }> = [
    {
      path: WORKSPACE_ANALYSIS_SUMMARY_PATH,
      title: copy.workspaceAnalysisSummary,
      summary: `Summarizes ${input.fusion.repos.length} analyzed repo(s) and current integration edges.`,
    },
  ];

  const workspaceSummaryContent = [
    wikiFrontmatter({
      title: copy.workspaceAnalysisSummary,
      type: "report",
      sources: [
        ".bbg/analyze/latest.json",
        ".bbg/knowledge/workspace/topology.json",
        ".bbg/knowledge/workspace/integration-map.json",
        ".bbg/knowledge/workspace/capabilities.json",
        ".bbg/knowledge/workspace/critical-flows.json",
        ".bbg/knowledge/workspace/business-chains.json",
        ".bbg/knowledge/workspace/contracts.json",
        ".bbg/knowledge/workspace/risk-surface.json",
      ],
      tags: ["analysis", "workspace", "architecture"],
    }),
    `# ${copy.workspaceAnalysisSummary}`,
    "",
    `## ${copy.overview}`,
    "",
    `- ${copy.keyDocs}:`,
    `  - [${copy.capabilityMap}](../../business/capability-map.md)`,
    `  - [${copy.criticalFlowAnalysis}](../../business/critical-flows.md)`,
    `  - [${copy.businessChains}](../../business/business-chains.md)`,
    `  - [${copy.integrationContracts}](../../architecture/integration-contracts.md)`,
    `  - [${copy.riskSurface}](../../architecture/risk-surface.md)`,
    `  - [${copy.changeImpactMap}](../../architecture/change-impact-map.md)`,
    ...(input.focus ? ["  - [Focused Analysis](../../workflows/focused-analysis.md)"] : []),
    "",
    `## ${copy.repositories}`,
    "",
    ...input.fusion.repos.map(
      (repo) => `- ${repo.name}: ${repo.type} (${repo.stack.language} / ${repo.stack.framework})`,
    ),
    "",
    `## ${copy.capabilityMap}`,
    "",
    ...(input.model.capabilities.length > 0
      ? input.model.capabilities.map((capability) => `- ${capability.name}: ${capability.description}`)
      : [`- ${copy.none}`]),
    "",
    `## ${copy.criticalFlowAnalysis}`,
    "",
    ...(input.model.criticalFlows.length > 0
      ? input.model.criticalFlows.map(
          (flow) => `- ${flow.summary} (${flow.participatingRepos.join(", ") || copy.none})`,
        )
      : [`- ${copy.none}`]),
    "",
    `## ${copy.repoEdges}`,
    "",
    ...(input.fusion.integrationEdges.length > 0
      ? input.fusion.integrationEdges.map((edge) => `- ${edge.from} -> ${edge.to}`)
      : [`- ${copy.none}`]),
    "",
    `## ${copy.riskSurface}`,
    "",
    ...(input.model.riskSurface.length > 0
      ? input.model.riskSurface.map((risk) => `- [${risk.severity}] ${risk.title}`)
      : [`- ${copy.none}`]),
    "",
    `## ${copy.changeImpactMap}`,
    "",
    ...(input.model.changeImpact.length > 0
      ? input.model.changeImpact.map((impact) => `- ${impact.target}: ${impact.impactedRepos.join(", ") || copy.none}`)
      : [`- ${copy.none}`]),
    "",
  ].join("\n");
  await writeTextFile(join(input.cwd, WORKSPACE_ANALYSIS_SUMMARY_PATH), workspaceSummaryContent);
  wikiPaths.push(WORKSPACE_ANALYSIS_SUMMARY_PATH);

  for (const repo of input.fusion.repos) {
    const pathValue = `docs/wiki/concepts/repo-${repo.name}-overview.md`;
    const title = `${repo.name} Overview`;
    const content = [
      wikiFrontmatter({
        title,
        type: "concept",
        sources: [
          `.bbg/knowledge/repos/${repo.name}/technical.json`,
          `.bbg/knowledge/repos/${repo.name}/business.json`,
          `docs/repositories/${repo.name}.md`,
        ],
        tags: ["analysis", "repository", repo.type],
      }),
      `# ${title}`,
      "",
      `- ${copy.type}: ${repo.type}`,
      `- ${copy.stack}: ${repo.stack.language} / ${repo.stack.framework}`,
      `- ${copy.directDependencies}: ${repo.deps.length > 0 ? repo.deps.join(", ") : copy.none}`,
      "",
      `## ${copy.structureMarkers}`,
      "",
      ...(repo.structure.length > 0 ? repo.structure.map((marker) => `- ${marker}`) : [`- ${copy.none}`]),
      "",
    ].join("\n");
    await writeTextFile(join(input.cwd, pathValue), content);
    wikiPaths.push(pathValue);
    conceptEntries.push({
      path: pathValue,
      title,
      summary: `${repo.type} repo summary and structural markers.`,
    });
  }

  const projectContextPath = "docs/wiki/concepts/project-context.md";
  const projectContextContent = [
    wikiFrontmatter({
      title: copy.projectContext,
      type: "concept",
      sources: [
        ".bbg/analyze/latest.json",
        ".bbg/analyze/interview/latest.json",
        ".bbg/knowledge/workspace/business-context.json",
        ".bbg/knowledge/workspace/capabilities.json",
        ".bbg/knowledge/workspace/critical-flows.json",
        ".bbg/knowledge/workspace/business-chains.json",
        ".bbg/knowledge/workspace/contracts.json",
        ".bbg/knowledge/workspace/constraints.json",
        ".bbg/knowledge/workspace/risk-surface.json",
        ".bbg/knowledge/workspace/decisions.json",
        ".bbg/knowledge/workspace/change-impact.json",
      ],
      tags: ["analysis", "project", "business-context"],
    }),
    `# ${copy.projectContext}`,
    "",
    `- ${copy.businessGoal}: ${input.interview?.context.businessGoal ?? copy.notConfirmedYet}`,
    `- Interview mode: ${input.interview?.mode ?? "off"}`,
    `- Unresolved gaps: ${input.interview?.unresolvedGaps.join(", ") || copy.none}`,
    "",
    `## ${copy.keyDocs}`,
    "",
    `- [${copy.capabilityMap}](../../business/capability-map.md)`,
    `- [${copy.criticalFlowAnalysis}](../../business/critical-flows.md)`,
    `- [${copy.businessChains}](../../business/business-chains.md)`,
    `- [${copy.domainModel}](../../business/domain-model.md)`,
    `- [${copy.integrationContracts}](../../architecture/integration-contracts.md)`,
    `- [${copy.runtimeConstraints}](../../architecture/runtime-constraints.md)`,
    `- [${copy.riskSurface}](../../architecture/risk-surface.md)`,
    `- [${copy.decisionHistoryDoc}](../../architecture/decision-history.md)`,
    `- [${copy.changeImpactMap}](../../architecture/change-impact-map.md)`,
    "",
    `## ${copy.criticalFlowAnalysis}`,
    "",
    ...(input.model.criticalFlows.length
      ? input.model.criticalFlows.map((flow) => `- ${flow.summary}`)
      : [`- ${copy.notConfirmedYet}`]),
    "",
    `## ${copy.businessChains}`,
    "",
    ...(input.model.businessChains.length
      ? input.model.businessChains.map(
          (chain) => `- ${chain.summary} (${chain.primaryActor ?? copy.none} -> ${chain.businessObject ?? copy.none})`,
        )
      : [`- ${copy.notConfirmedYet}`]),
    "",
    `## ${copy.capabilityMap}`,
    "",
    ...(input.model.capabilities.length
      ? input.model.capabilities.map((capability) => `- ${capability.name}: ${capability.description}`)
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
    ...(input.model.riskSurface.length
      ? input.model.riskSurface.map((risk) => `- [${risk.severity}] ${risk.title}`)
      : [`- ${copy.notConfirmedYet}`]),
    "",
    `## ${copy.decisionHistoryDoc}`,
    "",
    ...(input.model.decisionRecords.length
      ? input.model.decisionRecords.map((decision) => `- [${decision.status}] ${decision.statement}`)
      : [`- ${copy.noneRecordedYet}`]),
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
  await writeTextFile(join(input.cwd, projectContextPath), projectContextContent);
  wikiPaths.push(projectContextPath);
  conceptEntries.push({
    path: projectContextPath,
    title: copy.projectContext,
    summary: "Durable business goals, boundaries, constraints, and hotspots for future task routing.",
  });

  await updateWikiIndex({
    cwd: input.cwd,
    generatedConcepts: conceptEntries,
    generatedReports: reportEntries,
  });
  await appendWikiLog({
    cwd: input.cwd,
    event: "compile",
    subject: "analyze",
    updates: [WORKSPACE_ANALYSIS_SUMMARY_PATH, ...conceptEntries.map((entry) => entry.path)],
    notes: [`Captured ${input.fusion.repos.length} repo overview page(s) from analyze output.`],
  });

  return { wikiPaths };
}

export async function writeTaskWikiArtifact(input: {
  cwd: string;
  taskId: string;
  task: string;
  summary: string;
  commandSpecPath: string;
  references: string[];
  taskEnvId: string | null;
  nextActions: string[];
  hermesSummary: string | null;
}): Promise<{ wikiPath: string }> {
  await ensureWikiScaffold(input.cwd);
  const wikiPath = `docs/wiki/concepts/${input.taskId}.md`;
  const content = [
    wikiFrontmatter({
      title: `${input.taskId} Task Knowledge`,
      type: "concept",
      status: "draft",
      sources: [input.commandSpecPath, ...input.references],
      tags: ["task", "execution", "workflow"],
    }),
    `# ${input.taskId} Task Knowledge`,
    "",
    `- Task: ${input.task}`,
    `- Summary: ${input.summary}`,
    `- Task Environment: ${input.taskEnvId ?? "(none)"}`,
    `- Hermes Summary: ${input.hermesSummary ?? "(none)"}`,
    "",
    "## Next Actions",
    "",
    ...(input.nextActions.length > 0 ? input.nextActions.map((action) => `- ${action}`) : ["- (none)"]),
    "",
  ].join("\n");

  await writeTextFile(join(input.cwd, wikiPath), content);
  await updateWikiIndex({
    cwd: input.cwd,
    generatedConcepts: await collectConceptEntries(input.cwd),
  });
  await appendWikiLog({
    cwd: input.cwd,
    event: "ingest",
    subject: input.taskId,
    updates: [wikiPath],
    notes: ["Generated from `bbg start` as durable task knowledge."],
  });
  return { wikiPath };
}

export async function buildWikiQueryAugmentation(input: {
  cwd: string;
  topic?: string | null;
}): Promise<{ references: string[]; summary: string | null }> {
  await ensureWikiScaffold(input.cwd);
  const indexPath = join(input.cwd, WIKI_INDEX_PATH);
  if (!(await exists(indexPath))) {
    return { references: [], summary: null };
  }

  const topic = input.topic?.trim();
  const baseReferences = [WIKI_INDEX_PATH];
  if (!topic) {
    return {
      references: baseReferences,
      summary: "Canonical wiki index is available as the primary local memory entrypoint.",
    };
  }

  const tokens = topicTokens(topic);
  if (tokens.length === 0) {
    return {
      references: baseReferences,
      summary: "Canonical wiki index is available as the primary local memory entrypoint.",
    };
  }

  const candidates = [WORKSPACE_ANALYSIS_SUMMARY_PATH, WORKFLOW_STABILITY_SUMMARY_PATH, REGRESSION_RISK_SUMMARY_PATH];
  const conceptsRoot = join(input.cwd, "docs", "wiki", "concepts");
  if (await exists(conceptsRoot)) {
    const files = await readdir(conceptsRoot);
    for (const file of files) {
      if (file.endsWith(".md")) {
        candidates.push(`docs/wiki/concepts/${file}`);
      }
    }
  }

  const scored: Array<{ path: string; score: number }> = [];
  for (const relativePath of unique(candidates)) {
    const absolutePath = join(input.cwd, relativePath);
    if (!(await exists(absolutePath))) {
      continue;
    }

    const content = (await readTextFile(absolutePath)).toLowerCase();
    const normalizedPath = relativePath.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (normalizedPath.includes(token)) {
        score += 3;
      }
      if (content.includes(token)) {
        score += 1;
      }
    }

    if (score > 0) {
      scored.push({ path: relativePath, score });
    }
  }

  scored.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
  const matched = scored.slice(0, 3).map((entry) => entry.path);

  return {
    references: unique([...baseReferences, ...matched]),
    summary:
      matched.length > 0
        ? `Canonical wiki references for this task: ${matched.map((pathValue) => basename(pathValue, ".md")).join(", ")}.`
        : "Canonical wiki index is available as the primary local memory entrypoint.",
  };
}

export async function buildAnalyzeKnowledgeQueryAugmentation(input: {
  cwd: string;
  topic?: string | null;
}): Promise<{ references: string[]; summary: string | null }> {
  const topic = input.topic?.trim();
  if (!topic) {
    return { references: [], summary: null };
  }

  const tokens = topicTokens(topic);
  if (tokens.length === 0) {
    return { references: [], summary: null };
  }

  const candidates: Array<{ path: string; dimension: string }> = [
    { path: "docs/business/capability-map.md", dimension: "capabilities" },
    { path: "docs/business/critical-flows.md", dimension: "critical flows" },
    { path: "docs/business/business-chains.md", dimension: "business chains" },
    { path: "docs/architecture/integration-contracts.md", dimension: "contracts" },
    { path: "docs/architecture/risk-surface.md", dimension: "risk surface" },
    { path: "docs/architecture/change-impact-map.md", dimension: "change impact" },
    { path: "docs/architecture/decision-history.md", dimension: "decision history" },
    { path: ".bbg/knowledge/workspace/capabilities.json", dimension: "capabilities" },
    { path: ".bbg/knowledge/workspace/critical-flows.json", dimension: "critical flows" },
    { path: ".bbg/knowledge/workspace/business-chains.json", dimension: "business chains" },
    { path: ".bbg/knowledge/workspace/contracts.json", dimension: "contracts" },
    { path: ".bbg/knowledge/workspace/risk-surface.json", dimension: "risk surface" },
    { path: ".bbg/knowledge/workspace/change-impact.json", dimension: "change impact" },
    { path: ".bbg/knowledge/workspace/decisions.json", dimension: "decision history" },
    { path: ".bbg/knowledge/workspace/knowledge-items.json", dimension: "knowledge items" },
    { path: ".bbg/knowledge/workspace/evidence-index.json", dimension: "evidence" },
    { path: ".bbg/knowledge/workspace/ai-analysis.json", dimension: "ai analysis" },
    { path: ".bbg/knowledge/workspace/reconciliation-report.json", dimension: "reconciliation" },
    { path: ".bbg/knowledge/hermes/analyze-candidates.json", dimension: "hermes candidates" },
  ];

  const scored: Array<{ path: string; score: number; dimension: string }> = [];
  for (const candidate of candidates) {
    const absolutePath = join(input.cwd, candidate.path);
    if (!(await exists(absolutePath))) {
      continue;
    }

    const content = (await readTextFile(absolutePath)).toLowerCase();
    const normalizedPath = candidate.path.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (normalizedPath.includes(token)) {
        score += 4;
      }
      if (content.includes(token)) {
        score += 1;
      }
    }

    if (score > 0) {
      scored.push({ path: candidate.path, score, dimension: candidate.dimension });
    }
  }

  scored.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
  const matched = scored.slice(0, 6);
  if (matched.length === 0) {
    return { references: [], summary: null };
  }

  const dimensions = unique(matched.map((entry) => entry.dimension));
  return {
    references: unique(matched.map((entry) => entry.path)),
    summary: `Analyze knowledge references for this task: ${dimensions.join(", ")}.`,
  };
}

export async function writeVerifyWikiArtifacts(input: {
  cwd: string;
  taskId: string;
  task: string;
  taskStatus: string;
  observationReadiness: "not-required" | "empty" | "partial" | "ready";
  reasons: string[];
  missingEvidence: string[];
  recoveryPlanKind: string | null;
  recoveryActions: string[];
  hermesQueryExecuted: boolean;
}): Promise<{ wikiPaths: string[] }> {
  await ensureWikiScaffold(input.cwd);

  const workflowStability = [
    wikiFrontmatter({
      title: "Workflow Stability Summary",
      type: "report",
      status: "active",
      sources: [".bbg/telemetry/events.json", ".bbg/tasks/index.json", `.bbg/tasks/${input.taskId}/session.json`],
      tags: ["workflow", "verification", "runtime"],
    }),
    "# Workflow Stability Summary",
    "",
    "## Workflow Health",
    "",
    `- Latest task: ${input.taskId}`,
    `- Status: ${input.taskStatus}`,
    `- Observation readiness: ${input.observationReadiness}`,
    `- Hermes consulted: ${input.hermesQueryExecuted ? "yes" : "no"}`,
    "",
    "## Bottlenecks",
    "",
    ...(input.reasons.length > 0 ? input.reasons.map((reason) => `- ${reason}`) : ["- (none)"]),
    "",
    "## Recommended Improvements",
    "",
    ...(input.recoveryActions.length > 0 ? input.recoveryActions.map((action) => `- ${action}`) : ["- (none)"]),
    "",
  ].join("\n");

  const regressionRisk = [
    wikiFrontmatter({
      title: "Regression Risk Summary",
      type: "report",
      status: input.taskStatus === "completed" ? "active" : "draft",
      sources: ["evals/reports/history.json", `.bbg/tasks/${input.taskId}/session.json`],
      tags: ["evaluation", "regression", "verification"],
    }),
    "# Regression Risk Summary",
    "",
    "## Current Signals",
    "",
    `- Latest task: ${input.taskId}`,
    `- Task: ${input.task}`,
    `- Status: ${input.taskStatus}`,
    `- Recovery plan: ${input.recoveryPlanKind ?? "(none)"}`,
    "",
    "## Regressions To Watch",
    "",
    ...(input.missingEvidence.length > 0 ? input.missingEvidence.map((item) => `- ${item}`) : ["- (none)"]),
    "",
    "## Follow-up Actions",
    "",
    ...(input.recoveryActions.length > 0 ? input.recoveryActions.map((action) => `- ${action}`) : ["- (none)"]),
    "",
  ].join("\n");

  await writeTextFile(join(input.cwd, WORKFLOW_STABILITY_SUMMARY_PATH), workflowStability);
  await writeTextFile(join(input.cwd, REGRESSION_RISK_SUMMARY_PATH), regressionRisk);
  await updateWikiIndex({
    cwd: input.cwd,
    generatedReports: defaultReportEntries(),
  });
  await appendWikiLog({
    cwd: input.cwd,
    event: "refresh",
    subject: input.taskId,
    updates: [WORKFLOW_STABILITY_SUMMARY_PATH, REGRESSION_RISK_SUMMARY_PATH],
    notes: [`Verification updated wiki reports for task status ${input.taskStatus}.`],
  });

  return {
    wikiPaths: [WORKFLOW_STABILITY_SUMMARY_PATH, REGRESSION_RISK_SUMMARY_PATH, WIKI_LOG_PATH],
  };
}

export async function readWikiDoctorArtifacts(input: {
  cwd: string;
  repos: string[];
  hasAnalyzeState: boolean;
}): Promise<{ missingCanonical: string[]; missingGenerated: string[] }> {
  const canonical = [WIKI_INDEX_PATH, WIKI_LOG_PATH, WORKFLOW_STABILITY_SUMMARY_PATH, REGRESSION_RISK_SUMMARY_PATH];
  const generated = input.hasAnalyzeState
    ? [
        WORKSPACE_ANALYSIS_SUMMARY_PATH,
        "docs/wiki/concepts/project-context.md",
        ...input.repos.map((repo) => `docs/wiki/concepts/repo-${repo}-overview.md`),
      ]
    : [WORKSPACE_ANALYSIS_SUMMARY_PATH];

  const missingCanonical = (
    await Promise.all(
      canonical.map(async (pathValue) => ((await exists(join(input.cwd, pathValue))) ? null : pathValue)),
    )
  ).filter((pathValue): pathValue is string => pathValue !== null);
  const missingGenerated = (
    await Promise.all(
      generated.map(async (pathValue) => ((await exists(join(input.cwd, pathValue))) ? null : pathValue)),
    )
  ).filter((pathValue): pathValue is string => pathValue !== null);

  return { missingCanonical, missingGenerated };
}
