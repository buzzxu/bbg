import { createHash } from "node:crypto";
import { join } from "node:path";
import { isAnalyzeAiAnalysisResult } from "./ai-schema.js";
import type { AnalyzeAiExecutionPlan } from "../runtime/ai-analysis-runner.js";
import { readIfExists, writeTextFile } from "../utils/fs.js";
import type {
  AnalyzeAiAnalysisResult,
  AnalyzeEvidenceGraph,
  AnalyzeFocusSummary,
  AnalyzeInterviewSummary,
  AnalyzeKnowledgeModel,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  WorkspaceFusionResult,
} from "./types.js";

const AI_REQUEST_PATH = ".bbg/analyze/ai/request.json";
const AI_INSTRUCTIONS_PATH = ".bbg/analyze/ai/instructions.md";
const AI_AGENT_TASK_PATH = ".bbg/analyze/ai/agent-task.md";
const AI_RESPONSE_SCHEMA_PATH = ".bbg/analyze/ai/response.schema.json";
const AI_RESPONSE_PATH = ".bbg/analyze/ai/response.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compactGraph(graph: AnalyzeEvidenceGraph): Record<string, unknown> {
  return {
    counts: {
      files: graph.files.length,
      symbols: graph.symbols.length,
      routes: graph.routes.length,
      apiEndpoints: graph.apiEndpoints.length,
      dtoEntities: graph.dtoEntities.length,
      tests: graph.tests.length,
    },
    routes: graph.routes.slice(0, 80).map((route) => ({
      repo: route.repo,
      file: route.file,
      route: route.route,
      lineRange: route.lineRange,
    })),
    apiEndpoints: graph.apiEndpoints.slice(0, 120).map((endpoint) => ({
      repo: endpoint.repo,
      file: endpoint.file,
      method: endpoint.method,
      path: endpoint.path,
      lineRange: endpoint.lineRange,
    })),
    dtoEntities: graph.dtoEntities.slice(0, 80).map((entity) => ({
      repo: entity.repo,
      file: entity.file,
      name: entity.name,
      kind: entity.kind,
      lineRange: entity.lineRange,
    })),
    tests: graph.tests.slice(0, 60).map((test) => ({
      repo: test.repo,
      file: test.file,
      framework: test.framework,
      lineRange: test.lineRange,
    })),
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function inputSignature(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 24);
}

function buildResponseSchema(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "BBG Analyze AI Reasoning Response",
    type: "object",
    required: ["version", "runId", "inputSignature", "analysis"],
    properties: {
      version: { const: 1 },
      runId: { type: "string" },
      inputSignature: { type: "string" },
      analysis: {
        type: "object",
        required: [
          "enabled",
          "mode",
          "provider",
          "modelClass",
          "generatedAt",
          "recommendedDimensions",
          "businessArchitectureNarrative",
          "technicalArchitectureNarrative",
          "coreBusinessChains",
          "keyBusinessObjects",
          "decisionHypotheses",
          "unknowns",
          "contradictions",
          "claims",
          "promptPreview",
        ],
      },
    },
  };
}

function buildInstructions(input: {
  runId: string;
  inputSignature: string;
  execution: AnalyzeAiExecutionPlan;
  responsePath: string;
}): string {
  return [
    "# BBG Analyze AI Reasoning Contract",
    "",
    `Run ID: ${input.runId}`,
    `Input signature: ${input.inputSignature}`,
    `AI mode: ${input.execution.mode}`,
    `Current tool: ${input.execution.currentTool ?? "unknown"}`,
    "",
    "## 任务",
    "",
    "你是当前 AI 工具中的分析执行者。请读取 `request.json`、证据图和知识库文件，完成通用项目分析，不要假设目标项目属于某个固定业务领域。",
    "",
    "必须输出业务架构、技术架构、核心业务链、关键业务对象、未知项和可验证 claim。每个重要 claim 必须引用 evidenceRefs，优先引用 `.bbg/analyze/evidence/*` 或 `.bbg/knowledge/*` 中的证据。",
    "",
    "## 约束",
    "",
    "- 不要写死任何目标项目专属业务名词到 bbg 源码。",
    "- 不要只复述目录结构；需要从路由、API、DTO/Entity、测试、依赖、跨仓关系推断业务能力和业务流程。",
    "- 如果证据不足，写入 `unknowns`，不要伪造确认结论。",
    "- 输出必须是 JSON，写入下面路径。",
    "",
    "## 输出路径",
    "",
    `\`${input.responsePath}\``,
    "",
    "## 输出格式",
    "",
    "```json",
    '{ "version": 1, "runId": "<same runId>", "inputSignature": "<same inputSignature>", "analysis": { "...": "AnalyzeAiAnalysisResult" } }',
    "```",
    "",
  ].join("\n");
}

function buildAgentTask(input: {
  runId: string;
  inputSignature: string;
  currentTool: string | null;
  requestPath: string;
  instructionsPath: string;
  responseSchemaPath: string;
  responsePath: string;
  replayCommand: string;
}): string {
  return [
    "# BBG_AGENT_ACTION_REQUIRED",
    "",
    "You are already running inside an AI agent session. Continue the analysis now; do not stop with a prose summary.",
    "",
    `Run ID: ${input.runId}`,
    `Input signature: ${input.inputSignature}`,
    `Current tool: ${input.currentTool ?? "unknown"}`,
    "",
    "## Required Action",
    "",
    `1. Read \`${input.requestPath}\`, \`${input.instructionsPath}\`, and \`${input.responseSchemaPath}\`.`,
    "2. Read the evidence paths listed in request.json, especially evidence graph, evidence index, domain lexicon, topology, contracts, critical flows, and business chains.",
    "3. Perform real AI reasoning over business architecture, technical architecture, business chains, key objects, contradictions, and unknowns.",
    `4. Write a valid JSON response to \`${input.responsePath}\`.`,
    `5. Rerun \`${input.replayCommand}\` so BBG can reconcile the AI analysis into docs, Hermes, and wiki knowledge.`,
    "",
    "## Hard Rules",
    "",
    "- Do not edit application source code during analyze.",
    "- Do not invent business facts when evidence is weak; put them in unknowns.",
    "- Do not hardcode target-project-specific assumptions into BBG.",
    "- Every important claim must include evidenceRefs from BBG evidence or knowledge files.",
    "- The response file must be JSON only. Do not write markdown into response.json.",
    "",
    "## Output Contract",
    "",
    `Response path: \`${input.responsePath}\``,
    `Schema path: \`${input.responseSchemaPath}\``,
    "",
  ].join("\n");
}

export async function writeAnalyzeAiReasoningContract(input: {
  cwd: string;
  runId: string;
  execution: AnalyzeAiExecutionPlan;
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
  interview: AnalyzeInterviewSummary | null;
  focus: AnalyzeFocusSummary | null;
  model: AnalyzeKnowledgeModel;
  evidenceGraph: AnalyzeEvidenceGraph;
  replayCommand: string;
}): Promise<{
  requestPath: string;
  instructionsPath: string;
  agentTaskPath: string;
  responseSchemaPath: string;
  responsePath: string;
  inputSignature: string;
}> {
  const stableInput = {
    requiredBehavior: [
      "Infer business architecture from repository evidence instead of fixed directories or hardcoded domain names.",
      "Use evidenceRefs for each important claim; prefer route, API, DTO/entity, test, and knowledge item evidence.",
      "Record unknowns when evidence is weak or contradictory.",
      "Keep internal implementation choices open for the coding agent; do not over-specify function-level design.",
    ],
    inputPaths: {
      evidenceGraph: ".bbg/analyze/evidence/evidence-graph.json",
      evidenceIndex: ".bbg/knowledge/workspace/evidence-index.json",
      domainLexicon: ".bbg/knowledge/workspace/domain-lexicon.json",
      knowledgeItems: ".bbg/knowledge/workspace/knowledge-items.json",
      topology: ".bbg/knowledge/workspace/topology.json",
      contracts: ".bbg/knowledge/workspace/contracts.json",
      criticalFlows: ".bbg/knowledge/workspace/critical-flows.json",
      businessChains: ".bbg/knowledge/workspace/business-chains.json",
    },
    workspace: {
      repos: input.fusion.repos,
      integrationEdges: input.fusion.integrationEdges,
      businessModules: input.fusion.businessModules,
      focus: input.focus,
      interview: input.interview
        ? {
            mode: input.interview.mode,
            context: input.interview.context,
            assumptionsApplied: input.interview.assumptionsApplied,
            unresolvedGaps: input.interview.unresolvedGaps,
          }
        : null,
    },
    existingModel: {
      analysisDimensions: input.model.analysisDimensions,
      capabilities: input.model.capabilities,
      criticalFlows: input.model.criticalFlows,
      contractSurfaces: input.model.contractSurfaces,
      domainContexts: input.model.domainContexts,
      runtimeConstraints: input.model.runtimeConstraints,
      riskSurface: input.model.riskSurface,
      decisionRecords: input.model.decisionRecords,
      changeImpact: input.model.changeImpact,
      keyBusinessObjects: input.model.keyBusinessObjects,
      unknowns: input.model.unknowns,
      contradictions: input.model.contradictions,
    },
    staticAnalysis: {
      technical: input.technical,
      business: input.business,
    },
    evidenceGraphDigest: compactGraph(input.evidenceGraph),
  };
  const signature = inputSignature(stableInput);
  const request = {
    version: 1,
    runId: input.runId,
    inputSignature: signature,
    generatedAt: new Date().toISOString(),
    purpose:
      "Provider-agnostic handoff for Claude, Codex, Gemini, Cursor, OpenCode, or any AI tool to perform evidence-backed business and technical architecture analysis.",
    execution: input.execution,
    output: {
      responsePath: AI_RESPONSE_PATH,
      schemaPath: AI_RESPONSE_SCHEMA_PATH,
      agentTaskPath: AI_AGENT_TASK_PATH,
      contract: "AnalyzeAiAnalysisResult wrapped as { version, runId, inputSignature, analysis }",
    },
    ...stableInput,
  };

  await writeTextFile(join(input.cwd, AI_REQUEST_PATH), `${JSON.stringify(request, null, 2)}\n`);
  await writeTextFile(
    join(input.cwd, AI_INSTRUCTIONS_PATH),
    buildInstructions({
      runId: input.runId,
      inputSignature: signature,
      execution: input.execution,
      responsePath: AI_RESPONSE_PATH,
    }),
  );
  await writeTextFile(
    join(input.cwd, AI_AGENT_TASK_PATH),
    buildAgentTask({
      runId: input.runId,
      inputSignature: signature,
      currentTool: input.execution.currentTool,
      requestPath: AI_REQUEST_PATH,
      instructionsPath: AI_INSTRUCTIONS_PATH,
      responseSchemaPath: AI_RESPONSE_SCHEMA_PATH,
      responsePath: AI_RESPONSE_PATH,
      replayCommand: input.replayCommand,
    }),
  );
  await writeTextFile(join(input.cwd, AI_RESPONSE_SCHEMA_PATH), `${JSON.stringify(buildResponseSchema(), null, 2)}\n`);

  return {
    requestPath: AI_REQUEST_PATH,
    instructionsPath: AI_INSTRUCTIONS_PATH,
    agentTaskPath: AI_AGENT_TASK_PATH,
    responseSchemaPath: AI_RESPONSE_SCHEMA_PATH,
    responsePath: AI_RESPONSE_PATH,
    inputSignature: signature,
  };
}

export async function readAnalyzeAiReasoningResponse(input: {
  cwd: string;
  runId: string;
  inputSignature: string;
}): Promise<AnalyzeAiAnalysisResult | null> {
  const raw = await readIfExists(join(input.cwd, AI_RESPONSE_PATH));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const runId = isRecord(parsed) && typeof parsed.runId === "string" ? parsed.runId : null;
    const signature = isRecord(parsed) && typeof parsed.inputSignature === "string" ? parsed.inputSignature : null;
    if (isRecord(parsed) && "analysis" in parsed && runId !== input.runId && signature !== input.inputSignature) {
      return null;
    }
    const candidate = isRecord(parsed) && "analysis" in parsed ? parsed.analysis : parsed;
    return isAnalyzeAiAnalysisResult(candidate) ? candidate : null;
  } catch {
    return null;
  }
}
