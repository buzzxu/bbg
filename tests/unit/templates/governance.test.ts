import { describe, expect, it } from "vitest";
import type { BbgConfig, RepoEntry } from "../../../src/config/schema.js";
import { buildTemplateContext } from "../../../src/templates/context.js";
import { buildGovernanceManifest } from "../../../src/templates/governance.js";

function createMinimalConfig(overrides: Partial<BbgConfig> = {}): BbgConfig {
  return {
    version: "0.1.0",
    projectName: "test-project",
    projectDescription: "test",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    repos: [],
    governance: {
      riskThresholds: {
        high: { grade: "A", minScore: 90 },
        medium: { grade: "B", minScore: 70 },
        low: { grade: "C", minScore: 50 },
      },
      enableRedTeam: false,
      enableCrossAudit: false,
    },
    context: {},
    ...overrides,
  };
}

function makeRepo(overrides: Partial<RepoEntry> = {}): RepoEntry {
  return {
    name: "web",
    gitUrl: "https://github.com/test/web.git",
    branch: "main",
    type: "frontend-web",
    description: "web app",
    stack: {
      language: "typescript",
      framework: "react",
      buildTool: "vite",
      testFramework: "vitest",
      packageManager: "npm",
    },
    ...overrides,
  };
}

describe("buildGovernanceManifest", () => {
  it("places target-project harness assets under .bbg instead of root governance directories", () => {
    const config = createMinimalConfig();
    const ctx = buildTemplateContext(config);
    const destinations = buildGovernanceManifest(ctx).map((task) => task.destination);

    expect(destinations).toContain(".bbg/harness/agents/planner.md");
    expect(destinations).toContain(".bbg/harness/skills/analyze/SKILL.md");
    expect(destinations).toContain(".bbg/harness/commands/analyze.md");
    expect(destinations).toContain(".bbg/harness/rules/common/coding-style.md");
    expect(destinations).toContain(".bbg/harness/hooks/hooks.json");
    expect(destinations).toContain(".bbg/harness/contexts/dev.md");
    expect(destinations).toContain(".bbg/harness/mcp-configs/mcp-servers.json");
    expect(destinations).toContain(".bbg/harness/workflows/schema.json");
    expect(destinations).toContain(".bbg/harness/scripts/workflow-schema.sql");
    expect(destinations).toContain(".bbg/evals/golden-tasks/manifest.json");

    expect(destinations.some((pathValue) => pathValue.startsWith("agents/"))).toBe(false);
    expect(destinations.some((pathValue) => pathValue.startsWith("skills/"))).toBe(false);
    expect(destinations.some((pathValue) => pathValue.startsWith("commands/"))).toBe(false);
    expect(destinations.some((pathValue) => pathValue.startsWith("rules/"))).toBe(false);
    expect(destinations.some((pathValue) => pathValue.startsWith("hooks/"))).toBe(false);
    expect(destinations.some((pathValue) => pathValue.startsWith("contexts/"))).toBe(false);
    expect(destinations.some((pathValue) => pathValue.startsWith("mcp-configs/"))).toBe(false);
    expect(destinations.some((pathValue) => pathValue.startsWith("workflows/"))).toBe(false);
    expect(destinations.some((pathValue) => pathValue.startsWith("evals/"))).toBe(false);
  });

  it("generates core governance files for minimal config (no repos)", () => {
    const config = createMinimalConfig();
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);
    const destinations = tasks.map((t) => t.destination);

    // All non-context/policy.json tasks should be copy mode
    const nonContextTasks = tasks.filter(
      (t) => !t.destination.startsWith(".bbg/harness/contexts/") && t.destination !== ".bbg/policy/policy.json",
    );
    for (const task of nonContextTasks) {
      expect(task.mode).toBe("copy");
    }

    // Core agents: 13
    const agentTasks = tasks.filter((t) => t.destination.startsWith(".bbg/harness/agents/"));
    expect(agentTasks).toHaveLength(13);
    expect(agentTasks.map((t) => t.destination)).toContain(".bbg/harness/agents/planner.md");
    expect(agentTasks.map((t) => t.destination)).toContain(".bbg/harness/agents/devops-reviewer.md");

    // Core + operations + wiki skills + wiki compilation skills + wiki trust skills + Hermes skills: 47 + 18 + 3 + 2 + 3 + 13 = 86
    const skillTasks = tasks.filter((t) => t.destination.startsWith(".bbg/harness/skills/"));
    expect(skillTasks).toHaveLength(86);
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/coding-standards/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/agent-orchestration/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/telemetry-dashboard/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/deep-interview/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/eval-regression/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/policy-enforcement/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/context-loading/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/session-memory/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/workflow-orchestration/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/add-repo/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/analyze/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/analyze-repo/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/start/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/resume/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/workflow/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/hermes/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/model-route/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/task-start/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/deliver/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/wiki-compilation/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/wiki-maintenance/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/wiki-auditor/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/wiki-provenance/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/wiki-distillation/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/cross-audit/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/architecture-analysis/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/business-analysis/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/cross-repo-analysis/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/task-intake/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/client-delivery/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/task-environments/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/agent-observability/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain(".bbg/harness/skills/doc-gardening/SKILL.md");

    // Common rules: 9
    const ruleTasks = tasks.filter((t) => t.destination.startsWith(".bbg/harness/rules/"));
    expect(ruleTasks).toHaveLength(9);
    expect(ruleTasks.map((t) => t.destination)).toContain(".bbg/harness/rules/common/coding-style.md");
    expect(ruleTasks.map((t) => t.destination)).toContain(".bbg/harness/rules/common/agents.md");
    expect(ruleTasks.map((t) => t.destination)).toContain(".bbg/harness/rules/common/knowledge.md");

    // Core + wiki commands + wiki compilation commands + wiki trust commands + Hermes commands: 47 + 3 + 2 + 3 + 15 = 70
    const commandTasks = tasks.filter((t) => t.destination.startsWith(".bbg/harness/commands/"));
    expect(commandTasks).toHaveLength(70);
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/plan.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/sync.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/telemetry-report.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/interview.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/interview-resume.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/eval-compare.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/policy-check.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/policy-exception.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/context-refresh.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/context-budget.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/workflow-start.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/workflow-resume.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/workflow-status.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/cross-audit.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/analyze.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/start.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/resume.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/status.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/add-repo.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/analyze-repo.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/task-start.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/deliver.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/task-env.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/doc-garden.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/observe.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/wiki-compile.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/wiki-refresh.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/wiki-audit.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/wiki-stale.md");
    expect(commandTasks.map((t) => t.destination)).toContain(".bbg/harness/commands/wiki-promote.md");

    // Hooks: 9
    const hookTasks = tasks.filter((t) => t.destination.startsWith(".bbg/harness/hooks/"));
    expect(hookTasks).toHaveLength(9);
    expect(hookTasks.map((t) => t.destination)).toContain(".bbg/harness/hooks/hooks.json");
    expect(hookTasks.map((t) => t.destination)).toContain(".bbg/harness/hooks/scripts/security-scan.js");
    expect(hookTasks.map((t) => t.destination)).toContain(".bbg/harness/hooks/scripts/telemetry-collector.js");

    // Contexts: 3 (handlebars mode)
    const contextTasks = tasks.filter((t) => t.destination.startsWith(".bbg/harness/contexts/"));
    expect(contextTasks).toHaveLength(3);
    for (const task of contextTasks) {
      expect(task.mode).toBe("handlebars");
      expect(task.source).toMatch(/^handlebars\/contexts\/.*\.hbs$/);
    }

    // MCP configs: 2
    const mcpTasks = tasks.filter((t) => t.destination.startsWith(".bbg/harness/mcp-configs/"));
    expect(mcpTasks).toHaveLength(2);

    // Workflow files: 1 SQL + 1 schema + 5 presets = 7
    const workflowTasks = tasks.filter(
      (t) => t.destination.startsWith(".bbg/harness/workflows/") || t.destination === ".bbg/harness/scripts/workflow-schema.sql",
    );
    expect(workflowTasks).toHaveLength(7);
    expect(workflowTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/workflow-schema.sql");
    expect(workflowTasks.map((t) => t.destination)).toContain(".bbg/harness/workflows/schema.json");
    expect(workflowTasks.map((t) => t.destination)).toContain(".bbg/harness/workflows/presets/tdd-feature.yaml");
    expect(workflowTasks.map((t) => t.destination)).toContain(".bbg/harness/workflows/presets/bugfix.yaml");
    expect(workflowTasks.map((t) => t.destination)).toContain(".bbg/harness/workflows/presets/security-audit.yaml");
    expect(workflowTasks.map((t) => t.destination)).toContain(".bbg/harness/workflows/presets/release-prep.yaml");
    expect(workflowTasks.map((t) => t.destination)).toContain(".bbg/harness/workflows/presets/full-feature.yaml");

    // Eval golden tasks: 5 (manifest + 4 task files)
    const evalTasks = tasks.filter((t) => t.destination.startsWith(".bbg/evals/"));
    expect(evalTasks).toHaveLength(5);
    expect(evalTasks.map((t) => t.destination)).toContain(".bbg/evals/golden-tasks/manifest.json");
    expect(evalTasks.map((t) => t.destination)).toContain(".bbg/evals/golden-tasks/tasks/simple-bugfix.json");
    expect(evalTasks.map((t) => t.destination)).toContain(".bbg/evals/golden-tasks/tasks/tdd-feature.json");
    expect(evalTasks.map((t) => t.destination)).toContain(".bbg/evals/golden-tasks/tasks/security-review.json");
    expect(evalTasks.map((t) => t.destination)).toContain(".bbg/evals/golden-tasks/tasks/refactor-extract.json");

    // .bbg scripts: telemetry + eval + org + interview + policy + context + workflow + knowledge + provenance + Hermes
    const bbgScriptTasks = tasks.filter((t) => t.destination.startsWith(".bbg/harness/scripts/"));
    expect(bbgScriptTasks).toHaveLength(12);
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/telemetry-init.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/telemetry-report.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/eval-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/org-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/interview-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/policy-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/build-repo-map.js");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/context-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/workflow-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/knowledge-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/harness/scripts/knowledge-provenance.sql");

    // Policy files: 2 (.bbg/policy/policy.json handlebars, .bbg/policy/exceptions.json copy)
    const policyTasks = tasks.filter((t) => t.destination.startsWith(".bbg/policy/"));
    expect(policyTasks).toHaveLength(2);
    expect(policyTasks.map((t) => t.destination)).toContain(".bbg/policy/policy.json");
    expect(policyTasks.map((t) => t.destination)).toContain(".bbg/policy/exceptions.json");
    const policyJsonTask = policyTasks.find((t) => t.destination === ".bbg/policy/policy.json");
    expect(policyJsonTask?.mode).toBe("handlebars");
    const exceptionsTask = policyTasks.find((t) => t.destination === ".bbg/policy/exceptions.json");
    expect(exceptionsTask?.mode).toBe("copy");

    // Org governance: 5 reserved files
    const expectedOrgDestinations = [
      ".bbg/org/README.md",
      ".bbg/org/org-policy-schema.json",
      ".bbg/org/org-report-schema.json",
      ".bbg/org/org-config.example.json",
      ".bbg/harness/scripts/org-schema.sql",
    ];
    const orgTasks = tasks.filter((t) => expectedOrgDestinations.includes(t.destination));
    expect(orgTasks).toHaveLength(expectedOrgDestinations.length);
    expect(orgTasks.map((t) => t.destination)).toEqual(expect.arrayContaining(expectedOrgDestinations));

    const wikiDocTasks = tasks.filter(
      (t) => t.destination.startsWith("docs/wiki/") || t.destination === "docs/raw/README.md",
    );
    expect(wikiDocTasks).toHaveLength(19);
    expect(destinations).toContain("docs/raw/README.md");
    expect(destinations).toContain("docs/wiki/index.md");
    expect(destinations).toContain("docs/wiki/log.md");
    expect(destinations).toContain("docs/wiki/concepts/README.md");
    expect(destinations).toContain("docs/wiki/decisions/README.md");
    expect(destinations).toContain("docs/wiki/reports/README.md");
    expect(destinations).toContain("docs/wiki/processes/README.md");
    expect(destinations).toContain("docs/wiki/reports/regression-risk-summary.md");
    expect(destinations).toContain("docs/wiki/reports/workflow-stability-summary.md");
    expect(destinations).toContain("docs/wiki/processes/knowledge-compilation.md");
    expect(destinations).toContain("docs/wiki/processes/knowledge-trust-model.md");

    expect(destinations).toContain(".bbg/knowledge/README.md");
    expect(destinations).toContain(".bbg/harness/scripts/knowledge-schema.sql");
    expect(destinations).toContain(".bbg/harness/scripts/knowledge-provenance.sql");
    expect(destinations).toContain(".bbg/harness/commands/hermes-log.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-candidates.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-distill.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-refine.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-query.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-draft-skill.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-draft-rule.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-intake.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-intake-review.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-verify.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-promote.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-learn.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-strategy.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-adopt.md");
    expect(destinations).toContain(".bbg/harness/commands/hermes-outcomes.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-runtime/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-evaluation/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-distillation/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-memory-router/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-skill-drafting/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-rule-drafting/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-intake/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-verification/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-promotion/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-meta-learning/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-strategy-selection/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-strategy-adoption/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/hermes-outcome-evaluation/SKILL.md");
    expect(destinations).toContain("docs/wiki/processes/hermes-runtime.md");
    expect(destinations).toContain("docs/wiki/processes/hermes-distillation.md");
    expect(destinations).toContain("docs/wiki/processes/hermes-memory-routing.md");
    expect(destinations).toContain("docs/wiki/processes/hermes-skill-rule-drafting.md");
    expect(destinations).toContain("docs/wiki/processes/hermes-intake.md");
    expect(destinations).toContain("docs/wiki/processes/hermes-verification-promotion.md");
    expect(destinations).toContain("docs/wiki/processes/hermes-meta-learning.md");
    expect(destinations).toContain("docs/wiki/processes/hermes-strategy-adoption.md");
    expect(destinations).toContain(".bbg/harness/scripts/hermes-schema.sql");

    const knowledgeTasks = tasks.filter(
      (t) => t.destination === ".bbg/knowledge/README.md" || t.destination === ".bbg/harness/scripts/knowledge-schema.sql",
    );
    expect(knowledgeTasks).toHaveLength(2);

    expect(destinations).not.toContain("docs/wiki/reports/red-team-findings-summary.md");

    // Total: 241
    expect(tasks).toHaveLength(241);
  });

  it("includes typescript-specific governance files when typescript repo present", () => {
    const config = createMinimalConfig({
      repos: [
        makeRepo({
          stack: {
            language: "typescript",
            framework: "react",
            buildTool: "vite",
            testFramework: "vitest",
            packageManager: "npm",
          },
        }),
      ],
    });
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);

    const destinations = tasks.map((t) => t.destination);

    // TypeScript agents: typescript-reviewer, typescript-build-resolver
    expect(destinations).toContain(".bbg/harness/agents/typescript-reviewer.md");
    expect(destinations).toContain(".bbg/harness/agents/typescript-build-resolver.md");

    // TypeScript skills: typescript-patterns, react-patterns, nextjs-patterns, vue-patterns
    expect(destinations).toContain(".bbg/harness/skills/typescript-patterns/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/react-patterns/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/nextjs-patterns/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/vue-patterns/SKILL.md");

    // TypeScript rules: coding-style, testing, react, node, security
    expect(destinations).toContain(".bbg/harness/rules/typescript/coding-style.md");
    expect(destinations).toContain(".bbg/harness/rules/typescript/testing.md");
    expect(destinations).toContain(".bbg/harness/rules/typescript/react.md");
    expect(destinations).toContain(".bbg/harness/rules/typescript/node.md");
    expect(destinations).toContain(".bbg/harness/rules/typescript/security.md");

    // TypeScript commands: ts-review, ts-build, ts-test
    expect(destinations).toContain(".bbg/harness/commands/ts-review.md");
    expect(destinations).toContain(".bbg/harness/commands/ts-build.md");
    expect(destinations).toContain(".bbg/harness/commands/ts-test.md");

    // TypeScript symbol map script
    expect(destinations).toContain(".bbg/harness/scripts/build-symbol-map-ts.js");
    expect(destinations).not.toContain(".bbg/harness/scripts/build-symbol-map-python.py");

    expect(destinations).not.toContain("docs/wiki/reports/red-team-findings-summary.md");
    expect(destinations).toContain("docs/wiki/processes/knowledge-trust-model.md");
    expect(destinations).toContain(".bbg/harness/scripts/knowledge-provenance.sql");

    // Total: 256
    expect(tasks).toHaveLength(256);
  });

  it("includes files for multiple languages (python + typescript)", () => {
    const config = createMinimalConfig({
      repos: [
        makeRepo({
          name: "web",
          type: "frontend-web",
          stack: {
            language: "typescript",
            framework: "react",
            buildTool: "vite",
            testFramework: "vitest",
            packageManager: "npm",
          },
        }),
        makeRepo({
          name: "api",
          gitUrl: "https://github.com/test/api.git",
          type: "backend",
          description: "api server",
          stack: {
            language: "python",
            framework: "fastapi",
            buildTool: "pip",
            testFramework: "pytest",
            packageManager: "pip",
          },
        }),
      ],
    });
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);

    const destinations = tasks.map((t) => t.destination);

    // TypeScript-specific files
    expect(destinations).toContain(".bbg/harness/agents/typescript-reviewer.md");
    expect(destinations).toContain(".bbg/harness/skills/typescript-patterns/SKILL.md");
    expect(destinations).toContain(".bbg/harness/rules/typescript/coding-style.md");
    expect(destinations).toContain(".bbg/harness/commands/ts-review.md");

    // Python-specific files
    expect(destinations).toContain(".bbg/harness/agents/python-reviewer.md");
    expect(destinations).toContain(".bbg/harness/agents/python-build-resolver.md");
    expect(destinations).toContain(".bbg/harness/skills/python-patterns/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/python-testing/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/django-patterns/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/fastapi-patterns/SKILL.md");
    expect(destinations).toContain(".bbg/harness/rules/python/coding-style.md");
    expect(destinations).toContain(".bbg/harness/rules/python/security.md");
    expect(destinations).toContain(".bbg/harness/commands/python-review.md");

    // Language-specific symbol map scripts
    expect(destinations).toContain(".bbg/harness/scripts/build-symbol-map-ts.js");
    expect(destinations).toContain(".bbg/harness/scripts/build-symbol-map-python.py");
    expect(destinations).not.toContain(".bbg/harness/scripts/build-symbol-map-java.py");
    expect(destinations).not.toContain(".bbg/harness/scripts/build-symbol-map-go.sh");
    expect(destinations).not.toContain(".bbg/harness/scripts/build-symbol-map-rust.sh");

    // Core files are still present
    expect(destinations).toContain(".bbg/harness/agents/planner.md");
    expect(destinations).toContain(".bbg/harness/skills/coding-standards/SKILL.md");
    expect(destinations).toContain(".bbg/harness/rules/common/coding-style.md");

    // Backend governance files are included for Python FastAPI repo
    expect(destinations).toContain(".bbg/harness/skills/red-team-test/SKILL.md");
    expect(destinations).toContain(".bbg/harness/commands/red-team.md");
    expect(destinations).toContain(".bbg/harness/scripts/red-team-schema.sql");
    expect(destinations).toContain("docs/security/backend-red-team-playbook.md");
    expect(destinations).toContain("docs/reports/red-team-report-TEMPLATE.md");
    expect(destinations).toContain("docs/wiki/reports/red-team-findings-summary.md");

    // Total: 276
    expect(tasks).toHaveLength(276);
  });

  it("includes red team governance files for backend Java project", () => {
    const config = createMinimalConfig({
      repos: [
        makeRepo({
          name: "api",
          gitUrl: "https://github.com/test/api.git",
          type: "backend",
          description: "java api",
          stack: {
            language: "java",
            framework: "spring",
            buildTool: "gradle",
            testFramework: "junit",
            packageManager: "gradle",
          },
        }),
      ],
    });
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);
    const destinations = tasks.map((t) => t.destination);

    expect(destinations).toContain(".bbg/harness/skills/red-team-test/SKILL.md");
    expect(destinations).toContain(".bbg/harness/commands/red-team.md");
    expect(destinations).toContain(".bbg/harness/scripts/red-team-schema.sql");
    expect(destinations).toContain("docs/security/backend-red-team-playbook.md");
    expect(destinations).toContain("docs/reports/red-team-report-TEMPLATE.md");
    expect(destinations).toContain("docs/wiki/reports/red-team-findings-summary.md");

    // Total: core(241) + java(14) + backend(6) = 261
    expect(tasks).toHaveLength(261);
  });

  it("excludes red team governance files for frontend-only project", () => {
    const config = createMinimalConfig({ repos: [makeRepo()] });
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);
    const destinations = tasks.map((t) => t.destination);

    expect(destinations).not.toContain(".bbg/harness/skills/red-team-test/SKILL.md");
    expect(destinations).not.toContain(".bbg/harness/commands/red-team.md");
    expect(destinations).not.toContain(".bbg/harness/scripts/red-team-schema.sql");
    expect(destinations).not.toContain("docs/security/backend-red-team-playbook.md");
    expect(destinations).not.toContain("docs/reports/red-team-report-TEMPLATE.md");
  });

  it("includes red team files for Python FastAPI backend", () => {
    const config = createMinimalConfig({
      repos: [
        makeRepo({
          name: "api",
          gitUrl: "https://github.com/test/api.git",
          type: "backend",
          description: "python api",
          stack: {
            language: "python",
            framework: "fastapi",
            buildTool: "pip",
            testFramework: "pytest",
            packageManager: "pip",
          },
        }),
      ],
    });
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);
    const destinations = tasks.map((t) => t.destination);

    expect(destinations).toContain(".bbg/harness/skills/red-team-test/SKILL.md");
    expect(destinations).toContain(".bbg/harness/commands/red-team.md");
  });

  it("excludes red team files for Python non-web project", () => {
    const config = createMinimalConfig({
      repos: [
        makeRepo({
          name: "ml",
          gitUrl: "https://github.com/test/ml.git",
          type: "other",
          description: "ml pipeline",
          stack: {
            language: "python",
            framework: "pytorch",
            buildTool: "pip",
            testFramework: "pytest",
            packageManager: "pip",
          },
        }),
      ],
    });
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);
    const destinations = tasks.map((t) => t.destination);

    expect(destinations).not.toContain(".bbg/harness/skills/red-team-test/SKILL.md");
    expect(destinations).not.toContain(".bbg/harness/commands/red-team.md");
  });

  it("ensures all task source and destination paths are non-empty strings", () => {
    const config = createMinimalConfig({
      repos: [makeRepo()],
    });
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);

    for (const task of tasks) {
      expect(task.source).toBeTruthy();
      expect(task.destination).toBeTruthy();
      expect(typeof task.source).toBe("string");
      expect(typeof task.destination).toBe("string");
      expect(task.source.length).toBeGreaterThan(0);
      expect(task.destination.length).toBeGreaterThan(0);
    }
  });

  it("uses 'golang' rule directory for Go language repos", () => {
    const config = createMinimalConfig({
      repos: [
        makeRepo({
          name: "svc",
          gitUrl: "https://github.com/test/svc.git",
          type: "backend",
          description: "go service",
          stack: { language: "go", framework: "gin", buildTool: "go", testFramework: "go-test", packageManager: "go" },
        }),
      ],
    });
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);

    const destinations = tasks.map((t) => t.destination);

    // Go rules should use "golang" directory, not "go"
    expect(destinations).toContain(".bbg/harness/rules/golang/coding-style.md");
    expect(destinations).toContain(".bbg/harness/rules/golang/testing.md");
    expect(destinations).toContain(".bbg/harness/rules/golang/patterns.md");
    expect(destinations).toContain(".bbg/harness/rules/golang/security.md");

    // Should NOT have rules/go/ paths
    const goRulePaths = destinations.filter((d) => d.startsWith(".bbg/harness/rules/go/"));
    expect(goRulePaths).toHaveLength(0);

    // Go agents and commands still use "go" (not "golang")
    expect(destinations).toContain(".bbg/harness/agents/go-reviewer.md");
    expect(destinations).toContain(".bbg/harness/agents/go-build-resolver.md");
    expect(destinations).toContain(".bbg/harness/commands/go-review.md");
    expect(destinations).toContain(".bbg/harness/commands/go-test.md");
    expect(destinations).toContain(".bbg/harness/commands/go-build.md");

    // Go skills use "golang" prefix in skill names
    expect(destinations).toContain(".bbg/harness/skills/golang-patterns/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/golang-testing/SKILL.md");
    expect(destinations).toContain(".bbg/harness/skills/gin-patterns/SKILL.md");
  });
});
