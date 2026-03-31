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

    // All tasks should be copy mode
    for (const task of tasks) {
      expect(task.mode).toBe("copy");
    }

    // Core agents: 13
    const agentTasks = tasks.filter((t) => t.destination.startsWith("agents/"));
    expect(agentTasks).toHaveLength(13);
    expect(agentTasks.map((t) => t.destination)).toContain("agents/planner.md");
    expect(agentTasks.map((t) => t.destination)).toContain("agents/devops-reviewer.md");

    // Core + operations skills: 20 + 16 = 36
    const skillTasks = tasks.filter((t) => t.destination.startsWith("skills/"));
    expect(skillTasks).toHaveLength(36);
    expect(skillTasks.map((t) => t.destination)).toContain("skills/coding-standards/SKILL.md");
    expect(skillTasks.map((t) => t.destination)).toContain("skills/agent-orchestration/SKILL.md");

    // Common rules: 8
    const ruleTasks = tasks.filter((t) => t.destination.startsWith("rules/"));
    expect(ruleTasks).toHaveLength(8);
    expect(ruleTasks.map((t) => t.destination)).toContain("rules/common/coding-style.md");
    expect(ruleTasks.map((t) => t.destination)).toContain("rules/common/agents.md");

    // Core commands: 24
    const commandTasks = tasks.filter((t) => t.destination.startsWith("commands/"));
    expect(commandTasks).toHaveLength(24);
    expect(commandTasks.map((t) => t.destination)).toContain("commands/plan.md");
    expect(commandTasks.map((t) => t.destination)).toContain("commands/sync.md");

    // Hooks: 8
    const hookTasks = tasks.filter((t) => t.destination.startsWith("hooks/"));
    expect(hookTasks).toHaveLength(8);
    expect(hookTasks.map((t) => t.destination)).toContain("hooks/hooks.json");
    expect(hookTasks.map((t) => t.destination)).toContain("hooks/scripts/security-scan.js");

    // Contexts: 3
    const contextTasks = tasks.filter((t) => t.destination.startsWith("contexts/"));
    expect(contextTasks).toHaveLength(3);

    // MCP configs: 2
    const mcpTasks = tasks.filter((t) => t.destination.startsWith("mcp-configs/"));
    expect(mcpTasks).toHaveLength(2);

    // Total: 13 + 36 + 8 + 24 + 8 + 3 + 2 = 94
    expect(tasks).toHaveLength(94);
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

    // TypeScript commands: ts-review
    expect(destinations).toContain("commands/ts-review.md");

    // Total: 94 core + 2 agents + 4 skills + 5 rules + 1 command = 106
    expect(tasks).toHaveLength(106);
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

    // Core files are still present
    expect(destinations).toContain("agents/planner.md");
    expect(destinations).toContain("skills/coding-standards/SKILL.md");
    expect(destinations).toContain("rules/common/coding-style.md");

    // 94 core + TS(2+4+5+1) + Python(2+4+4+1) = 94 + 12 + 11 = 117
    expect(tasks).toHaveLength(117);
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
