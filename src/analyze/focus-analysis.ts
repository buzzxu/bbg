import type {
  AnalyzeFocusSummary,
  AnalyzeKnowledgeModel,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  WorkspaceFusionResult,
} from "./types.js";

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

const QUERY_STOP_WORDS = new Set([
  "analysis",
  "analyze",
  "business",
  "feature",
  "flow",
  "logic",
  "module",
  "process",
  "system",
  "workflow",
  "分析",
  "业务",
  "功能",
  "流程",
  "过程",
  "逻辑",
  "模块",
  "系统",
]);

const CHINESE_PURPOSE_SUFFIXES = [
  "业务流程分析",
  "流程分析",
  "链路分析",
  "过程分析",
  "业务分析",
  "功能分析",
  "逻辑分析",
  "分析",
  "业务流程",
  "流程",
  "链路",
  "过程",
  "业务",
  "功能",
  "逻辑",
  "模块",
  "系统",
];

interface SemanticProfile {
  triggers: string[];
  expansions: string[];
}

const SEMANTIC_PROFILES: SemanticProfile[] = [
  {
    triggers: [
      "售后",
      "售后服务",
      "退款",
      "退货",
      "退换",
      "换货",
      "返修",
      "客诉",
      "赔付",
      "after sale",
      "after-sales",
      "aftersale",
      "refund",
    ],
    expansions: [
      "售后",
      "售后服务",
      "退款",
      "退货",
      "退换",
      "换货",
      "返修",
      "客诉",
      "赔付",
      "after sale",
      "after-sales",
      "aftersale",
      "refund",
      "return",
      "exchange",
      "repair",
      "claim",
      "compensation",
      "service ticket",
      "support ticket",
    ],
  },
  {
    triggers: ["订单", "下单", "交易", "履约", "order", "checkout", "trade"],
    expansions: ["订单", "下单", "交易", "履约", "order", "orders", "checkout", "trade", "transaction", "fulfillment"],
  },
  {
    triggers: ["支付", "付款", "收款", "结算", "payment", "pay", "settlement"],
    expansions: ["支付", "付款", "收款", "结算", "payment", "pay", "paid", "settlement", "billing"],
  },
  {
    triggers: ["会员", "用户", "客户", "账号", "账户", "member", "user", "customer", "account"],
    expansions: [
      "会员",
      "用户",
      "客户",
      "账号",
      "账户",
      "member",
      "members",
      "user",
      "users",
      "customer",
      "account",
      "profile",
    ],
  },
  {
    triggers: ["库存", "商品", "产品", "sku", "spu", "inventory", "product", "goods"],
    expansions: ["库存", "商品", "产品", "sku", "spu", "inventory", "stock", "product", "goods", "catalog"],
  },
  {
    triggers: ["物流", "配送", "发货", "收货", "shipping", "delivery", "shipment", "logistics"],
    expansions: ["物流", "配送", "发货", "收货", "shipping", "delivery", "shipment", "logistics", "express"],
  },
  {
    triggers: ["审批", "审核", "流转", "approval", "audit", "review"],
    expansions: ["审批", "审核", "流转", "approval", "audit", "review", "workflow", "state transition"],
  },
];

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

function isLikelyChinese(value: string): boolean {
  return /[\u4e00-\u9fff]/.test(value);
}

function stripChinesePurposeSuffixes(value: string): string {
  let current = value.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of CHINESE_PURPOSE_SUFFIXES) {
      if (current.endsWith(suffix) && current.length > suffix.length) {
        current = current.slice(0, -suffix.length).trim();
        changed = true;
      }
    }
  }
  return current;
}

function extractAsciiTerms(query: string): string[] {
  return unique(
    query
      .toLowerCase()
      .match(/[a-z0-9][a-z0-9-]*/g)
      ?.flatMap((token) => token.split(/-+/g))
      .filter((token) => token.length >= 2 && !QUERY_STOP_WORDS.has(token)) ?? [],
  );
}

function extractChineseTerms(query: string): string[] {
  const terms: string[] = [];
  for (const segment of query.match(/[\u4e00-\u9fff]{2,}/g) ?? []) {
    const stripped = stripChinesePurposeSuffixes(segment);
    if (stripped.length >= 2 && !QUERY_STOP_WORDS.has(stripped)) {
      terms.push(stripped);
    }
    for (const profile of SEMANTIC_PROFILES) {
      for (const trigger of profile.triggers.filter(isLikelyChinese)) {
        if (segment.includes(trigger)) {
          terms.push(trigger);
        }
      }
    }
  }
  return unique(terms);
}

function profileMatches(profile: SemanticProfile, terms: string[], query: string): boolean {
  const normalizedQuery = normalizeForMatch(query);
  const normalizedTerms = terms.map(normalizeForMatch);
  return profile.triggers.some((trigger) => {
    const normalizedTrigger = normalizeForMatch(trigger);
    return (
      normalizedTrigger.length >= 2 &&
      (normalizedQuery.includes(normalizedTrigger) ||
        normalizedTerms.some((term) => term.includes(normalizedTrigger) || normalizedTrigger.includes(term)))
    );
  });
}

function deriveFocusTerms(query: string): {
  searchTerms: string[];
  entities: string[];
  semanticExpansions: string[];
} {
  const baseTerms = unique([...extractAsciiTerms(query), ...extractChineseTerms(query)]);
  const profileExpansions = unique(
    SEMANTIC_PROFILES.filter((profile) => profileMatches(profile, baseTerms, query)).flatMap(
      (profile) => profile.expansions,
    ),
  );
  const searchTerms = unique([...baseTerms, ...profileExpansions]).filter((term) => !QUERY_STOP_WORDS.has(term));
  const entities = unique(baseTerms).slice(0, 8);
  return {
    searchTerms,
    entities,
    semanticExpansions: profileExpansions.filter((term) => !entities.includes(term)).slice(0, 16),
  };
}

function matchesSearchTerm(value: string, term: string): boolean {
  const haystack = normalizeForMatch(value);
  const needle = normalizeForMatch(term);
  return needle.length >= 2 && haystack.includes(needle);
}

function classifyFocusIntent(query: string): NonNullable<AnalyzeFocusSummary["intent"]> {
  const normalized = query.toLowerCase();
  if (
    /(flow|journey|chain|lifecycle|path|checkout|order|fulfillment|process|workflow|transition|transaction|流程|链路|路径|生命周期|状态|交易|流转)/.test(
      normalized,
    )
  ) {
    return "business-chain";
  }
  if (/(object|entity|model|domain|aggregate|state|对象|实体|模型|领域|聚合)/.test(normalized)) {
    return "business-object";
  }
  if (/(risk|failure|incident|fragile|hotspot|风险|故障|事故|异常|脆弱|热点)/.test(normalized)) {
    return "risk";
  }
  if (/(contract|api|integration|boundary|契约|接口|集成|边界)/.test(normalized)) {
    return "integration";
  }
  if (/(architecture|design|technical|system|架构|设计|技术|系统)/.test(normalized)) {
    return "architecture";
  }
  return "general";
}

function semanticExpansions(tokens: string[], query: string, profileExpansions: string[]): string[] {
  const expansions: string[] = [];
  if (
    tokens.some((token) => ["flow", "journey", "process", "workflow", "state", "transaction"].includes(token)) ||
    /流程|链路|状态|交易|流转/.test(query)
  ) {
    expansions.push("transaction", "state change", "downstream integration");
  }
  if (tokens.some((token) => ["user", "customer", "member", "account"].includes(token))) {
    expansions.push("identity", "entrypoint", "permission");
  }
  if (tokens.some((token) => ["risk", "failure", "incident"].includes(token))) {
    expansions.push("hotspot", "rollback", "verification");
  }
  return unique([...profileExpansions, ...expansions]).slice(0, 16);
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

  const focusTerms = deriveFocusTerms(query);
  if (focusTerms.searchTerms.length === 0) {
    return {
      query,
      matchedRepos: [],
      matchedSignals: [],
      matchedContracts: [],
      riskHotspots: [],
      reviewerHints: [],
      likelyEntrypoints: [],
      rationale: ["Focus query did not contain enough searchable business or code tokens."],
    };
  }

  const businessByRepo = new Map(input.business.map((entry) => [entry.repoName, entry] as const));
  const scoredRepos = input.technical
    .map((technical) => {
      const signals = repoSignals(technical, businessByRepo.get(technical.repo.name));
      const matchingSignals = signals.filter((signal) => {
        return focusTerms.searchTerms.some((term) => matchesSearchTerm(signal, term));
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
    matchedEntities: focusTerms.entities,
    matchedChains: [],
    semanticExpansions: semanticExpansions(focusTerms.searchTerms, query, focusTerms.semanticExpansions),
    followupQuestions: focusTerms.entities
      .slice(0, 3)
      .map((token) =>
        isLikelyChinese(query)
          ? `“${token}” 的业务边界、参与角色和完成条件是什么？`
          : `What business boundary is defined by ${token}?`,
      ),
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
          deriveFocusTerms(focus.query).searchTerms.some((term) => matchesSearchTerm(haystack, term))
        );
      })
      .map((chain) => chain.summary),
  ).slice(0, 6);
  const matchedEntities = unique([
    ...(focus.matchedEntities ?? []),
    ...input.model.keyBusinessObjects.filter((entry) =>
      deriveFocusTerms(focus.query).searchTerms.some((term) => matchesSearchTerm(entry, term)),
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
