import type { DocumentationLanguage } from "../config/documentation-language.js";

export interface AnalyzeDocCopy {
  technicalArchitecture: string;
  businessArchitecture: string;
  repoDependencyGraph: string;
  capabilityMap: string;
  criticalFlowAnalysis: string;
  integrationContracts: string;
  runtimeConstraints: string;
  riskSurface: string;
  decisionHistoryDoc: string;
  changeImpactMap: string;
  domainModel: string;
  workspaceTopology: string;
  integrationMap: string;
  moduleMap: string;
  coreFlows: string;
  projectContext: string;
  updatedAt: string;
  repositories: string;
  businessGoal: string;
  moduleResponsibilities: string;
  dependencies: string;
  repoEdges: string;
  currentFlowHypotheses: string;
  interviewConfirmedFlows: string;
  systemBoundaries: string;
  nonNegotiableConstraints: string;
  failureHotspots: string;
  decisionHistory: string;
  aiInferredAssumptions: string;
  type: string;
  stack: string;
  languageVersion: string;
  frameworkVersion: string;
  build: string;
  test: string;
  directDependencies: string;
  description: string;
  structureMarkers: string;
  dependencyMarkers: string;
  technicalSummary: string;
  summary: string;
  overview: string;
  keyDocs: string;
  ownershipHint: string;
  responsibility: string;
  currentResponsibility: string;
  flowHint: string;
  rationale: string;
  evidence: string;
  evidenceSignals: string;
  confidence: string;
  category: string;
  severity: string;
  coreConcepts: string;
  contracts: string;
  contractType: string;
  owners: string;
  consumers: string;
  trustBoundary: string;
  participatingRepos: string;
  participatingModules: string;
  likelyFlowSequence: string;
  reviewerHints: string;
  status: string;
  projectContextOverview: string;
  notProvided: string;
  none: string;
  notConfirmedYet: string;
  inferredGoalNotConfirmedYet: string;
  noneRecordedYet: string;
  architectureIndex: string;
  repoFiles: string;
  languageGuides: string;
  wikiIndex: string;
  wikiLog: string;
  wikiConcepts: string;
  wikiReports: string;
  workspaceAnalysisSummary: string;
}

const ENGLISH_COPY: AnalyzeDocCopy = {
  technicalArchitecture: "Technical Architecture",
  businessArchitecture: "Business Architecture",
  repoDependencyGraph: "Repo Dependency Graph",
  capabilityMap: "Capability Map",
  criticalFlowAnalysis: "Critical Flow Analysis",
  integrationContracts: "Integration Contracts",
  runtimeConstraints: "Runtime Constraints",
  riskSurface: "Risk Surface",
  decisionHistoryDoc: "Decision History",
  changeImpactMap: "Change Impact Map",
  domainModel: "Domain Model",
  workspaceTopology: "Workspace Topology",
  integrationMap: "Integration Map",
  moduleMap: "Module Map",
  coreFlows: "Core Flows",
  projectContext: "Project Context",
  updatedAt: "Updated at",
  repositories: "Repositories",
  businessGoal: "Business Goal",
  moduleResponsibilities: "Module Responsibilities",
  dependencies: "Dependencies",
  repoEdges: "Repo Edges",
  currentFlowHypotheses: "Current Flow Hypotheses",
  interviewConfirmedFlows: "Interview-Confirmed Flows",
  systemBoundaries: "System Boundaries",
  nonNegotiableConstraints: "Non-Negotiable Constraints",
  failureHotspots: "Failure Hotspots",
  decisionHistory: "Decision History",
  aiInferredAssumptions: "AI-Inferred Assumptions",
  type: "Type",
  stack: "Stack",
  languageVersion: "Language Version",
  frameworkVersion: "Framework Version",
  build: "Build",
  test: "Test",
  directDependencies: "Direct dependencies",
  description: "Description",
  structureMarkers: "Structure Markers",
  dependencyMarkers: "Dependency Markers",
  technicalSummary: "Technical Summary",
  summary: "Summary",
  overview: "Overview",
  keyDocs: "Key Analysis Documents",
  ownershipHint: "Ownership hint",
  responsibility: "Responsibility",
  currentResponsibility: "Current responsibility",
  flowHint: "Flow hint",
  rationale: "Rationale",
  evidence: "Evidence",
  evidenceSignals: "Evidence signals",
  confidence: "Confidence",
  category: "Category",
  severity: "Severity",
  coreConcepts: "Core Concepts",
  contracts: "Contracts",
  contractType: "Contract type",
  owners: "Owners",
  consumers: "Consumers",
  trustBoundary: "Trust boundary",
  participatingRepos: "Participating repos",
  participatingModules: "Participating modules",
  likelyFlowSequence: "Likely Flow Sequence",
  reviewerHints: "Reviewer hints",
  status: "Status",
  projectContextOverview: "Project context is now a navigation page over the richer analyze knowledge set.",
  notProvided: "(not provided)",
  none: "(none)",
  notConfirmedYet: "(not confirmed yet)",
  inferredGoalNotConfirmedYet: "(inferred goal not yet confirmed)",
  noneRecordedYet: "(none recorded yet)",
  architectureIndex: "Architecture Index",
  repoFiles: "Repo Files",
  languageGuides: "Language Guides",
  wikiIndex: "Wiki Index",
  wikiLog: "Wiki Log",
  wikiConcepts: "Concepts",
  wikiReports: "Reports",
  workspaceAnalysisSummary: "Workspace Analysis Summary",
};

const CHINESE_COPY: AnalyzeDocCopy = {
  technicalArchitecture: "技术架构",
  businessArchitecture: "业务架构",
  repoDependencyGraph: "仓库依赖图",
  capabilityMap: "能力地图",
  criticalFlowAnalysis: "关键流程分析",
  integrationContracts: "集成契约面",
  runtimeConstraints: "运行时约束",
  riskSurface: "风险面",
  decisionHistoryDoc: "决策历史",
  changeImpactMap: "变更影响面",
  domainModel: "领域模型",
  workspaceTopology: "工作区拓扑",
  integrationMap: "集成关系图",
  moduleMap: "模块地图",
  coreFlows: "核心流程",
  projectContext: "项目上下文",
  updatedAt: "更新时间",
  repositories: "仓库列表",
  businessGoal: "业务目标",
  moduleResponsibilities: "模块职责",
  dependencies: "依赖关系",
  repoEdges: "仓库边",
  currentFlowHypotheses: "当前流程假设",
  interviewConfirmedFlows: "访谈确认流程",
  systemBoundaries: "系统边界",
  nonNegotiableConstraints: "不可妥协约束",
  failureHotspots: "高风险热点",
  decisionHistory: "历史决策",
  aiInferredAssumptions: "AI 推断假设",
  type: "类型",
  stack: "技术栈",
  languageVersion: "语言版本",
  frameworkVersion: "框架版本",
  build: "构建工具",
  test: "测试框架",
  directDependencies: "直接依赖",
  description: "说明",
  structureMarkers: "结构信号",
  dependencyMarkers: "依赖信号",
  technicalSummary: "技术摘要",
  summary: "摘要",
  overview: "总览",
  keyDocs: "关键分析文档",
  ownershipHint: "归属提示",
  responsibility: "职责",
  currentResponsibility: "当前职责",
  flowHint: "流程提示",
  rationale: "依据",
  evidence: "证据",
  evidenceSignals: "证据信号",
  confidence: "置信度",
  category: "类别",
  severity: "严重度",
  coreConcepts: "核心概念",
  contracts: "契约",
  contractType: "契约类型",
  owners: "拥有方",
  consumers: "消费方",
  trustBoundary: "信任边界",
  participatingRepos: "参与仓库",
  participatingModules: "参与模块",
  likelyFlowSequence: "推定流程路径",
  reviewerHints: "评审建议",
  status: "状态",
  projectContextOverview: "项目上下文现在作为导航页，指向更完整的 analyze 知识模型。",
  notProvided: "（未提供）",
  none: "（无）",
  notConfirmedYet: "（尚未确认）",
  inferredGoalNotConfirmedYet: "（已推断但尚未确认）",
  noneRecordedYet: "（暂无记录）",
  architectureIndex: "架构索引",
  repoFiles: "仓库文档",
  languageGuides: "语言范式",
  wikiIndex: "知识索引",
  wikiLog: "知识日志",
  wikiConcepts: "概念",
  wikiReports: "报告",
  workspaceAnalysisSummary: "工作区分析摘要",
};

export function getAnalyzeDocCopy(language: DocumentationLanguage): AnalyzeDocCopy {
  return language === "zh-CN" ? CHINESE_COPY : ENGLISH_COPY;
}
