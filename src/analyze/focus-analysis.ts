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

  const repoMatchReason = matchedRepos.length > 0
    ? `Matched focus tokens against repo descriptions, entrypoints, API signals, and inferred business capabilities in ${matchedRepos.join(", ")}.`
    : "No strong repo-level match found for the focus tokens in current workspace signals.";

  const integrationReason = input.fusion.integrationEdges.length > 0
    ? `Workspace integration edges considered: ${input.fusion.integrationEdges.map((edge) => `${edge.from}->${edge.to}`).join(", ")}.`
    : "No explicit workspace integration edges were inferred.";

  return {
    query,
    matchedRepos,
    matchedSignals,
    matchedContracts: [],
    riskHotspots: [],
    reviewerHints: [],
    likelyEntrypoints: [],
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

  const businessByRepo = new Map(input.business.map((entry) => [entry.repoName, entry] as const));
  const likelyEntrypoints = unique(
    input.focus.matchedRepos.flatMap((repo) => {
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
      .filter((contract) => contract.owners.some((repo) => input.focus?.matchedRepos.includes(repo)) || contract.consumers.some((repo) => input.focus?.matchedRepos.includes(repo)))
      .map((contract) => contract.name),
  ).slice(0, 8);

  const riskHotspots = unique(
    input.model.riskSurface
      .filter((risk) => risk.affectedRepos.some((repo) => input.focus?.matchedRepos.includes(repo)))
      .map((risk) => risk.title),
  ).slice(0, 8);

  const reviewerHints = unique(
    input.model.changeImpact
      .filter((impact) => impact.impactedRepos.some((repo) => input.focus?.matchedRepos.includes(repo)) || impact.target === input.focus?.query)
      .flatMap((impact) => impact.reviewerHints),
  ).slice(0, 8);

  const rationale = [...input.focus.rationale];
  if (matchedContracts.length > 0) {
    rationale.push(`Expanded focus through ${matchedContracts.length} contract surface(s) touching matched repos.`);
  }
  if (riskHotspots.length > 0) {
    rationale.push(`Included ${riskHotspots.length} focus-relevant risk hotspot(s) from workspace risk analysis.`);
  }
  if (reviewerHints.length > 0) {
    rationale.push(`Derived reviewer hints from impacted repos and language-specific review guidance.`);
  }

  return {
    ...input.focus,
    matchedContracts,
    riskHotspots,
    reviewerHints,
    likelyEntrypoints,
    rationale,
  };
}
