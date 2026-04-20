import type {
  AnalyzeCapability,
  AnalyzeChangeImpactEntry,
  AnalyzeContractSurface,
  AnalyzeCriticalFlow,
  AnalyzeDecisionRecord,
  AnalyzeDomainContext,
  AnalyzeEvidenceNote,
  AnalyzeFocusSummary,
  AnalyzeInterviewSummary,
  AnalyzeKnowledgeModel,
  AnalyzeRiskItem,
  AnalyzeRuntimeConstraint,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  WorkspaceFusionResult,
} from "./types.js";

function clampConfidence(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function topConcepts(values: string[]): string[] {
  const stopWords = new Set([
    "application",
    "surface",
    "service",
    "services",
    "system",
    "module",
    "modules",
    "build",
    "test",
    "tested",
    "with",
    "repo",
    "backend",
    "frontend",
    "admin",
    "node",
    "spring",
    "react",
    "vue",
    "java",
    "typescript",
    "framework",
    "structure",
    "dependencies",
  ]);
  return unique(values.flatMap((value) => tokenize(value)).filter((token) => !stopWords.has(token))).slice(0, 6);
}

function repoSignals(technical: RepoTechnicalAnalysis, business: RepoBusinessAnalysis | undefined): string[] {
  return unique([
    technical.repo.name,
    technical.repo.description,
    technical.repo.type,
    technical.stack.language,
    technical.stack.framework,
    technical.stack.buildTool,
    technical.testing.framework,
    ...technical.structure,
    ...technical.deps,
    ...(business?.responsibilities ?? []),
    ...(business?.flowHints ?? []),
  ]);
}

function makeEvidence(summary: string, signals: string[]): AnalyzeEvidenceNote {
  return {
    summary,
    signals: unique(signals).slice(0, 8),
  };
}

function inferRepoBoundary(technical: RepoTechnicalAnalysis): string {
  const framework = technical.stack.framework.toLowerCase();
  if (/(react|vue|next|taro)/.test(framework) || technical.repo.type === "frontend") {
    return "client application boundary";
  }
  if (/(spring|express|fastify|fastapi|django|laravel|rails|node)/.test(framework) || technical.repo.type === "backend") {
    return "service and API boundary";
  }
  return "repository ownership boundary";
}

function inferContractTypes(technical: RepoTechnicalAnalysis): AnalyzeContractSurface["type"][] {
  const framework = technical.stack.framework.toLowerCase();
  const combined = [technical.repo.description, ...technical.structure, ...technical.deps].join(" ").toLowerCase();
  const types: AnalyzeContractSurface["type"][] = [];
  if (/(react|vue|next|taro)/.test(framework) || technical.repo.type === "frontend") {
    types.push("ui");
    types.push("shared-schema");
  }
  if (/(spring|express|fastify|fastapi|django|node)/.test(framework) || technical.repo.type === "backend") {
    types.push("http-api");
  }
  if (/(queue|job|worker|schedule|cron|rabbit|kafka|mq)/.test(combined)) {
    types.push("async-job");
  }
  if (/(payment|oauth|auth0|stripe|oss|s3|redis|mysql|postgres|webhook)/.test(combined)) {
    types.push("integration");
  }
  return types.length > 0 ? unique(types) as AnalyzeContractSurface["type"][] : ["shared-schema"];
}

function deriveCapabilities(
  technical: RepoTechnicalAnalysis[],
  business: RepoBusinessAnalysis[],
  fusion: WorkspaceFusionResult,
): AnalyzeCapability[] {
  const businessByRepo = new Map(business.map((entry) => [entry.repoName, entry] as const));
  return fusion.businessModules.map((module) => {
    const technicalMatch = technical.find((entry) => entry.repo.name === module.name);
    const signals = technicalMatch ? repoSignals(technicalMatch, businessByRepo.get(module.name)) : [module.name, module.description];
    return {
      name: module.name,
      description: module.description || module.type,
      owningRepos: [module.name],
      responsibilities: module.responsibilities,
      evidence: makeEvidence(
        "Derived from repository role, inferred responsibilities, and structure/dependency markers.",
        signals,
      ),
      confidence: clampConfidence(0.68 + Math.min(module.responsibilities.length, 3) * 0.07),
    };
  });
}

function deriveContractSurfaces(
  technical: RepoTechnicalAnalysis[],
  business: RepoBusinessAnalysis[],
  fusion: WorkspaceFusionResult,
): AnalyzeContractSurface[] {
  const businessByRepo = new Map(business.map((entry) => [entry.repoName, entry] as const));
  const surfaces: AnalyzeContractSurface[] = [];

  for (const technicalRepo of technical) {
    const signals = repoSignals(technicalRepo, businessByRepo.get(technicalRepo.repo.name));
    for (const type of inferContractTypes(technicalRepo)) {
      const label = {
        ui: "UI interaction and browser boundary",
        "http-api": "HTTP/API contract surface",
        integration: "External integration surface",
        "async-job": "Async job and worker boundary",
        "shared-schema": "Shared schema and data-shape surface",
      }[type];
      surfaces.push({
        name: `${technicalRepo.repo.name} ${label}`,
        type,
        owners: [technicalRepo.repo.name],
        consumers: fusion.integrationEdges.filter((edge) => edge.to === technicalRepo.repo.name).map((edge) => edge.from),
        boundary: inferRepoBoundary(technicalRepo),
        evidence: makeEvidence(
          "Inferred from framework, structure markers, and dependency signals.",
          signals,
        ),
        confidence: clampConfidence(type === "http-api" || type === "ui" ? 0.81 : 0.69),
      });
    }
  }

  for (const edge of fusion.integrationEdges) {
    const source = technical.find((entry) => entry.repo.name === edge.from);
    const target = technical.find((entry) => entry.repo.name === edge.to);
    surfaces.push({
      name: `${edge.from} -> ${edge.to} integration contract`,
      type: "integration",
      owners: [edge.to],
      consumers: [edge.from],
      boundary: "cross-repository integration seam",
      evidence: makeEvidence(
        "Derived from workspace integration edges and repository dependency markers.",
        unique([
          `repo:${edge.from}`,
          `repo:${edge.to}`,
          ...(source ? source.deps.slice(0, 3).map((dep) => `dependency:${edge.from}:${dep}`) : []),
          ...(target ? target.structure.slice(0, 3).map((structure) => `structure:${edge.to}:${structure}`) : []),
        ]),
      ),
      confidence: clampConfidence(0.72),
    });
  }

  return surfaces;
}

function matchReposForFlow(query: string, technical: RepoTechnicalAnalysis[], business: RepoBusinessAnalysis[]): string[] {
  const businessByRepo = new Map(business.map((entry) => [entry.repoName, entry] as const));
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return technical.map((entry) => entry.repo.name);
  }
  return technical
    .map((entry) => {
      const signals = repoSignals(entry, businessByRepo.get(entry.repo.name)).join(" ").toLowerCase();
      const score = tokens.filter((token) => signals.includes(token)).length;
      return { repo: entry.repo.name, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.repo);
}

function deriveCriticalFlows(
  technical: RepoTechnicalAnalysis[],
  business: RepoBusinessAnalysis[],
  fusion: WorkspaceFusionResult,
  interview: AnalyzeInterviewSummary | null,
  focus: AnalyzeFocusSummary | null,
  riskSurface: AnalyzeRiskItem[],
): AnalyzeCriticalFlow[] {
  const candidates = interview?.context.criticalFlows.length
    ? interview.context.criticalFlows
    : unique(business.flatMap((entry) => entry.flowHints).filter((hint) => hint.length > 0)).slice(0, 5);

  const flows = candidates.slice(0, 6).map((flow, index) => {
    const matchedRepos = unique([
      ...(focus && tokenize(flow).some((token) => tokenize(focus.query).includes(token)) ? focus.matchedRepos : []),
      ...matchReposForFlow(flow, technical, business),
    ]);
    const repos = matchedRepos.length > 0 ? matchedRepos : technical.map((entry) => entry.repo.name);
    const steps = repos.map((repo, repoIndex) => {
      const technicalRepo = technical.find((entry) => entry.repo.name === repo);
      const action = technicalRepo
        ? `${repo} handles ${technicalRepo.repo.description || technicalRepo.repo.type} responsibilities for "${flow}".`
        : `${repo} participates in "${flow}".`;
      return {
        order: repoIndex + 1,
        repo,
        action,
        boundary: technicalRepo ? inferRepoBoundary(technicalRepo) : "repository boundary",
        evidence: makeEvidence(
          "Matched flow tokens against repository descriptions, structure markers, and inferred business responsibilities.",
          technicalRepo ? repoSignals(technicalRepo, business.find((entry) => entry.repoName === repo)) : [`repo:${repo}`],
        ),
      };
    });
    return {
      name: `flow-${index + 1}`,
      summary: flow,
      participatingRepos: repos,
      participatingModules: repos,
      contracts: unique(
        fusion.integrationEdges
          .filter((edge) => repos.includes(edge.from) || repos.includes(edge.to))
          .map((edge) => `${edge.from} -> ${edge.to} integration contract`),
      ),
      failurePoints: riskSurface
        .filter((item) => item.affectedRepos.some((repo) => repos.includes(repo)))
        .map((item) => item.title)
        .slice(0, 4),
      steps,
      evidence: makeEvidence(
        "Built from interview-confirmed flows or inferred flow hints, then traced across matching repositories.",
        unique([
          ...repos.map((repo) => `repo:${repo}`),
          ...steps.flatMap((step) => step.evidence.signals),
        ]),
      ),
      confidence: clampConfidence(
        (interview?.context.criticalFlows.includes(flow) ? 0.82 : 0.66) + Math.min(repos.length, 3) * 0.04,
      ),
    };
  });

  return flows;
}

function deriveRuntimeConstraints(interview: AnalyzeInterviewSummary | null): AnalyzeRuntimeConstraint[] {
  const assumptions = interview?.assumptionsApplied.find((entry) => entry.key === "nonNegotiableConstraints");
  const values = unique([
    ...(interview?.context.nonNegotiableConstraints ?? []),
    ...(assumptions?.values ?? []),
  ]);
  return values.map((statement) => {
    const lowered = statement.toLowerCase();
    const category: AnalyzeRuntimeConstraint["category"] = lowered.includes("security")
      || lowered.includes("auth")
      || lowered.includes("tenant")
      ? "security"
      : lowered.includes("compatib")
        ? "compatibility"
        : lowered.includes("release") || lowered.includes("rollout")
          ? "release"
          : lowered.includes("latency") || lowered.includes("performance")
            ? "latency"
            : lowered.includes("transaction") || lowered.includes("consisten")
              ? "consistency"
              : "operational";
    return {
      statement,
      category,
      evidence: makeEvidence(
        assumptions?.rationale ?? "Captured from analyze interview results.",
        assumptions?.evidence ?? [],
      ),
      confidence: clampConfidence(interview?.confidenceAfter.nonNegotiableConstraints ?? 0.68),
    };
  });
}

function deriveRiskSurface(
  technical: RepoTechnicalAnalysis[],
  interview: AnalyzeInterviewSummary | null,
): AnalyzeRiskItem[] {
  const items: AnalyzeRiskItem[] = [];
  const assumption = interview?.assumptionsApplied.find((entry) => entry.key === "failureHotspots");

  for (const hotspot of unique([
    ...(interview?.context.failureHotspots ?? []),
    ...(assumption?.values ?? []),
  ])) {
    const affectedRepos = technical
      .filter((entry) => hotspot.toLowerCase().includes(entry.repo.name.toLowerCase()))
      .map((entry) => entry.repo.name);
    items.push({
      title: hotspot,
      severity: /(auth|payment|tenant|security|checkout)/i.test(hotspot) ? "high" : "medium",
      affectedRepos: affectedRepos.length > 0 ? affectedRepos : technical.slice(0, 1).map((entry) => entry.repo.name),
      reasons: [
        "Flagged by analyze interview as a failure-prone or sensitive area.",
      ],
      evidence: makeEvidence(
        assumption?.rationale ?? "Derived from interview context and technical sensitivity markers.",
        assumption?.evidence ?? [],
      ),
      confidence: clampConfidence(interview?.confidenceAfter.failureHotspots ?? 0.68),
    });
  }

  for (const technicalRepo of technical) {
    if (technicalRepo.testing.hasTestDir) {
      continue;
    }
    items.push({
      title: `${technicalRepo.repo.name}: limited dedicated test coverage`,
      severity: "medium",
      affectedRepos: [technicalRepo.repo.name],
      reasons: ["Repository lacks a dedicated test directory, increasing change risk."],
      evidence: makeEvidence(
        "Derived from testing markers gathered during repository analysis.",
        [`repo:${technicalRepo.repo.name}`, `testing:${technicalRepo.testing.framework}`, "testing:missing-test-dir"],
      ),
      confidence: 0.79,
    });
  }

  return unique(items.map((item) => item.title))
    .map((title) => items.find((item) => item.title === title))
    .filter((item): item is AnalyzeRiskItem => Boolean(item));
}

function deriveDecisionRecords(interview: AnalyzeInterviewSummary | null): AnalyzeDecisionRecord[] {
  const assumption = interview?.assumptionsApplied.find((entry) => entry.key === "decisionHistory");
  const confirmed = (interview?.context.decisionHistory ?? []).map((statement) => ({
    statement,
    status: "confirmed" as const,
    rationale: "Captured directly from analyze interview answers.",
    evidence: makeEvidence("Confirmed by explicit interview answer.", []),
    confidence: clampConfidence(interview?.confidenceAfter.decisionHistory ?? 0.82),
  }));
  const assumed = (assumption?.values ?? []).map((statement) => ({
    statement,
    status: "assumed" as const,
    rationale: assumption.rationale,
    evidence: makeEvidence(assumption.rationale, assumption.evidence),
    confidence: clampConfidence((interview?.confidenceAfter.decisionHistory ?? 0.64) - 0.05),
  }));
  return [...confirmed, ...assumed];
}

function deriveDomainContexts(
  technical: RepoTechnicalAnalysis[],
  business: RepoBusinessAnalysis[],
): AnalyzeDomainContext[] {
  const businessByRepo = new Map(business.map((entry) => [entry.repoName, entry] as const));
  return technical.map((entry) => {
    const businessRepo = businessByRepo.get(entry.repo.name);
    const sourceTexts = [
      entry.repo.description,
      ...(businessRepo?.responsibilities ?? []),
      ...(businessRepo?.flowHints ?? []),
    ];
    return {
      name: entry.repo.name,
      ownerRepo: entry.repo.name,
      summary: entry.repo.description || entry.repo.type,
      coreConcepts: topConcepts(sourceTexts),
      evidence: makeEvidence(
        "Inferred from repository description, responsibilities, and flow hints.",
        repoSignals(entry, businessRepo),
      ),
      confidence: clampConfidence(0.63 + Math.min(sourceTexts.length, 4) * 0.05),
    };
  });
}

function reviewerHint(language: string): string[] {
  const lowered = language.toLowerCase();
  if (lowered === "java") {
    return ["java-reviewer"];
  }
  if (lowered === "typescript" || lowered === "javascript") {
    return ["typescript-reviewer"];
  }
  if (lowered === "python") {
    return ["python-reviewer"];
  }
  if (lowered === "go" || lowered === "golang") {
    return ["go-reviewer"];
  }
  if (lowered === "rust") {
    return ["rust-reviewer"];
  }
  if (lowered === "kotlin") {
    return ["kotlin-reviewer"];
  }
  return ["code-reviewer"];
}

function deriveChangeImpact(
  capabilities: AnalyzeCapability[],
  flows: AnalyzeCriticalFlow[],
  contracts: AnalyzeContractSurface[],
  technical: RepoTechnicalAnalysis[],
): AnalyzeChangeImpactEntry[] {
  const entries: AnalyzeChangeImpactEntry[] = [];

  for (const capability of capabilities) {
    const impactedRepos = unique([
      ...capability.owningRepos,
      ...flows.filter((flow) => flow.participatingRepos.some((repo) => capability.owningRepos.includes(repo))).flatMap((flow) => flow.participatingRepos),
    ]);
    const impactedContracts = unique(
      contracts
        .filter((contract) => contract.owners.some((repo) => impactedRepos.includes(repo)) || contract.consumers.some((repo) => impactedRepos.includes(repo)))
        .map((contract) => contract.name),
    ).slice(0, 6);
    const impactedTests = impactedRepos.map((repo) => {
      const technicalRepo = technical.find((entry) => entry.repo.name === repo);
      return `${repo}: ${technicalRepo?.testing.framework ?? "unknown"} (${technicalRepo?.testing.hasTestDir ? "has tests" : "weak test signal"})`;
    });
    const reviewerHints = unique(
      impactedRepos.flatMap((repo) => {
        const technicalRepo = technical.find((entry) => entry.repo.name === repo);
        return reviewerHint(technicalRepo?.stack.language ?? "unknown");
      }),
    );
    entries.push({
      target: capability.name,
      impactedRepos,
      impactedContracts,
      impactedTests,
      reviewerHints,
      evidence: makeEvidence(
        "Computed from capability ownership, critical flows, contract surfaces, and repository test signals.",
        unique([
          ...capability.evidence.signals,
          ...impactedRepos.map((repo) => `repo:${repo}`),
        ]),
      ),
      confidence: clampConfidence(0.73 + Math.min(impactedRepos.length, 3) * 0.04),
    });
  }

  return entries;
}

export function buildAnalyzeKnowledgeModel(input: {
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
  interview: AnalyzeInterviewSummary | null;
  focus: AnalyzeFocusSummary | null;
}): AnalyzeKnowledgeModel {
  const capabilities = deriveCapabilities(input.technical, input.business, input.fusion);
  const runtimeConstraints = deriveRuntimeConstraints(input.interview);
  const riskSurface = deriveRiskSurface(input.technical, input.interview);
  const contractSurfaces = deriveContractSurfaces(input.technical, input.business, input.fusion);
  const criticalFlows = deriveCriticalFlows(
    input.technical,
    input.business,
    input.fusion,
    input.interview,
    input.focus,
    riskSurface,
  );
  const domainContexts = deriveDomainContexts(input.technical, input.business);
  const decisionRecords = deriveDecisionRecords(input.interview);
  const changeImpact = deriveChangeImpact(capabilities, criticalFlows, contractSurfaces, input.technical);

  return {
    capabilities,
    criticalFlows,
    contractSurfaces,
    domainContexts,
    runtimeConstraints,
    riskSurface,
    decisionRecords,
    changeImpact,
  };
}
