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
  it("generates core governance files for minimal config (no repos)", () => {
    const config = createMinimalConfig();
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);

    // All non-context/policy.json tasks should be copy mode
    const nonContextTasks = tasks.filter(
      (t) => !t.destination.startsWith("contexts/") && t.destination !== ".bbg/policy/policy.json",
    );
    for (const task of nonContextTasks) {
      expect(task.mode).toBe("copy");
    }

    // Core agents: 13
    const agentTasks = tasks.filter((t) => t.destination.startsWith("agents/"));
    expect(agentTasks).toHaveLength(13);
    expect(agentTasks.map((t) => t.destination)).toContain("agents/planner.md");
    expect(agentTasks.map((t) => t.destination)).toContain("agents/devops-reviewer.md");

    // Core + operations skills: 28 + 18 = 46
    const skillTasks = tasks.filter((t) => t.destination.startsWith("skills/"));
    expect(skillTasks).toHaveLength(46);
    expect(skillTasks.map((t) => t.destination)).toContain("skills/coding-standards/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain("skills/agent-orchestration/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain("skills/telemetry-dashboard/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain("skills/deep-interview/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain("skills/eval-regression/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain("skills/policy-enforcement/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain("skills/context-loading/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain("skills/session-memory/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain("skills/workflow-orchestration/SKILL.md");

    // Common rules: 8
    const ruleTasks = tasks.filter((t) => t.destination.startsWith("rules/"));
    expect(ruleTasks).toHaveLength(8);
    expect(ruleTasks.map((t) => t.destination)).toContain("rules/common/coding-style.md");
    expect(ruleTasks.map((t) => t.destination)).toContain("rules/common/agents.md");

    // Core commands: 35
    const commandTasks = tasks.filter((t) => t.destination.startsWith("commands/"));
    expect(commandTasks).toHaveLength(35);
    expect(commandTasks.map((t) => t.destination)).toContain("commands/plan.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/sync.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/telemetry-report.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/interview.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/interview-resume.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/eval-compare.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/policy-check.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/policy-exception.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/context-refresh.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/context-budget.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/workflow-start.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/workflow-resume.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/workflow-status.md");

    // Hooks: 9
    const hookTasks = tasks.filter((t) => t.destination.startsWith("hooks/"));
    expect(hookTasks).toHaveLength(9);
    expect(hookTasks.map((t) => t.destination)).toContain("hooks/hooks.json");
    expect(hookTasks.map((t) => t.destination)).toContain("hooks/scripts/security-scan.js");
    expect(hookTasks.map((t) => t.destination)).toContain("hooks/scripts/telemetry-collector.js");

    // Contexts: 3 (handlebars mode)
    const contextTasks = tasks.filter((t) => t.destination.startsWith("contexts/"));
    expect(contextTasks).toHaveLength(3);
    for (const task of contextTasks) {
      expect(task.mode).toBe("handlebars");
      expect(task.source).toMatch(/^handlebars\/contexts\/.*\.hbs$/);
    }

    // MCP configs: 2
    const mcpTasks = tasks.filter((t) => t.destination.startsWith("mcp-configs/"));
    expect(mcpTasks).toHaveLength(2);

    // Workflow files: 1 SQL + 1 schema + 5 presets = 7
    const workflowTasks = tasks.filter(
      (t) => t.destination.startsWith("workflows/") || t.destination === ".bbg/scripts/workflow-schema.sql",
    );
    expect(workflowTasks).toHaveLength(7);
    expect(workflowTasks.map((t) => t.destination)).toContain(".bbg/scripts/workflow-schema.sql");
    expect(workflowTasks.map((t) => t.destination)).toContain("workflows/schema.json");
    expect(workflowTasks.map((t) => t.destination)).toContain("workflows/presets/tdd-feature.yaml");
    expect(workflowTasks.map((t) => t.destination)).toContain("workflows/presets/bugfix.yaml");
    expect(workflowTasks.map((t) => t.destination)).toContain("workflows/presets/security-audit.yaml");
    expect(workflowTasks.map((t) => t.destination)).toContain("workflows/presets/release-prep.yaml");
    expect(workflowTasks.map((t) => t.destination)).toContain("workflows/presets/full-feature.yaml");

    // Eval golden tasks: 5 (manifest + 4 task files)
    const evalTasks = tasks.filter((t) => t.destination.startsWith("evals/"));
    expect(evalTasks).toHaveLength(5);
    expect(evalTasks.map((t) => t.destination)).toContain("evals/golden-tasks/manifest.json");
    expect(evalTasks.map((t) => t.destination)).toContain("evals/golden-tasks/tasks/simple-bugfix.json");
    expect(evalTasks.map((t) => t.destination)).toContain("evals/golden-tasks/tasks/tdd-feature.json");
    expect(evalTasks.map((t) => t.destination)).toContain("evals/golden-tasks/tasks/security-review.json");
    expect(evalTasks.map((t) => t.destination)).toContain("evals/golden-tasks/tasks/refactor-extract.json");

    // .bbg scripts: telemetry + eval + org + interview + policy + context + workflow
    const bbgScriptTasks = tasks.filter((t) => t.destination.startsWith(".bbg/scripts/"));
    expect(bbgScriptTasks).toHaveLength(9);
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/telemetry-init.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/telemetry-report.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/eval-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/org-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/interview-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/policy-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/build-repo-map.js");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/context-schema.sql");
    expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/workflow-schema.sql");

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
      ".bbg/scripts/org-schema.sql",
    ];
    const orgTasks = tasks.filter((t) => expectedOrgDestinations.includes(t.destination));
    expect(orgTasks).toHaveLength(expectedOrgDestinations.length);
    expect(orgTasks.map((t) => t.destination)).toEqual(expect.arrayContaining(expectedOrgDestinations));

    // Total: 142
    expect(tasks).toHaveLength(142);
  });

  it("includes typescript-specific governance files when typescript repo present", () => {
    const config = createMinimalConfig({
      repos: [makeRepo({ stack: { language: "typescript", framework: "react", buildTool: "vite", testFramework: "vitest", packageManager: "npm" } })],
    });
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);

    const destinations = tasks.map((t) => t.destination);

    // TypeScript agents: typescript-reviewer, typescript-build-resolver
    expect(destinations).toContain("agents/typescript-reviewer.md");
    expect(destinations).toContain("agents/typescript-build-resolver.md");

    // TypeScript skills: typescript-patterns, react-patterns, nextjs-patterns, vue-patterns
    expect(destinations).toContain("skills/typescript-patterns/SKILL.md");
    expect(destinations).toContain("skills/react-patterns/SKILL.md");
    expect(destinations).toContain("skills/nextjs-patterns/SKILL.md");
    expect(destinations).toContain("skills/vue-patterns/SKILL.md");

    // TypeScript rules: coding-style, testing, react, node, security
    expect(destinations).toContain("rules/typescript/coding-style.md");
    expect(destinations).toContain("rules/typescript/testing.md");
    expect(destinations).toContain("rules/typescript/react.md");
    expect(destinations).toContain("rules/typescript/node.md");
    expect(destinations).toContain("rules/typescript/security.md");

    // TypeScript commands: ts-review, ts-build, ts-test
    expect(destinations).toContain("commands/ts-review.md");
    expect(destinations).toContain("commands/ts-build.md");
    expect(destinations).toContain("commands/ts-test.md");

    // TypeScript symbol map script
    expect(destinations).toContain(".bbg/scripts/build-symbol-map-ts.js");
    expect(destinations).not.toContain(".bbg/scripts/build-symbol-map-python.py");

    // Total: 157
    expect(tasks).toHaveLength(157);
  });

  it("includes files for multiple languages (python + typescript)", () => {
    const config = createMinimalConfig({
      repos: [
        makeRepo({
          name: "web",
          type: "frontend-web",
          stack: { language: "typescript", framework: "react", buildTool: "vite", testFramework: "vitest", packageManager: "npm" },
        }),
        makeRepo({
          name: "api",
          gitUrl: "https://github.com/test/api.git",
          type: "backend",
          description: "api server",
          stack: { language: "python", framework: "fastapi", buildTool: "pip", testFramework: "pytest", packageManager: "pip" },
        }),
      ],
    });
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);

    const destinations = tasks.map((t) => t.destination);

    // TypeScript-specific files
    expect(destinations).toContain("agents/typescript-reviewer.md");
    expect(destinations).toContain("skills/typescript-patterns/SKILL.md");
    expect(destinations).toContain("rules/typescript/coding-style.md");
    expect(destinations).toContain("commands/ts-review.md");

    // Python-specific files
    expect(destinations).toContain("agents/python-reviewer.md");
    expect(destinations).toContain("agents/python-build-resolver.md");
    expect(destinations).toContain("skills/python-patterns/SKILL.md");
    expect(destinations).toContain("skills/python-testing/SKILL.md");
    expect(destinations).toContain("skills/django-patterns/SKILL.md");
    expect(destinations).toContain("skills/fastapi-patterns/SKILL.md");
    expect(destinations).toContain("rules/python/coding-style.md");
    expect(destinations).toContain("rules/python/security.md");
    expect(destinations).toContain("commands/python-review.md");

    // Language-specific symbol map scripts
    expect(destinations).toContain(".bbg/scripts/build-symbol-map-ts.js");
    expect(destinations).toContain(".bbg/scripts/build-symbol-map-python.py");
    expect(destinations).not.toContain(".bbg/scripts/build-symbol-map-java.py");
    expect(destinations).not.toContain(".bbg/scripts/build-symbol-map-go.sh");
    expect(destinations).not.toContain(".bbg/scripts/build-symbol-map-rust.sh");

    // Core files are still present
    expect(destinations).toContain("agents/planner.md");
    expect(destinations).toContain("skills/coding-standards/SKILL.md");
    expect(destinations).toContain("rules/common/coding-style.md");

    // Backend governance files are included for Python FastAPI repo
    expect(destinations).toContain("skills/red-team-test/SKILL.md");
    expect(destinations).toContain("commands/red-team.md");
    expect(destinations).toContain(".bbg/scripts/red-team-schema.sql");
    expect(destinations).toContain("docs/security/backend-red-team-playbook.md");
    expect(destinations).toContain("docs/reports/red-team-report-TEMPLATE.md");

    // Total: 176
    expect(tasks).toHaveLength(176);
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

    expect(destinations).toContain("skills/red-team-test/SKILL.md");
    expect(destinations).toContain("commands/red-team.md");
    expect(destinations).toContain(".bbg/scripts/red-team-schema.sql");
    expect(destinations).toContain("docs/security/backend-red-team-playbook.md");
    expect(destinations).toContain("docs/reports/red-team-report-TEMPLATE.md");

    // Total: core(142) + java(14) + backend(5) = 161
    expect(tasks).toHaveLength(161);
  });

  it("excludes red team governance files for frontend-only project", () => {
    const config = createMinimalConfig({ repos: [makeRepo()] });
    const ctx = buildTemplateContext(config);
    const tasks = buildGovernanceManifest(ctx);
    const destinations = tasks.map((t) => t.destination);

    expect(destinations).not.toContain("skills/red-team-test/SKILL.md");
    expect(destinations).not.toContain("commands/red-team.md");
    expect(destinations).not.toContain(".bbg/scripts/red-team-schema.sql");
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

    expect(destinations).toContain("skills/red-team-test/SKILL.md");
    expect(destinations).toContain("commands/red-team.md");
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

    expect(destinations).not.toContain("skills/red-team-test/SKILL.md");
    expect(destinations).not.toContain("commands/red-team.md");
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
    expect(destinations).toContain("rules/golang/coding-style.md");
    expect(destinations).toContain("rules/golang/testing.md");
    expect(destinations).toContain("rules/golang/patterns.md");
    expect(destinations).toContain("rules/golang/security.md");

    // Should NOT have rules/go/ paths
    const goRulePaths = destinations.filter((d) => d.startsWith("rules/go/"));
    expect(goRulePaths).toHaveLength(0);

    // Go agents and commands still use "go" (not "golang")
    expect(destinations).toContain("agents/go-reviewer.md");
    expect(destinations).toContain("agents/go-build-resolver.md");
    expect(destinations).toContain("commands/go-review.md");
    expect(destinations).toContain("commands/go-test.md");
    expect(destinations).toContain("commands/go-build.md");

    // Go skills use "golang" prefix in skill names
    expect(destinations).toContain("skills/golang-patterns/SKILL.md");
    expect(destinations).toContain("skills/golang-testing/SKILL.md");
    expect(destinations).toContain("skills/gin-patterns/SKILL.md");
  });
});
