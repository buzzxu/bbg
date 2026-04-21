import type {
  AnalyzeBusinessDimension,
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
    ...(business?.responsibilities ?? []),
    ...(business?.capabilities ?? []),
    ...(business?.entrypoints ?? []),
    ...(business?.apiSignals ?? []),
    ...(business?.domainTerms ?? []),
    ...(business?.riskMarkers ?? []),
  ]);
}

function makeEvidence(summary: string, signals: string[]): AnalyzeEvidenceNote {
  return {
    summary,
    signals: unique(signals).slice(0, 10),
  };
}

function inferRepoBoundary(technical: RepoTechnicalAnalysis): string {
  const framework = technical.stack.framework.toLowerCase();
  if (/(react|vue|next|taro)/.test(framework) || /frontend/.test(technical.repo.type)) {
    return "client application boundary";
  }
  if (
    /(spring|express|fastify|fastapi|django|laravel|rails|node)/.test(framework) ||
    technical.repo.type === "backend"
  ) {
    return "service and API boundary";
  }
  return "repository ownership boundary";
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
    "route",
    "entrypoint",
    "api",
    "view",
    "page",
  ]);

  return unique(values.flatMap((value) => tokenize(value)).filter((token) => !stopWords.has(token))).slice(0, 8);
}

function overlap(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return left.filter((value) => rightSet.has(value.toLowerCase()));
}

function businessByRepoMap(entries: RepoBusinessAnalysis[]): Map<string, RepoBusinessAnalysis> {
  return new Map(entries.map((entry) => [entry.repoName, entry] as const));
}

function deriveCapabilities(technical: RepoTechnicalAnalysis[], business: RepoBusinessAnalysis[]): AnalyzeCapability[] {
  const grouped = new Map<string, AnalyzeCapability>();
  const businessByRepo = businessByRepoMap(business);

  for (const technicalRepo of technical) {
    const businessRepo = businessByRepo.get(technicalRepo.repo.name);
    for (const capability of businessRepo?.capabilities ?? []) {
      const key = capability.toLowerCase();
      const existing = grouped.get(key);
      if (existing) {
        existing.owningRepos = unique([...existing.owningRepos, technicalRepo.repo.name]);
        existing.responsibilities = unique([
          ...existing.responsibilities,
          ...(businessRepo?.responsibilities ?? []),
        ]).slice(0, 8);
        existing.evidence.signals = unique([
          ...existing.evidence.signals,
          ...repoSignals(technicalRepo, businessRepo),
        ]).slice(0, 10);
        existing.confidence = clampConfidence(existing.confidence + 0.05);
        continue;
      }

      grouped.set(key, {
        name: capability,
        description: capability,
        owningRepos: [technicalRepo.repo.name],
        responsibilities: (
          businessRepo?.responsibilities ?? [technicalRepo.repo.description || technicalRepo.repo.type]
        ).slice(0, 6),
        evidence: makeEvidence(
          "Derived from route, API, controller, DTO, and domain-term signals collected from the repository.",
          repoSignals(technicalRepo, businessRepo),
        ),
        confidence: clampConfidence(0.72 + Math.min(businessRepo?.entrypoints.length ?? 0, 3) * 0.05),
      });
    }
  }

  if (grouped.size > 0) {
    return [...grouped.values()].sort(
      (left, right) => right.owningRepos.length - left.owningRepos.length || left.name.localeCompare(right.name),
    );
  }

  return technical.map((technicalRepo) => ({
    name: technicalRepo.repo.name,
    description: technicalRepo.repo.description || technicalRepo.repo.type,
    owningRepos: [technicalRepo.repo.name],
    responsibilities: [technicalRepo.repo.description || technicalRepo.repo.type],
    evidence: makeEvidence(
      "Fallback capability derived from repository identity because no stronger business signals were found.",
      repoSignals(technicalRepo, businessByRepo.get(technicalRepo.repo.name)),
    ),
    confidence: 0.46,
  }));
}

function deriveAnalysisDimensions(input: {
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  capabilities: AnalyzeCapability[];
  contracts: AnalyzeContractSurface[];
  risks: AnalyzeRiskItem[];
  flows: AnalyzeCriticalFlow[];
}): AnalyzeBusinessDimension[] {
  const businessByRepo = businessByRepoMap(input.business);
  const dimensions: AnalyzeBusinessDimension[] = [];
  const allSignals = unique(input.technical.flatMap((repo) => repoSignals(repo, businessByRepo.get(repo.repo.name))));

  const addDimension = (
    name: string,
    description: string,
    rationale: string,
    supportingRepos: string[],
    evidenceSignals: string[],
    confidence: number,
  ) => {
    dimensions.push({
      name,
      description,
      rationale,
      supportingRepos: unique(supportingRepos),
      evidence: makeEvidence(
        "Planned from repository entrypoints, API signals, contracts, risks, and workspace structure.",
        evidenceSignals,
      ),
      confidence: clampConfidence(confidence),
    });
  };

  const clientRepos = input.technical.filter((repo) => /frontend/.test(repo.repo.type)).map((repo) => repo.repo.name);
  const adminRepos = input.technical.filter((repo) => repo.repo.type === "frontend-web").map((repo) => repo.repo.name);
  const userFacingRepos = input.technical
    .filter((repo) => repo.repo.type === "frontend-h5")
    .map((repo) => repo.repo.name);
  const backendRepos = input.technical.filter((repo) => repo.repo.type === "backend").map((repo) => repo.repo.name);
  if (userFacingRepos.length > 0) {
    addDimension(
      "用户入口与交互场景",
      "分析用户侧页面、路由、入口点以及这些入口背后的主要 API 交互。",
      "检测到面向用户的前端仓库，并提取出了页面、路由和请求信号。",
      userFacingRepos,
      input.flows.flatMap((flow) => flow.evidence.signals).slice(0, 10),
      0.84,
    );
  }
  if (adminRepos.length > 0) {
    addDimension(
      "后台运营与配置面",
      "分析后台页面、运营配置动作和管理端调用的接口面与影响范围。",
      "检测到管理端仓库，并发现了后台路由、页面和配置类 API 调用。",
      adminRepos,
      input.capabilities
        .filter((capability) => capability.owningRepos.some((repo) => adminRepos.includes(repo)))
        .flatMap((capability) => capability.evidence.signals)
        .slice(0, 10),
      0.82,
    );
  }
  if (clientRepos.length > 0 && backendRepos.length > 0) {
    addDimension(
      "服务契约与跨仓协同",
      "分析前端、管理端与后端之间的 API 契约、消费关系和跨仓协作边界。",
      "工作区同时包含客户端与后端服务，并已推断出跨仓集成边。",
      [...clientRepos, ...backendRepos],
      input.contracts.flatMap((contract) => contract.evidence.signals).slice(0, 10),
      0.88,
    );
  }
  if (input.capabilities.length > 0) {
    addDimension(
      "核心业务对象与状态",
      "分析页面、接口、DTO、实体和命名信号中反复出现的核心业务对象与状态变化。",
      "已提取出一批反复出现的能力、领域词和实体词，可作为业务对象建模入口。",
      unique(input.capabilities.flatMap((capability) => capability.owningRepos)),
      input.capabilities.flatMap((capability) => capability.evidence.signals).slice(0, 10),
      0.8,
    );
  }

  if (input.risks.length > 0) {
    addDimension(
      "风险与运行约束",
      "分析测试薄弱区、敏感边界、外部集成和运行时约束，识别最需要谨慎变更的部分。",
      "风险面已识别出高风险热点与运行时敏感区，需要单独作为分析维度。",
      unique(input.risks.flatMap((risk) => risk.affectedRepos)),
      input.risks.flatMap((risk) => risk.evidence.signals).slice(0, 10),
      0.79,
    );
  }

  if (dimensions.length === 0) {
    addDimension(
      "仓库角色与业务边界",
      "分析各仓库承担的业务角色、入口点和跨仓协作方式。",
      "当前未发现更强的领域维度，因此退回到仓库角色与入口点分析。",
      input.technical.map((repo) => repo.repo.name),
      allSignals.slice(0, 10),
      0.62,
    );
  }

  return dimensions;
}

function deriveContractSurfaces(
  technical: RepoTechnicalAnalysis[],
  business: RepoBusinessAnalysis[],
  fusion: WorkspaceFusionResult,
): AnalyzeContractSurface[] {
  const businessByRepo = businessByRepoMap(business);
  const surfaces: AnalyzeContractSurface[] = [];

  for (const technicalRepo of technical) {
    const businessRepo = businessByRepo.get(technicalRepo.repo.name);
    const consumers = fusion.integrationEdges
      .filter((edge) => edge.to === technicalRepo.repo.name)
      .map((edge) => edge.from);

    if ((businessRepo?.entrypoints.length ?? 0) > 0) {
      surfaces.push({
        name: `${technicalRepo.repo.name} UI routes`,
        type: "ui",
        owners: [technicalRepo.repo.name],
        consumers,
        boundary: inferRepoBoundary(technicalRepo),
        evidence: makeEvidence(
          "Derived from discovered pages, views, and router entrypoints.",
          businessRepo?.entrypoints ?? [],
        ),
        confidence: clampConfidence(0.8),
      });
    }

    if ((businessRepo?.apiSignals.length ?? 0) > 0) {
      surfaces.push({
        name: `${technicalRepo.repo.name} API surface`,
        type: technicalRepo.repo.type === "backend" ? "http-api" : "shared-schema",
        owners: [technicalRepo.repo.name],
        consumers,
        boundary: inferRepoBoundary(technicalRepo),
        evidence: makeEvidence(
          "Derived from controller mappings, request URLs, and client API calls.",
          businessRepo?.apiSignals ?? [],
        ),
        confidence: clampConfidence(technicalRepo.repo.type === "backend" ? 0.86 : 0.76),
      });
    }

    for (const integration of businessRepo?.externalIntegrations ?? []) {
      surfaces.push({
        name: `${technicalRepo.repo.name} ${integration} integration`,
        type: "integration",
        owners: [technicalRepo.repo.name],
        consumers: [],
        boundary: "external integration boundary",
        evidence: makeEvidence("Derived from API routes, dependency names, and repository integration markers.", [
          integration,
          ...(businessRepo?.apiSignals.slice(0, 2) ?? []),
        ]),
        confidence: clampConfidence(0.7),
      });
    }
  }

  for (const edge of fusion.integrationEdges) {
    const sourceRepo = technical.find((entry) => entry.repo.name === edge.from);
    const targetRepo = technical.find((entry) => entry.repo.name === edge.to);
    const sourceBusiness = businessByRepo.get(edge.from);
    const targetBusiness = businessByRepo.get(edge.to);
    surfaces.push({
      name: `${edge.from} -> ${edge.to} API contract`,
      type: edge.kind === "shared-domain" ? "shared-schema" : "http-api",
      owners: [edge.to],
      consumers: [edge.from],
      boundary: "cross-repository integration seam",
      evidence: makeEvidence(
        "Derived from matched domain terms, frontend API calls, backend endpoints, and inferred workspace integration edges.",
        unique([
          ...(edge.signals ?? []),
          ...(sourceBusiness?.apiSignals.slice(0, 3) ?? []),
          ...(targetBusiness?.apiSignals.slice(0, 3) ?? []),
          ...(sourceRepo ? [`repo:${sourceRepo.repo.name}`] : []),
          ...(targetRepo ? [`repo:${targetRepo.repo.name}`] : []),
        ]),
      ),
      confidence: clampConfidence(0.78),
    });
  }

  return surfaces;
}

function matchReposForFlow(
  query: string,
  technical: RepoTechnicalAnalysis[],
  business: RepoBusinessAnalysis[],
): string[] {
  const businessByRepo = businessByRepoMap(business);
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
    .sort((left, right) => right.score - left.score || left.repo.localeCompare(right.repo))
    .map((entry) => entry.repo);
}

function deriveInferredFlows(
  technical: RepoTechnicalAnalysis[],
  business: RepoBusinessAnalysis[],
  fusion: WorkspaceFusionResult,
): string[] {
  const businessByRepo = businessByRepoMap(business);
  const inferred: string[] = [];

  for (const edge of fusion.integrationEdges) {
    const source = technical.find((entry) => entry.repo.name === edge.from);
    const target = technical.find((entry) => entry.repo.name === edge.to);
    const sourceBusiness = businessByRepo.get(edge.from);
    const targetBusiness = businessByRepo.get(edge.to);
    const sharedTerms = unique(
      overlap(
        [...(sourceBusiness?.domainTerms ?? []), ...(sourceBusiness?.capabilities ?? [])],
        [...(targetBusiness?.domainTerms ?? []), ...(targetBusiness?.capabilities ?? [])],
      ),
    );
    const label = sharedTerms.length > 0 ? sharedTerms.slice(0, 2).join(" and ") : "cross-repo business data";
    const flowSummary =
      source?.repo.type === "frontend-web"
        ? `Admin configures ${label} through ${edge.from} and ${edge.to} persists and validates the change.`
        : source?.repo.type === "frontend-h5"
          ? `User-facing ${label} flow moves through ${edge.from} UI and ${edge.to} APIs.`
          : `${edge.from} collaborates with ${edge.to} around ${label}.`;
    inferred.push(flowSummary);
  }

  for (const repo of business) {
    inferred.push(...repo.flowHints);
  }

  return unique(inferred).slice(0, 8);
}

function deriveCriticalFlows(
  technical: RepoTechnicalAnalysis[],
  business: RepoBusinessAnalysis[],
  fusion: WorkspaceFusionResult,
  interview: AnalyzeInterviewSummary | null,
  focus: AnalyzeFocusSummary | null,
  riskSurface: AnalyzeRiskItem[],
): AnalyzeCriticalFlow[] {
  const businessByRepo = businessByRepoMap(business);
  const candidates = interview?.context.criticalFlows.length
    ? interview.context.criticalFlows
    : deriveInferredFlows(technical, business, fusion);

  return candidates.slice(0, 6).map((flow, index) => {
    const matchedRepos = unique([
      ...(focus && tokenize(flow).some((token) => tokenize(focus.query).includes(token)) ? focus.matchedRepos : []),
      ...matchReposForFlow(flow, technical, business),
    ]);
    const repos = matchedRepos.length > 0 ? matchedRepos : technical.map((entry) => entry.repo.name);
    const steps = repos.map((repo, repoIndex) => {
      const technicalRepo = technical.find((entry) => entry.repo.name === repo);
      const businessRepo = businessByRepo.get(repo);
      const entrypoint = businessRepo?.entrypoints[0];
      const apiSignal = businessRepo?.apiSignals[0];
      const actionParts = [
        technicalRepo?.repo.type === "backend"
          ? `${repo} serves ${businessRepo?.capabilities[0]?.toLowerCase() ?? technicalRepo?.repo.type} requests`
          : `${repo} drives ${businessRepo?.capabilities[0]?.toLowerCase() ?? technicalRepo?.repo.type} user interactions`,
        entrypoint ? `via ${entrypoint}` : "",
        apiSignal ? `and ${apiSignal}` : "",
      ].filter((value) => value.length > 0);

      return {
        order: repoIndex + 1,
        repo,
        action: `${actionParts.join(" ")}.`,
        boundary: technicalRepo ? inferRepoBoundary(technicalRepo) : "repository boundary",
        evidence: makeEvidence(
          "Matched flow terms against entrypoints, API signals, capability labels, and domain terms.",
          technicalRepo ? repoSignals(technicalRepo, businessRepo) : [`repo:${repo}`],
        ),
      };
    });

    return {
      name: `flow-${index + 1}`,
      summary: flow,
      participatingRepos: repos,
      participatingModules: unique(
        repos.flatMap((repo) => businessByRepo.get(repo)?.capabilities.slice(0, 2) ?? [repo]),
      ),
      contracts: unique(
        fusion.integrationEdges
          .filter((edge) => repos.includes(edge.from) || repos.includes(edge.to))
          .map((edge) => `${edge.from} -> ${edge.to} API contract`),
      ),
      failurePoints: riskSurface
        .filter((item) => item.affectedRepos.some((repo) => repos.includes(repo)))
        .map((item) => item.title)
        .slice(0, 4),
      steps,
      evidence: makeEvidence(
        "Built from interview-confirmed flows or inferred user/admin/API journeys, then traced across matching repos.",
        unique([...repos.map((repo) => `repo:${repo}`), ...steps.flatMap((step) => step.evidence.signals)]),
      ),
      confidence: clampConfidence(
        (interview?.context.criticalFlows.includes(flow) ? 0.84 : 0.73) + Math.min(repos.length, 3) * 0.03,
      ),
    };
  });
}

function deriveRuntimeConstraints(interview: AnalyzeInterviewSummary | null): AnalyzeRuntimeConstraint[] {
  const assumptions = interview?.assumptionsApplied.find((entry) => entry.key === "nonNegotiableConstraints");
  const values = unique([...(interview?.context.nonNegotiableConstraints ?? []), ...(assumptions?.values ?? [])]);

  return values.map((statement) => {
    const lowered = statement.toLowerCase();
    const category: AnalyzeRuntimeConstraint["category"] =
      lowered.includes("security") || lowered.includes("auth") || lowered.includes("tenant")
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
  business: RepoBusinessAnalysis[],
  interview: AnalyzeInterviewSummary | null,
): AnalyzeRiskItem[] {
  const items: AnalyzeRiskItem[] = [];
  const assumption = interview?.assumptionsApplied.find((entry) => entry.key === "failureHotspots");
  const businessByRepo = businessByRepoMap(business);

  for (const hotspot of unique([...(interview?.context.failureHotspots ?? []), ...(assumption?.values ?? [])])) {
    const affectedRepos = technical
      .filter((entry) => hotspot.toLowerCase().includes(entry.repo.name.toLowerCase()))
      .map((entry) => entry.repo.name);
    items.push({
      title: hotspot,
      severity: /(auth|payment|tenant|security|checkout|share|template|poster|permission)/i.test(hotspot)
        ? "high"
        : "medium",
      affectedRepos: affectedRepos.length > 0 ? affectedRepos : technical.slice(0, 1).map((entry) => entry.repo.name),
      reasons: ["Flagged by analyze interview as a failure-prone or sensitive area."],
      evidence: makeEvidence(
        assumption?.rationale ?? "Derived from interview context and technical sensitivity markers.",
        assumption?.evidence ?? [],
      ),
      confidence: clampConfidence(interview?.confidenceAfter.failureHotspots ?? 0.68),
    });
  }

  for (const technicalRepo of technical) {
    const businessRepo = businessByRepo.get(technicalRepo.repo.name);
    if (!technicalRepo.testing.hasTestDir) {
      items.push({
        title: `${technicalRepo.repo.name}: limited dedicated test coverage`,
        severity: "medium",
        affectedRepos: [technicalRepo.repo.name],
        reasons: ["Repository lacks a dedicated test directory, increasing change risk."],
        evidence: makeEvidence("Derived from testing markers gathered during repository analysis.", [
          `repo:${technicalRepo.repo.name}`,
          `testing:${technicalRepo.testing.framework}`,
          "testing:missing-test-dir",
        ]),
        confidence: 0.79,
      });
    }
    if ((businessRepo?.riskMarkers.length ?? 0) > 0) {
      items.push({
        title: `${technicalRepo.repo.name}: sensitive ${businessRepo?.riskMarkers.slice(0, 3).join(", ")} boundary`,
        severity: "high",
        affectedRepos: [technicalRepo.repo.name],
        reasons: ["Domain terms and API markers indicate a sensitive business or permission boundary."],
        evidence: makeEvidence(
          "Derived from route, API, and domain signals containing sensitive workflow markers.",
          repoSignals(technicalRepo, businessRepo),
        ),
        confidence: 0.82,
      });
    }
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
  const assumed = assumption
    ? assumption.values.map((statement) => ({
        statement,
        status: "assumed" as const,
        rationale: assumption.rationale,
        evidence: makeEvidence(assumption.rationale, assumption.evidence),
        confidence: clampConfidence((interview?.confidenceAfter.decisionHistory ?? 0.64) - 0.05),
      }))
    : [];
  return [...confirmed, ...assumed];
}

function deriveDomainContexts(
  technical: RepoTechnicalAnalysis[],
  business: RepoBusinessAnalysis[],
): AnalyzeDomainContext[] {
  const grouped = new Map<string, AnalyzeDomainContext>();
  const businessByRepo = businessByRepoMap(business);

  for (const technicalRepo of technical) {
    const businessRepo = businessByRepo.get(technicalRepo.repo.name);
    for (const concept of unique([...(businessRepo?.domainTerms ?? []), ...(businessRepo?.entityTerms ?? [])])) {
      const existing = grouped.get(concept);
      if (existing) {
        existing.coreConcepts = unique([...existing.coreConcepts, ...(businessRepo?.entityTerms ?? [])]).slice(0, 8);
        existing.evidence.signals = unique([
          ...existing.evidence.signals,
          ...repoSignals(technicalRepo, businessRepo),
        ]).slice(0, 10);
        existing.confidence = clampConfidence(existing.confidence + 0.04);
        continue;
      }
      grouped.set(concept, {
        name: concept,
        ownerRepo: technicalRepo.repo.name,
        summary:
          businessRepo?.capabilities.find((capability) => capability.toLowerCase().includes(concept.toLowerCase())) ??
          technicalRepo.repo.description ??
          technicalRepo.repo.type,
        coreConcepts: unique([
          concept,
          ...(businessRepo?.entityTerms ?? []),
          ...(businessRepo?.capabilities ?? []),
        ]).slice(0, 8),
        evidence: makeEvidence(
          "Inferred from controller, DTO, entity, page, and route naming signals.",
          repoSignals(technicalRepo, businessRepo),
        ),
        confidence: 0.72,
      });
    }
  }

  if (grouped.size > 0) {
    return [...grouped.values()].sort(
      (left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name),
    );
  }

  return technical.map((technicalRepo) => {
    const businessRepo = businessByRepo.get(technicalRepo.repo.name);
    const sourceTexts = [
      technicalRepo.repo.description,
      ...(businessRepo?.responsibilities ?? []),
      ...(businessRepo?.flowHints ?? []),
    ];
    return {
      name: technicalRepo.repo.name,
      ownerRepo: technicalRepo.repo.name,
      summary: technicalRepo.repo.description || technicalRepo.repo.type,
      coreConcepts: topConcepts(sourceTexts),
      evidence: makeEvidence(
        "Fallback domain context derived from repository description and business responsibilities.",
        repoSignals(technicalRepo, businessRepo),
      ),
      confidence: 0.48,
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
  return capabilities.map((capability) => {
    const impactedRepos = unique([
      ...capability.owningRepos,
      ...flows
        .filter(
          (flow) =>
            flow.participatingRepos.some((repo) => capability.owningRepos.includes(repo)) ||
            flow.summary.toLowerCase().includes(capability.name.toLowerCase()),
        )
        .flatMap((flow) => flow.participatingRepos),
    ]);
    const impactedContracts = unique(
      contracts
        .filter(
          (contract) =>
            contract.owners.some((repo) => impactedRepos.includes(repo)) ||
            contract.consumers.some((repo) => impactedRepos.includes(repo)),
        )
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

    return {
      target: capability.name,
      impactedRepos,
      impactedContracts,
      impactedTests,
      reviewerHints,
      evidence: makeEvidence(
        "Computed from capability ownership, traced flows, inferred contracts, and repository test signals.",
        unique([
          ...capability.evidence.signals,
          ...impactedRepos.map((repo) => `repo:${repo}`),
          ...impactedContracts.slice(0, 3).map((contract) => `contract:${contract}`),
        ]),
      ),
      confidence: clampConfidence(0.76 + Math.min(impactedRepos.length, 3) * 0.03),
    };
  });
}

export function buildAnalyzeKnowledgeModel(input: {
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
  interview: AnalyzeInterviewSummary | null;
  focus: AnalyzeFocusSummary | null;
}): AnalyzeKnowledgeModel {
  const capabilities = deriveCapabilities(input.technical, input.business);
  const runtimeConstraints = deriveRuntimeConstraints(input.interview);
  const riskSurface = deriveRiskSurface(input.technical, input.business, input.interview);
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
  const analysisDimensions = deriveAnalysisDimensions({
    technical: input.technical,
    business: input.business,
    capabilities,
    contracts: contractSurfaces,
    risks: riskSurface,
    flows: criticalFlows,
  });

  return {
    analysisDimensions,
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
