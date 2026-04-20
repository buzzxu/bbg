import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runModelRouteCommand } from "../../src/commands/model-route.js";
import { serializeConfig } from "../../src/config/read-write.js";
import { buildDefaultRuntimeConfig } from "../../src/runtime/schema.js";
import { writeTextFile } from "../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-model-route-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  const runtime = buildDefaultRuntimeConfig();
  await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
    version: "0.1.0",
    projectName: "bbg-project",
    projectDescription: "model route command test",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    repos: [
      {
        name: "service-java",
        gitUrl: "https://example.com/service-java.git",
        branch: "main",
        type: "backend",
        description: "java service",
        stack: {
          language: "java",
          framework: "spring",
          buildTool: "gradle",
          testFramework: "junit",
          packageManager: "gradle",
          languageVersion: "21",
          frameworkVersion: "3.5.0",
        },
      },
      {
        name: "web-ts",
        gitUrl: "https://example.com/web-ts.git",
        branch: "main",
        type: "frontend-web",
        description: "typescript frontend",
        stack: {
          language: "typescript",
          framework: "nextjs",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
          languageVersion: "5.8.2",
          frameworkVersion: "15.2.0",
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
    runtime: {
      ...runtime,
      telemetry: {
        ...runtime.telemetry,
        enabled: true,
      },
    },
  }));
  await writeTextFile(
    join(cwd, "docs", "architecture", "languages", "java", "application-patterns.md"),
    "# Java Application Patterns\n",
  );
  await writeTextFile(
    join(cwd, "docs", "architecture", "languages", "typescript", "application-patterns.md"),
    "# TypeScript Application Patterns\n",
  );
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("model-route command", () => {
  it("uses local telemetry feedback while returning only generic model classes", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "telemetry", "events.json"),
      `${JSON.stringify({
        version: 1,
        events: [
          {
            type: "runtime.command.completed",
            timestamp: "2026-04-01T00:00:00.000Z",
            details: { command: "quality-gate", ok: false },
          },
          {
            type: "runtime.command.completed",
            timestamp: "2026-04-01T00:01:00.000Z",
            details: { command: "quality-gate", ok: false },
          },
        ],
      }, null, 2)}\n`,
    );

    const result = await runModelRouteCommand({
      cwd,
      task: "Fix a failing quality-gate lint regression",
    });

    expect(result.mode).toBe("recommendation");
    if (result.mode !== "recommendation") {
      throw new Error("Expected recommendation mode result.");
    }
    const recommendation = result.recommendation;
    if (!recommendation) {
      throw new Error("Expected recommendation details.");
    }
    expect(result.classification).toEqual(expect.objectContaining({
      targetCommand: "quality-gate",
      domain: "debugging",
    }));
    expect(recommendation).toEqual(expect.objectContaining({
      profileClass: "premium",
      telemetryNote: expect.stringContaining("Escalated from local telemetry"),
    }));
    expect(["fast", "balanced", "premium"]).toContain(recommendation.profileClass);

    const telemetry = JSON.parse(await readFile(join(cwd, ".bbg", "telemetry", "events.json"), "utf8")) as {
      events: Array<{ type: string; details: { profileClass?: string } }>;
    };
    expect(telemetry.events.at(-1)).toEqual(expect.objectContaining({
      type: "model-route.recommended",
      details: expect.objectContaining({ profileClass: "premium" }),
    }));
  });

  it("falls back cleanly when telemetry data is corrupted", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "telemetry", "events.json"),
      '{\n  "version": 1,\n  "events": {}\n}\n',
    );

    const result = await runModelRouteCommand({
      cwd,
      task: "Investigate a failing quality gate regression",
    });

    expect(result.mode).toBe("recommendation");
    expect(result.classification).toEqual(expect.objectContaining({
      targetCommand: "quality-gate",
    }));
    expect(result.recommendation).toEqual(expect.objectContaining({
      telemetryNote: expect.stringContaining("Telemetry feedback unavailable"),
    }));
  });

  it("falls back cleanly when telemetry events contain malformed members", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "telemetry", "events.json"),
      `${JSON.stringify({
        version: 1,
        events: [
          {
            type: "runtime.command.completed",
            timestamp: "2026-04-01T00:00:00.000Z",
            details: { command: "quality-gate", ok: false },
          },
          null,
        ],
      }, null, 2)}\n`,
    );

    const result = await runModelRouteCommand({
      cwd,
      task: "Investigate a failing quality gate regression",
    });

    expect(result.mode).toBe("recommendation");
    expect(result.recommendation).toEqual(expect.objectContaining({
      telemetryNote: expect.stringContaining("Telemetry feedback unavailable"),
    }));
  });

  it("ignores telemetry append failures while still returning a recommendation", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    vi.resetModules();
    vi.doMock("../../src/runtime/telemetry.js", async () => {
      const actual = await vi.importActual<typeof import("../../src/runtime/telemetry.js")>("../../src/runtime/telemetry.js");
      return {
        ...actual,
        appendTelemetryEvent: vi.fn(async () => {
          throw new Error("disk full");
        }),
      };
    });

    const { runModelRouteCommand: runWithAppendFailure } = await import("../../src/commands/model-route.js");
    const result = await runWithAppendFailure({
      cwd,
      task: "Ship a harness audit follow-up",
    });

    expect(result.mode).toBe("recommendation");
    expect(result.classification).toEqual(expect.objectContaining({
      targetCommand: "harness-audit",
    }));

    vi.doUnmock("../../src/runtime/telemetry.js");
    vi.resetModules();
  });

  it("detects generic command phrases that omit hyphens", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runModelRouteCommand({
      cwd,
      task: "Run the quality gate before the harness audit review",
    });

    expect(result.classification).toEqual(expect.objectContaining({
      targetCommand: "quality-gate",
      domain: "review",
    }));
  });

  it("surfaces language-aware reviewers and guides for language-specific tasks", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runModelRouteCommand({
      cwd,
      task: "Review the Java transaction boundary change before implementation",
    });

    expect(result.mode).toBe("recommendation");
    if (result.mode !== "recommendation") {
      throw new Error("Expected recommendation mode result.");
    }
    expect(result.classification).toEqual(expect.objectContaining({
      languages: ["java"],
      domain: "review",
    }));
    expect(result.recommendation).toEqual(expect.objectContaining({
      profileClass: "premium",
      reviewerAgents: ["java-reviewer"],
      guideReferences: ["docs/architecture/languages/java/application-patterns.md"],
    }));
  });

  it("lists model classes without requiring an initialized workspace", async () => {
    const cwd = await makeTempDir();

    const result = await runModelRouteCommand({
      cwd,
      list: true,
    });

    expect(result).toEqual({
      mode: "list",
      profiles: expect.arrayContaining([
        expect.objectContaining({ profileClass: "fast" }),
        expect.objectContaining({ profileClass: "balanced" }),
        expect.objectContaining({ profileClass: "premium" }),
      ]),
    });
  });
});
