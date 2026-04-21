import { createHash } from "node:crypto";
import type {
  AnalyzeBusinessDimension,
  AnalyzeCapability,
  AnalyzeChangeImpactEntry,
  AnalyzeContractSurface,
  AnalyzeCriticalFlow,
  AnalyzeDecisionRecord,
  AnalyzeDomainContext,
  AnalyzeKnowledgeItem,
  AnalyzeKnowledgeModel,
  AnalyzeKnowledgeProvenance,
  AnalyzeKnowledgeStatus,
  AnalyzeRiskItem,
  AnalyzeRuntimeConstraint,
} from "./types.js";

type KnowledgeKind = AnalyzeKnowledgeItem["kind"];

const KNOWLEDGE_STATUSES: AnalyzeKnowledgeStatus[] = [
  "observed",
  "inferred",
  "candidate",
  "confirmed-local",
  "promoted-local",
  "eligible-global",
  "promoted-global",
  "stale",
  "superseded",
];

function normalizeSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "item";
}

function shortHash(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 6);
}

export function createAnalyzeKnowledgeItemId(input: {
  kind: KnowledgeKind;
  scope: "workspace" | "repo";
  repo: string | null;
  title: string;
  anchors: string[];
}): string {
  const slug = normalizeSlug(input.title);
  const anchorBase = input.anchors
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)
    .sort()
    .join("|");
  const hash = shortHash(`${input.kind}|${input.scope}|${input.repo ?? "workspace"}|${slug}|${anchorBase}`);
  const scopeToken = input.repo ? normalizeSlug(input.repo) : input.scope;
  return `ak:${input.kind}:${scopeToken}:${slug}:${hash}`;
}

function defaultStatusForConfidence(confidence: number): AnalyzeKnowledgeStatus {
  if (confidence >= 0.85) {
    return "observed";
  }
  if (confidence >= 0.6) {
    return "inferred";
  }
  return "candidate";
}

function defaultProvenance(kind: KnowledgeKind): AnalyzeKnowledgeProvenance[] {
  const source = kind === "runtime-constraint" || kind === "decision-record" ? "interview-answer" : "business-signal";
  return [
    {
      source,
      ref: `analyze:${kind}`,
      description: "Derived from Analyze 2.0 heuristics and repository signals.",
      confidenceImpact: 0.12,
      codeRefs: [],
    },
  ];
}

function toKnowledgeStatus(value: string | undefined): AnalyzeKnowledgeStatus | null {
  if (!value) {
    return null;
  }
  return KNOWLEDGE_STATUSES.includes(value as AnalyzeKnowledgeStatus) ? (value as AnalyzeKnowledgeStatus) : null;
}

function ensureMetadata<
  T extends {
    id?: string;
    confidence: number;
    status?: AnalyzeKnowledgeStatus;
    lifecycleStatus?: AnalyzeKnowledgeStatus;
    provenance?: AnalyzeKnowledgeProvenance[];
    relatedIds?: string[];
  },
>(
  item: T,
  input: {
    kind: KnowledgeKind;
    scope: "workspace" | "repo";
    repo: string | null;
    title: string;
    anchors: string[];
  },
): T {
  return {
    ...item,
    id: item.id ?? createAnalyzeKnowledgeItemId(input),
    status: item.status ?? item.lifecycleStatus ?? defaultStatusForConfidence(item.confidence),
    provenance: item.provenance && item.provenance.length > 0 ? item.provenance : defaultProvenance(input.kind),
    relatedIds: item.relatedIds ?? [],
  };
}

function enrichCapabilities(capabilities: AnalyzeCapability[]): AnalyzeCapability[] {
  return capabilities.map((capability) =>
    ensureMetadata(capability, {
      kind: "capability",
      scope: "workspace",
      repo: capability.owningRepos[0] ?? null,
      title: capability.name,
      anchors: [capability.name, ...capability.owningRepos],
    }),
  );
}

function enrichCriticalFlows(flows: AnalyzeCriticalFlow[]): AnalyzeCriticalFlow[] {
  return flows.map((flow) =>
    ensureMetadata(flow, {
      kind: "critical-flow",
      scope: "workspace",
      repo: flow.participatingRepos[0] ?? null,
      title: flow.name,
      anchors: [flow.name, ...flow.participatingRepos, ...flow.contracts],
    }),
  );
}

function enrichContracts(contracts: AnalyzeContractSurface[]): AnalyzeContractSurface[] {
  return contracts.map((contract) =>
    ensureMetadata(contract, {
      kind: "contract-surface",
      scope: "workspace",
      repo: contract.owners[0] ?? null,
      title: contract.name,
      anchors: [contract.name, contract.type, ...contract.owners, ...contract.consumers],
    }),
  );
}

function enrichDomainContexts(contexts: AnalyzeDomainContext[]): AnalyzeDomainContext[] {
  return contexts.map((context) =>
    ensureMetadata(context, {
      kind: "domain-context",
      scope: "workspace",
      repo: context.ownerRepo,
      title: context.name,
      anchors: [context.name, context.ownerRepo, ...context.coreConcepts],
    }),
  );
}

function enrichRuntimeConstraints(constraints: AnalyzeRuntimeConstraint[]): AnalyzeRuntimeConstraint[] {
  return constraints.map((constraint) =>
    ensureMetadata(constraint, {
      kind: "runtime-constraint",
      scope: "workspace",
      repo: null,
      title: constraint.statement,
      anchors: [constraint.statement, constraint.category],
    }),
  );
}

function enrichRisks(risks: AnalyzeRiskItem[]): AnalyzeRiskItem[] {
  return risks.map((risk) =>
    ensureMetadata(risk, {
      kind: "risk-item",
      scope: "workspace",
      repo: risk.affectedRepos[0] ?? null,
      title: risk.title,
      anchors: [risk.title, ...risk.affectedRepos],
    }),
  );
}

function enrichDecisions(decisions: AnalyzeDecisionRecord[]): AnalyzeDecisionRecord[] {
  return decisions.map((decision) => ({
    ...decision,
    id:
      decision.id ??
      createAnalyzeKnowledgeItemId({
        kind: "decision-record",
        scope: "workspace",
        repo: null,
        title: decision.statement,
        anchors: [decision.statement, decision.status],
      }),
    lifecycleStatus: decision.lifecycleStatus ?? defaultStatusForConfidence(decision.confidence),
    provenance:
      decision.provenance && decision.provenance.length > 0
        ? decision.provenance
        : defaultProvenance("decision-record"),
    relatedIds: decision.relatedIds ?? [],
  }));
}

function enrichChangeImpact(entries: AnalyzeChangeImpactEntry[]): AnalyzeChangeImpactEntry[] {
  return entries.map((entry) =>
    ensureMetadata(entry, {
      kind: "change-impact",
      scope: "workspace",
      repo: entry.impactedRepos[0] ?? null,
      title: entry.target,
      anchors: [entry.target, ...entry.impactedRepos, ...entry.impactedContracts],
    }),
  );
}

function enrichDimensions(dimensions: AnalyzeBusinessDimension[]): AnalyzeBusinessDimension[] {
  return dimensions.map((dimension) =>
    ensureMetadata(dimension, {
      kind: "analysis-dimension",
      scope: "workspace",
      repo: dimension.supportingRepos[0] ?? null,
      title: dimension.name,
      anchors: [dimension.name, ...dimension.supportingRepos],
    }),
  );
}

export function enrichAnalyzeKnowledgeModel(model: AnalyzeKnowledgeModel): AnalyzeKnowledgeModel {
  return {
    ...model,
    capabilities: enrichCapabilities(model.capabilities),
    criticalFlows: enrichCriticalFlows(model.criticalFlows),
    contractSurfaces: enrichContracts(model.contractSurfaces),
    domainContexts: enrichDomainContexts(model.domainContexts),
    runtimeConstraints: enrichRuntimeConstraints(model.runtimeConstraints),
    riskSurface: enrichRisks(model.riskSurface),
    decisionRecords: enrichDecisions(model.decisionRecords),
    changeImpact: enrichChangeImpact(model.changeImpact),
    analysisDimensions: enrichDimensions(model.analysisDimensions),
  };
}

function buildKnowledgeItem(input: {
  item: {
    id?: string;
    confidence: number;
    status?: string;
    lifecycleStatus?: AnalyzeKnowledgeStatus;
    provenance?: AnalyzeKnowledgeProvenance[];
    relatedIds?: string[];
  };
  runId: string;
  kind: KnowledgeKind;
  title: string;
  summary: string;
  repo: string | null;
  payloadPath: string;
  payloadPointer: string;
  tags: string[];
}): AnalyzeKnowledgeItem {
  const id =
    input.item.id ??
    createAnalyzeKnowledgeItemId({
      kind: input.kind,
      scope: "workspace",
      repo: input.repo,
      title: input.title,
      anchors: [input.title, ...input.tags],
    });
  const derivedStatus =
    toKnowledgeStatus(input.item.status) ??
    input.item.lifecycleStatus ??
    defaultStatusForConfidence(input.item.confidence);
  return {
    id,
    runId: input.runId,
    scope: "workspace",
    repo: input.repo,
    kind: input.kind,
    title: input.title,
    summary: input.summary,
    payloadPath: input.payloadPath,
    payloadPointer: input.payloadPointer,
    confidence: input.item.confidence,
    status: derivedStatus,
    tags: input.tags,
    relatedIds: input.item.relatedIds ?? [],
    provenance:
      input.item.provenance && input.item.provenance.length > 0 ? input.item.provenance : defaultProvenance(input.kind),
    freshness: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastValidatedAt: null,
      lastSourceChangeAt: null,
      freshnessStatus: "fresh",
    },
    history: {
      firstSeenRunId: input.runId,
      lastSeenRunId: input.runId,
      changeKind: "new",
      supersedes: [],
      supersededBy: null,
    },
  };
}

export function buildAnalyzeKnowledgeItemsIndex(input: {
  runId: string;
  model: AnalyzeKnowledgeModel;
}): AnalyzeKnowledgeItem[] {
  const items: AnalyzeKnowledgeItem[] = [];

  for (const [index, capability] of input.model.capabilities.entries()) {
    items.push(
      buildKnowledgeItem({
        item: capability,
        runId: input.runId,
        kind: "capability",
        title: capability.name,
        summary: capability.description,
        repo: capability.owningRepos[0] ?? null,
        payloadPath: ".bbg/knowledge/workspace/capabilities.json",
        payloadPointer: `/capabilities/${index}`,
        tags: ["capability", ...capability.owningRepos],
      }),
    );
  }
  for (const [index, flow] of input.model.criticalFlows.entries()) {
    items.push(
      buildKnowledgeItem({
        item: flow,
        runId: input.runId,
        kind: "critical-flow",
        title: flow.name,
        summary: flow.summary,
        repo: flow.participatingRepos[0] ?? null,
        payloadPath: ".bbg/knowledge/workspace/critical-flows.json",
        payloadPointer: `/flows/${index}`,
        tags: ["flow", ...flow.participatingRepos],
      }),
    );
  }
  for (const [index, contract] of input.model.contractSurfaces.entries()) {
    items.push(
      buildKnowledgeItem({
        item: contract,
        runId: input.runId,
        kind: "contract-surface",
        title: contract.name,
        summary: contract.boundary,
        repo: contract.owners[0] ?? null,
        payloadPath: ".bbg/knowledge/workspace/contracts.json",
        payloadPointer: `/contracts/${index}`,
        tags: ["contract", contract.type, ...contract.owners],
      }),
    );
  }
  for (const [index, context] of input.model.domainContexts.entries()) {
    items.push(
      buildKnowledgeItem({
        item: context,
        runId: input.runId,
        kind: "domain-context",
        title: context.name,
        summary: context.summary,
        repo: context.ownerRepo,
        payloadPath: ".bbg/knowledge/workspace/domain-model.json",
        payloadPointer: `/contexts/${index}`,
        tags: ["domain", context.ownerRepo],
      }),
    );
  }
  for (const [index, constraint] of input.model.runtimeConstraints.entries()) {
    items.push(
      buildKnowledgeItem({
        item: constraint,
        runId: input.runId,
        kind: "runtime-constraint",
        title: constraint.statement,
        summary: constraint.statement,
        repo: null,
        payloadPath: ".bbg/knowledge/workspace/constraints.json",
        payloadPointer: `/constraints/${index}`,
        tags: ["constraint", constraint.category],
      }),
    );
  }
  for (const [index, risk] of input.model.riskSurface.entries()) {
    items.push(
      buildKnowledgeItem({
        item: risk,
        runId: input.runId,
        kind: "risk-item",
        title: risk.title,
        summary: risk.reasons.join("; "),
        repo: risk.affectedRepos[0] ?? null,
        payloadPath: ".bbg/knowledge/workspace/risk-surface.json",
        payloadPointer: `/risks/${index}`,
        tags: ["risk", ...risk.affectedRepos],
      }),
    );
  }
  for (const [index, decision] of input.model.decisionRecords.entries()) {
    items.push(
      buildKnowledgeItem({
        item: decision,
        runId: input.runId,
        kind: "decision-record",
        title: decision.statement,
        summary: decision.rationale,
        repo: null,
        payloadPath: ".bbg/knowledge/workspace/decisions.json",
        payloadPointer: `/decisions/${index}`,
        tags: ["decision", decision.status],
      }),
    );
  }
  for (const [index, impact] of input.model.changeImpact.entries()) {
    items.push(
      buildKnowledgeItem({
        item: impact,
        runId: input.runId,
        kind: "change-impact",
        title: impact.target,
        summary: impact.evidence.summary,
        repo: impact.impactedRepos[0] ?? null,
        payloadPath: ".bbg/knowledge/workspace/change-impact.json",
        payloadPointer: `/impacts/${index}`,
        tags: ["impact", ...impact.impactedRepos],
      }),
    );
  }
  for (const [index, dimension] of input.model.analysisDimensions.entries()) {
    items.push(
      buildKnowledgeItem({
        item: dimension,
        runId: input.runId,
        kind: "analysis-dimension",
        title: dimension.name,
        summary: dimension.description,
        repo: dimension.supportingRepos[0] ?? null,
        payloadPath: ".bbg/knowledge/workspace/analysis-dimensions.json",
        payloadPointer: `/dimensions/${index}`,
        tags: ["dimension", ...dimension.supportingRepos],
      }),
    );
  }

  return items;
}

export function isAnalyzeCandidateWorthy(item: AnalyzeKnowledgeItem): boolean {
  if (item.confidence < 0.45) {
    return false;
  }

  return [
    "critical-flow",
    "contract-surface",
    "domain-context",
    "runtime-constraint",
    "risk-item",
    "analysis-dimension",
  ].includes(item.kind);
}
