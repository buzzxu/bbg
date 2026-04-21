import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const analyzerState = vi.hoisted(() => ({
  analyzeRepo: vi.fn(),
}));

vi.mock("../../src/analyzers/index.js", () => ({
  analyzeRepo: analyzerState.analyzeRepo,
}));

import { serializeConfig } from "../../src/config/read-write.js";
import { runAnalyzeCommand } from "../../src/commands/analyze.js";
import { buildDefaultRuntimeConfig } from "../../src/runtime/schema.js";
import { exists, writeTextFile } from "../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-analyze-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  await mkdir(join(cwd, "repo-a", "src", "pages", "checkout"), { recursive: true });
  await mkdir(join(cwd, "repo-a", "src", "api"), { recursive: true });
  await writeTextFile(
    join(cwd, "repo-a", "src", "pages", "checkout", "index.tsx"),
    "export default function CheckoutPage() { return 'checkout'; }\n",
  );
  await writeTextFile(
    join(cwd, "repo-a", "src", "api", "orders.ts"),
    "export const fetchOrders = () => request({ method: 'get', url: '/api/orders' });\n",
  );
  await writeTextFile(
    join(cwd, ".bbg", "config.json"),
    serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "analyze test",
      createdAt: "2026-04-09T00:00:00.000Z",
      updatedAt: "2026-04-09T00:00:00.000Z",
      repos: [
        {
          name: "repo-a",
          gitUrl: "https://example.com/repo-a.git",
          branch: "main",
          type: "backend",
          description: "repo a",
          stack: {
            language: "typescript",
            framework: "node",
            buildTool: "npm",
            testFramework: "vitest",
            packageManager: "npm",
            languageVersion: "5.8.2",
          },
        },
      ],
      governance: {
        riskThresholds: {
          high: { grade: "A+", minScore: 99 },
          medium: { grade: "A", minScore: 95 },
          low: { grade: "B", minScore: 85 },
        },
        enableRedTeam: true,
        enableCrossAudit: true,
      },
      context: {},
      runtime: buildDefaultRuntimeConfig(),
    }),
  );
}

beforeEach(() => {
  analyzerState.analyzeRepo.mockReset();
  delete process.env.CODEX_THREAD_ID;
  analyzerState.analyzeRepo.mockResolvedValue({
    stack: {
      language: "typescript",
      framework: "node",
      buildTool: "npm",
      testFramework: "vitest",
      packageManager: "npm",
      languageVersion: "5.8.2",
    },
    structure: ["has-src"],
    deps: ["zod"],
    testing: {
      framework: "vitest",
      hasTestDir: true,
      testPattern: "*.test.ts",
    },
  });
});

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  delete process.env.CODEX_THREAD_ID;
});

describe("analyze command", () => {
  it("writes architecture docs for selected repos", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runAnalyzeCommand({ cwd, repos: ["repo-a"] });

    expect(result.analyzedRepos).toEqual(["repo-a"]);
    expect(result.runId).toBeTruthy();
    expect(result.scope).toBe("repo");
    expect(result.repoDocs).toContain("docs/architecture/repos/repo-a.md");
    expect(result.repositoryDocs).toContain("docs/repositories/repo-a.md");
    expect(result.docsUpdated).toContain("docs/business/module-map.md");
    expect(result.docsUpdated).toContain("docs/business/analysis-dimensions.md");
    expect(result.docsUpdated).toContain("docs/business/capability-map.md");
    expect(result.docsUpdated).toContain("docs/business/critical-flows.md");
    expect(result.docsUpdated).toContain("docs/business/business-chains.md");
    expect(result.docsUpdated).toContain("docs/business/domain-model.md");
    expect(result.docsUpdated).toContain("docs/architecture/integration-map.md");
    expect(result.docsUpdated).toContain("docs/architecture/integration-contracts.md");
    expect(result.docsUpdated).toContain("docs/architecture/runtime-constraints.md");
    expect(result.docsUpdated).toContain("docs/architecture/risk-surface.md");
    expect(result.docsUpdated).toContain("docs/architecture/change-impact-map.md");
    expect(result.docsUpdated).toContain("docs/architecture/languages/README.md");
    expect(result.docsUpdated).toContain("docs/architecture/languages/typescript/application-patterns.md");
    expect(result.docsUpdated).toContain("docs/wiki/reports/workspace-analysis-summary.md");
    expect(result.docsUpdated).toContain("docs/wiki/concepts/repo-repo-a-overview.md");
    expect(result.docsUpdated).toContain("docs/business/project-context.md");
    expect(result.docsUpdated).toContain("docs/wiki/concepts/project-context.md");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/business-context.json");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/constraints.json");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/analysis-dimensions.json");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/capabilities.json");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/critical-flows.json");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/business-chains.json");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/contracts.json");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/domain-model.json");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/risk-surface.json");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/change-impact.json");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/ai-analysis.json");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/reconciliation-report.json");
    expect(result.phases.some((phase) => phase.name === "deep-interview")).toBe(true);
    expect(result.interview?.mode).toBeTruthy();
    const latest = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "analyze", "latest.json"), "utf8"),
      ),
    ) as {
      runId: string;
      repos: string[];
      phases?: Array<{ name: string }>;
    };
    expect(latest.runId).toBe(result.runId);
    expect(latest.repos).toEqual(["repo-a"]);
    expect(latest.phases?.some((phase) => phase.name === "deep-interview")).toBe(true);
    const knowledge = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "knowledge", "repos", "repo-a", "technical.json"), "utf8"),
      ),
    ) as { repo: string };
    expect(knowledge.repo).toBe("repo-a");
    const repoSummary = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "repositories", "repo-a.md"), "utf8"),
    );
    expect(repoSummary).toContain("# repo-a");
    const wikiIndex = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "wiki", "index.md"), "utf8"),
    );
    expect(wikiIndex).toContain("工作区分析摘要");
    expect(wikiIndex).toContain("repo-a Overview");
    expect(wikiIndex).toContain("项目上下文");
    const languageGuide = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "architecture", "languages", "typescript", "application-patterns.md"), "utf8"),
    );
    const languageReadme = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "architecture", "languages", "README.md"), "utf8"),
    );
    expect(languageGuide).toContain("minimum_supported_version: 5.8.2");
    expect(languageGuide).toContain("https://www.typescriptlang.org/docs/handbook/project-references");
    expect(languageReadme).toContain("minimum_supported_version:");
    expect(languageReadme).toContain("last_reviewed:");
    expect(languageReadme).toContain("sources:");
    const businessModules = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "knowledge", "workspace", "business-modules.json"), "utf8"),
      ),
    ) as { repos: Array<{ name: string }> };
    expect(businessModules.repos).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Order" })]));
    const capabilities = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "knowledge", "workspace", "capabilities.json"), "utf8"),
      ),
    ) as { capabilities: Array<{ name: string; evidence: { summary: string } }> };
    expect(capabilities.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Checkout",
          evidence: expect.objectContaining({
            summary: expect.stringContaining("route, API, controller, DTO, and domain-term signals"),
          }),
        }),
      ]),
    );
    const criticalFlowsDoc = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "business", "critical-flows.md"), "utf8"),
    );
    expect(criticalFlowsDoc).toContain("# 关键流程分析");
    expect(criticalFlowsDoc).toContain("推定流程路径");
    expect(criticalFlowsDoc).toContain("```mermaid");
    const businessChainsDoc = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "business", "business-chains.md"), "utf8"),
    );
    expect(businessChainsDoc).toContain("# 业务链");
    expect(businessChainsDoc).toContain("主要触发角色");
    const contractsDoc = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "architecture", "integration-contracts.md"), "utf8"),
    );
    expect(contractsDoc).toContain("# 集成契约面");
    expect(contractsDoc).toContain("契约类型");
    const analysisDimensionsDoc = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "business", "analysis-dimensions.md"), "utf8"),
    );
    expect(analysisDimensionsDoc).toContain("# 分析维度");
    const aiAnalysis = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "knowledge", "workspace", "ai-analysis.json"), "utf8"),
      ),
    ) as { analysis: { businessArchitectureNarrative: string[] } };
    expect(aiAnalysis.analysis.businessArchitectureNarrative.length).toBeGreaterThan(0);
  });

  it("captures guided interview answers into analyze knowledge and wiki artifacts", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runAnalyzeCommand({
      cwd,
      repos: ["repo-a"],
      interview: {
        mode: "guided",
        answers: {
          businessGoal: "Provide a reliable checkout and account management backend.",
          criticalFlows: "User signs in\nUser completes checkout",
          nonNegotiableConstraints: "Must preserve auth integrity\nMust remain backward compatible for API clients",
          failureHotspots: "Checkout pipeline\nAuthentication service",
        },
      },
    });

    expect(result.interview?.mode).toBe("guided");
    expect(result.interview?.answered).toBeGreaterThan(0);

    const businessContext = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "knowledge", "workspace", "business-context.json"), "utf8"),
      ),
    ) as {
      businessGoal: string;
      criticalFlows: string[];
      failureHotspots: string[];
    };
    expect(businessContext.businessGoal).toContain("reliable checkout");
    expect(businessContext.criticalFlows).toEqual(["User signs in", "User completes checkout"]);
    expect(businessContext.failureHotspots).toEqual(["Checkout pipeline", "Authentication service"]);

    const constraints = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "knowledge", "workspace", "constraints.json"), "utf8"),
      ),
    ) as { constraints: string[] };
    expect(constraints.constraints).toEqual([
      "Must preserve auth integrity",
      "Must remain backward compatible for API clients",
    ]);

    const interviewState = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "analyze", "interview", "latest.json"), "utf8"),
      ),
    ) as { summary: { mode: string; answered: number } };
    expect(interviewState.summary.mode).toBe("guided");
    expect(interviewState.summary.answered).toBeGreaterThan(0);

    const projectContextWiki = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "wiki", "concepts", "project-context.md"), "utf8"),
    );
    expect(projectContextWiki).toContain("Provide a reliable checkout");
    expect(projectContextWiki).toContain("User signs in");
  });

  it("writes a focused analysis dossier and knowledge artifact for natural-language focus queries", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runAnalyzeCommand({
      cwd,
      repos: ["repo-a"],
      focus: "zod node",
    });

    expect(result.focus).not.toBeNull();
    expect(result.focusedAnalysisPath).toBe("docs/workflows/focused-analysis.md");
    expect(result.docsUpdated).toContain("docs/workflows/focused-analysis.md");
    expect(result.knowledgeUpdated).toContain(".bbg/knowledge/workspace/focused-analysis.json");
    expect(result.focus?.matchedRepos).toContain("repo-a");
    expect(result.focus?.intent).toBe("general");
    const focusedDoc = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "workflows", "focused-analysis.md"), "utf8"),
    );
    expect(focusedDoc).toContain("# zod node");
    expect(focusedDoc).toContain("## 契约");
    expect(focusedDoc).toContain("评审建议");
    const focusedKnowledge = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "knowledge", "workspace", "focused-analysis.json"), "utf8"),
      ),
    ) as { focus: { query: string; matchedRepos: string[]; reviewerHints: string[] } };
    expect(focusedKnowledge.focus.query).toBe("zod node");
    expect(focusedKnowledge.focus.matchedRepos).toContain("repo-a");
  });

  it("prunes stale managed analyze artifacts before rewriting current outputs", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    await writeTextFile(join(cwd, "docs", "architecture", "repos", "repo-old.md"), "# old\n");
    await writeTextFile(join(cwd, "docs", "repositories", "repo-old.md"), "# old\n");
    await writeTextFile(join(cwd, ".bbg", "knowledge", "repos", "repo-old", "technical.json"), "{}\n");
    await writeTextFile(join(cwd, "docs", "wiki", "concepts", "repo-repo-old-overview.md"), "# old\n");
    await writeTextFile(join(cwd, "docs", "architecture", "languages", "rust", "application-patterns.md"), "# old\n");

    const result = await runAnalyzeCommand({ cwd, repos: ["repo-a"] });

    expect(result.phases.some((phase) => phase.name === "prune-stale")).toBe(true);
    expect(await exists(join(cwd, "docs", "architecture", "repos", "repo-old.md"))).toBe(false);
    expect(await exists(join(cwd, "docs", "repositories", "repo-old.md"))).toBe(false);
    expect(await exists(join(cwd, ".bbg", "knowledge", "repos", "repo-old"))).toBe(false);
    expect(await exists(join(cwd, "docs", "wiki", "concepts", "repo-repo-old-overview.md"))).toBe(false);
    expect(await exists(join(cwd, "docs", "architecture", "languages", "rust", "application-patterns.md"))).toBe(false);
    expect(await exists(join(cwd, "docs", "architecture", "languages", "typescript", "application-patterns.md"))).toBe(
      true,
    );
  });

  it("applies AI-inferred interview assumptions in AI context without blocking completion", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    process.env.CODEX_THREAD_ID = "thread-123";

    const result = await runAnalyzeCommand({ cwd, repos: ["repo-a"] });

    expect(result.status).toBe("completed");
    expect(result.interview?.mode).toMatch(/guided|deep/);
    expect(result.interview?.assumptionsApplied.map((assumption) => assumption.key)).toEqual(
      expect.arrayContaining(["nonNegotiableConstraints", "decisionHistory"]),
    );
    expect(result.interview?.pendingQuestions).toEqual([]);
    expect(result.phases.some((phase) => phase.name === "deep-interview" && phase.status === "completed")).toBe(true);
    expect(await exists(join(cwd, ".bbg", "analyze", "interview", "pending.json"))).toBe(false);

    const businessContext = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "knowledge", "workspace", "business-context.json"), "utf8"),
      ),
    ) as { businessGoal: string; criticalFlows: string[] };
    expect(businessContext.businessGoal).toBe("repo a");
    const constraints = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(join(cwd, ".bbg", "knowledge", "workspace", "constraints.json"), "utf8"),
      ),
    ) as { constraints: string[]; assumptionsApplied: Array<{ key: string }> };
    expect(constraints.constraints.length).toBeGreaterThan(0);
    expect(constraints.constraints.join(" ")).toContain("explicit versioning");
    expect(constraints.assumptionsApplied.map((assumption) => assumption.key)).toContain("nonNegotiableConstraints");

    delete process.env.CODEX_THREAD_ID;
  });

  it("derives a focused analyze summary from repo signals", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runAnalyzeCommand({ cwd, repos: ["repo-a"], focus: "zod node" });

    expect(result.focus?.query).toBe("zod node");
    expect(result.focus?.matchedRepos).toEqual(["repo-a"]);
    expect(result.focus?.matchedSignals).toEqual(
      expect.arrayContaining(["repo-a: node", "repo-a: node service layer"]),
    );
    expect(result.focus?.matchedContracts).toEqual(expect.arrayContaining(["repo-a UI routes", "repo-a API surface"]));
    expect(result.focus?.reviewerHints).toEqual(expect.arrayContaining(["typescript-reviewer"]));
    expect(result.focus?.likelyEntrypoints).toEqual(expect.arrayContaining([expect.stringContaining("repo-a:")]));
    expect(result.focus?.riskHotspots?.length).toBeGreaterThan(0);
    expect(result.focus?.rationale).toEqual(
      expect.arrayContaining([expect.stringContaining("Matched focus tokens against repo descriptions")]),
    );
    expect(result.phases.some((phase) => phase.name === "focus-analysis" && phase.status === "completed")).toBe(true);
  });

  it("renders analyze result docs in Chinese when documentationLanguage is zh-CN", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    await writeTextFile(
      join(cwd, ".bbg", "config.json"),
      serializeConfig({
        version: "0.1.0",
        projectName: "bbg-project",
        projectDescription: "analyze test",
        documentationLanguage: "zh-CN",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
        repos: [
          {
            name: "repo-a",
            gitUrl: "https://example.com/repo-a.git",
            branch: "main",
            type: "backend",
            description: "repo a",
            stack: {
              language: "typescript",
              framework: "node",
              buildTool: "npm",
              testFramework: "vitest",
              packageManager: "npm",
              languageVersion: "5.8.2",
            },
          },
        ],
        governance: {
          riskThresholds: {
            high: { grade: "A+", minScore: 99 },
            medium: { grade: "A", minScore: 95 },
            low: { grade: "B", minScore: 85 },
          },
          enableRedTeam: true,
          enableCrossAudit: true,
        },
        context: {},
        runtime: buildDefaultRuntimeConfig(),
      }),
    );

    await runAnalyzeCommand({ cwd, repos: ["repo-a"] });

    const technicalArchitecture = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "architecture", "technical-architecture.md"), "utf8"),
    );
    const projectContext = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "business", "project-context.md"), "utf8"),
    );
    const wikiProjectContext = await import("node:fs/promises").then(({ readFile }) =>
      readFile(join(cwd, "docs", "wiki", "concepts", "project-context.md"), "utf8"),
    );

    expect(technicalArchitecture).toContain("# 技术架构");
    expect(technicalArchitecture).toContain("## 仓库列表");
    expect(projectContext).toContain("# 项目上下文");
    expect(projectContext).toContain("## 不可妥协约束");
    expect(wikiProjectContext).toContain("# 项目上下文");
    expect(wikiProjectContext).toContain("## AI 推断假设");
  });
});
