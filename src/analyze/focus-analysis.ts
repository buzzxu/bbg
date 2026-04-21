import type {
  AnalyzeFocusSummary,
  AnalyzeKnowledgeModel,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  WorkspaceFusionResult,
} from "./types.js";

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function classifyFocusIntent(query: string): NonNullable<AnalyzeFocusSummary["intent"]> {
  const normalized = query.toLowerCase();
  if (/(flow|journey|chain|lifecycle|path|checkout|order|fulfillment)/.test(normalized)) {
    return "business-chain";
  }
  if (/(object|entity|model|domain|aggregate|state)/.test(normalized)) {
    return "business-object";
  }
  if (/(risk|failure|incident|fragile|hotspot)/.test(normalized)) {
    return "risk";
  }
  if (/(contract|api|integration|boundary)/.test(normalized)) {
    return "integration";
  }
  if (/(architecture|design|technical|system)/.test(normalized)) {
    return "architecture";
  }
  return "general";
}

function semanticExpansions(tokens: string[]): string[] {
  const expansions: string[] = [];
  if (tokens.some((token) => ["order", "checkout", "payment", "fulfillment"].includes(token))) {
    expansions.push("transaction", "state change", "downstream integration");
  }
  if (tokens.some((token) => ["user", "customer", "member", "account"].includes(token))) {
    expansions.push("identity", "entrypoint", "permission");
  }
  if (tokens.some((token) => ["risk", "failure", "incident"].includes(token))) {
    expansions.push("hotspot", "rollback", "verification");
  }
  return unique(expansions).slice(0, 6);
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
    ...(business?.responsibilities ?? []),
    ...(business?.flowHints ?? []),
    ...(business?.capabilities ?? []),
    ...(business?.entrypoints ?? []),
    ...(business?.apiSignals ?? []),
    ...(business?.domainTerms ?? []),
  ]);
}

export function deriveAnalyzeFocusSummary(input: {
  focus: string | undefined;
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
}): AnalyzeFocusSummary | null {
  const query = input.focus?.trim();
  if (!query) {
    return null;
  }

  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return {
      query,
      matchedRepos: [],
      matchedSignals: [],
      matchedContracts: [],
      riskHotspots: [],
      reviewerHints: [],
      likelyEntrypoints: [],
      rationale: ["Focus query did not contain enough searchable tokens."],
    };
  }

  const businessByRepo = new Map(input.business.map((entry) => [entry.repoName, entry] as const));
  const scoredRepos = input.technical
    .map((technical) => {
      const signals = repoSignals(technical, businessByRepo.get(technical.repo.name));
      const matchingSignals = signals.filter((signal) => {
        const haystack = signal.toLowerCase();
        return tokens.some((token) => haystack.includes(token));
      });

      return {
        repo: technical.repo.name,
        matchingSignals,
        score: matchingSignals.length,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.repo.localeCompare(right.repo));

  const matchedRepos = scoredRepos.map((entry) => entry.repo);
  const matchedSignals = unique(
    scoredRepos.flatMap((entry) => entry.matchingSignals.map((signal) => `${entry.repo}: ${signal}`)),
  ).slice(0, 12);

  const repoMatchReason =
    matchedRepos.length > 0
      ? `Matched focus tokens against repo descriptions, entrypoints, API signals, and inferred business capabilities in ${matchedRepos.join(", ")}.`
      : "No strong repo-level match found for the focus tokens in current workspace signals.";

  const integrationReason =
    input.fusion.integrationEdges.length > 0
      ? `Workspace integration edges considered: ${input.fusion.integrationEdges.map((edge) => `${edge.from}->${edge.to}`).join(", ")}.`
      : "No explicit workspace integration edges were inferred.";

  return {
    query,
    intent: classifyFocusIntent(query),
    matchedRepos,
    matchedSignals,
    matchedContracts: [],
    riskHotspots: [],
    reviewerHints: [],
    likelyEntrypoints: [],
    matchedEntities: unique(tokens),
    matchedChains: [],
    semanticExpansions: semanticExpansions(tokens),
    followupQuestions: tokens.slice(0, 3).map((token) => `What business boundary is defined by ${token}?`),
    rationale: [repoMatchReason, integrationReason],
  };
}

export function enrichAnalyzeFocusSummary(input: {
  focus: AnalyzeFocusSummary | null;
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  model: AnalyzeKnowledgeModel;
}): AnalyzeFocusSummary | null {
  if (!input.focus) {
    return null;
  }

  const focus = input.focus;
  const businessByRepo = new Map(input.business.map((entry) => [entry.repoName, entry] as const));
  const likelyEntrypoints = unique(
    focus.matchedRepos.flatMap((repo) => {
      const technical = input.technical.find((entry) => entry.repo.name === repo);
      const business = businessByRepo.get(repo);
      return [
        technical?.repo.description ? `${repo}: ${technical.repo.description}` : "",
        ...(business?.entrypoints ?? []).map((entry) => `${repo}: ${entry}`),
        ...(business?.apiSignals ?? []).map((entry) => `${repo}: ${entry}`),
        ...(business?.responsibilities ?? []).map((entry) => `${repo}: ${entry}`),
        ...(business?.flowHints ?? []).map((entry) => `${repo}: ${entry}`),
      ];
    }),
  ).slice(0, 8);

  const matchedContracts = unique(
    input.model.contractSurfaces
      .filter(
        (contract) =>
          contract.owners.some((repo) => focus.matchedRepos.includes(repo)) ||
          contract.consumers.some((repo) => focus.matchedRepos.includes(repo)),
      )
      .map((contract) => contract.name),
  ).slice(0, 8);

  const riskHotspots = unique(
    input.model.riskSurface
      .filter((risk) => risk.affectedRepos.some((repo) => focus.matchedRepos.includes(repo)))
      .map((risk) => risk.title),
  ).slice(0, 8);

  const reviewerHints = unique(
    input.model.changeImpact
      .filter(
        (impact) =>
          impact.impactedRepos.some((repo) => focus.matchedRepos.includes(repo)) || impact.target === focus.query,
      )
      .flatMap((impact) => impact.reviewerHints),
  ).slice(0, 8);

  const rationale = [...focus.rationale];
  const matchedChains = unique(
    input.model.businessChains
      .filter((chain) => {
        const haystack = [
          chain.summary,
          chain.businessObject ?? "",
          chain.primaryActor ?? "",
          ...(chain.participatingRepos ?? []),
        ]
          .join(" ")
          .toLowerCase();
        return (
          focus.matchedSignals.some((signal) => haystack.includes(signal.split(": ").at(-1)?.toLowerCase() ?? "")) ||
          tokenize(focus.query).some((token) => haystack.includes(token))
        );
      })
      .map((chain) => chain.summary),
  ).slice(0, 6);
  const matchedEntities = unique([
    ...(focus.matchedEntities ?? []),
    ...input.model.keyBusinessObjects.filter((entry) =>
      tokenize(`${entry} ${focus.query}`).some((token) => entry.toLowerCase().includes(token)),
    ),
  ]).slice(0, 8);
  if (matchedContracts.length > 0) {
    rationale.push(`Expanded focus through ${matchedContracts.length} contract surface(s) touching matched repos.`);
  }
  if (riskHotspots.length > 0) {
    rationale.push(`Included ${riskHotspots.length} focus-relevant risk hotspot(s) from workspace risk analysis.`);
  }
  if (reviewerHints.length > 0) {
    rationale.push(`Derived reviewer hints from impacted repos and language-specific review guidance.`);
  }
  if (matchedChains.length > 0) {
    rationale.push(`Matched ${matchedChains.length} business chain(s) semantically related to the focus query.`);
  }

  return {
    ...focus,
    matchedContracts,
    riskHotspots,
    reviewerHints,
    likelyEntrypoints,
    matchedEntities,
    matchedChains,
    followupQuestions: unique([
      ...(focus.followupQuestions ?? []),
      ...matchedEntities.slice(0, 2).map((entity) => `Which states and invariants define ${entity}?`),
      ...matchedChains.slice(0, 2).map((chain) => `Which contracts and state transitions constrain ${chain}?`),
    ]).slice(0, 6),
    rationale,
  };
}
