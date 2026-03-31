import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BbgConfig } from "../../../src/config/schema.js";
import { buildTemplateContext } from "../../../src/templates/context.js";
import { renderProjectTemplates } from "../../../src/templates/render.js";
import { BbgTemplateError } from "../../../src/utils/errors.js";

function createConfig(): BbgConfig {
  return {
    version: "0.1.0",
    projectName: "demo",
    projectDescription: "demo project",
    createdAt: "2026-03-29T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
    repos: [
      {
        name: "poster-project",
        gitUrl: "git@example.com:poster-project.git",
        branch: "main",
        type: "backend",
        stack: {
          language: "java",
          framework: "spring-boot",
          buildTool: "maven",
          testFramework: "junit",
          packageManager: "maven",
        },
        description: "backend",
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
  };
}

const createdDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dirPath = mkdtempSync(join(tmpdir(), prefix));
  createdDirs.push(dirPath);
  return dirPath;
}

afterEach(() => {
  for (const dirPath of createdDirs.splice(0)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
  vi.useRealTimers();
});

describe("renderProjectTemplates", () => {
  it("prefers .bbg/templates override and writes rendered outputs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T10:11:12.000Z"));

    const workspaceRoot = createTempDir("bbg-render-workspace-");
    const builtinTemplatesRoot = createTempDir("bbg-render-builtin-");

    mkdirSync(join(workspaceRoot, ".bbg/templates/handlebars"), { recursive: true });
    mkdirSync(join(builtinTemplatesRoot, "handlebars"), { recursive: true });

    writeFileSync(
      join(workspaceRoot, ".bbg/templates/handlebars/README.md.hbs"),
      "OVERRIDE {{projectName}} -> {{join allRepoNames ', '}}",
      "utf8",
    );
    writeFileSync(
      join(builtinTemplatesRoot, "handlebars/README.md.hbs"),
      "BUILTIN {{projectName}}",
      "utf8",
    );
    writeFileSync(
      join(builtinTemplatesRoot, "handlebars/AGENTS.md.hbs"),
      [
        "{{#if-eq projectName 'demo'}}EQUAL{{/if-eq}}",
        "{{#if-includes languages 'java'}}HAS-JAVA{{/if-includes}}",
        "{{date 'YYYY-MM-DD'}}",
        "{{risk-table riskThresholds}}",
        "{{indent 2 'line1\\nline2'}}",
      ].join("\n"),
      "utf8",
    );

    const context = buildTemplateContext(createConfig());

    const writtenFiles = await renderProjectTemplates({
      workspaceRoot,
      builtinTemplatesRoot,
      context,
      templates: [
        {
          source: "handlebars/README.md.hbs",
          destination: "README.md",
          mode: "handlebars",
        },
        {
          source: "handlebars/AGENTS.md.hbs",
          destination: "AGENTS.md",
          mode: "handlebars",
        },
      ],
    });

    expect(writtenFiles).toEqual([
      join(workspaceRoot, "README.md"),
      join(workspaceRoot, "AGENTS.md"),
    ]);

    const readmeContent = readFileSync(join(workspaceRoot, "README.md"), "utf8");
    expect(readmeContent).toContain("OVERRIDE demo -> poster-project");

    const agentsContent = readFileSync(join(workspaceRoot, "AGENTS.md"), "utf8");
    expect(agentsContent).toContain("EQUAL");
    expect(agentsContent).toContain("HAS-JAVA");
    expect(agentsContent).toContain("2026-03-29");
    expect(agentsContent).toContain("| high | A+ | 99 |");
    expect(agentsContent).toContain("  line1");
    expect(agentsContent).toContain("  line2");
  });


  it("rejects absolute or escaping template source and destination paths", async () => {
    const workspaceRoot = createTempDir("bbg-render-path-guard-workspace-");
    const builtinTemplatesRoot = createTempDir("bbg-render-path-guard-builtin-");
    const context = buildTemplateContext(createConfig());

    mkdirSync(join(builtinTemplatesRoot, "safe"), { recursive: true });
    writeFileSync(join(builtinTemplatesRoot, "safe/template.md"), "safe", "utf8");

    await expect(
      renderProjectTemplates({
        workspaceRoot,
        builtinTemplatesRoot,
        context,
        templates: [
          {
            source: "/etc/passwd",
            destination: "docs/abs-source.md",
            mode: "copy",
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "TEMPLATE_PATH_INVALID",
    });

    await expect(
      renderProjectTemplates({
        workspaceRoot,
        builtinTemplatesRoot,
        context,
        templates: [
          {
            source: "../escape.md",
            destination: "docs/escape-source.md",
            mode: "copy",
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "TEMPLATE_PATH_INVALID",
    });

    await expect(
      renderProjectTemplates({
        workspaceRoot,
        builtinTemplatesRoot,
        context,
        templates: [
          {
            source: "safe/template.md",
            destination: "/tmp/abs-destination.md",
            mode: "copy",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BbgTemplateError);

    await expect(
      renderProjectTemplates({
        workspaceRoot,
        builtinTemplatesRoot,
        context,
        templates: [
          {
            source: "safe/template.md",
            destination: "../escape-destination.md",
            mode: "copy",
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "TEMPLATE_PATH_INVALID",
    });
  });
});
