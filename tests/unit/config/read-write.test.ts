import { describe, expect, it } from "vitest";
import type { BbgConfig } from "../../../src/config/schema.js";
import {
  ConfigParseError,
  ConfigValidationError,
  parseConfig,
  serializeConfig,
} from "../../../src/config/read-write.js";

const sampleConfig: BbgConfig = {
  version: "0.1.0",
  projectName: "demo",
  projectDescription: "demo project",
  createdAt: "2026-03-29T00:00:00.000Z",
  updatedAt: "2026-03-29T00:00:00.000Z",
  repos: [
    {
      name: "poster-project",
      gitUrl: "https://example.com/poster-project.git",
      branch: "main",
      type: "backend",
      stack: {
        language: "TypeScript",
        framework: "Fastify",
        buildTool: "tsup",
        testFramework: "vitest",
        packageManager: "npm",
      },
      description: "backend service",
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
  context: {
    owner: {
      name: "ops",
      team: "platform",
    },
  },
  runtime: {
    telemetry: {
      enabled: false,
      file: ".bbg/telemetry/events.json",
    },
    evaluation: {
      enabled: true,
      file: ".bbg/evaluations/history.json",
    },
    policy: {
      enabled: true,
      file: ".bbg/policy/decisions.json",
    },
    context: {
      enabled: true,
      repoMapFile: ".bbg/context/repo-map.json",
      sessionHistoryFile: ".bbg/sessions/history.json",
    },
    autonomy: {
      maxAttempts: 5,
      maxVerifyFailures: 3,
      maxDurationMs: 3600000,
    },
  },
};

const sampleConfigWithKnowledge: BbgConfig = {
  ...sampleConfig,
  knowledge: {
    enabled: true,
    databaseFile: ".bbg/knowledge.db",
    sourceRoot: "docs/raw",
    wikiRoot: "docs/wiki",
  },
};

const sampleConfigWithAgentRunner: BbgConfig = {
  ...sampleConfig,
  agentRunner: {
    defaultTool: "claude",
    tools: {
      claude: {
        type: "cli",
        command: "claude",
        args: ["resume", "{taskId}"],
        detached: true,
        env: {
          BBG_HANDOFF_PATH: "{handoffPath}",
        },
      },
    },
  },
};

describe("config read-write", () => {
  it("round-trips config with deep equality", () => {
    const raw = serializeConfig(sampleConfig);

    expect(parseConfig(raw)).toEqual(sampleConfig);
  });

  it("always serializes with a trailing newline", () => {
    const raw = serializeConfig(sampleConfig);

    expect(raw.endsWith("\n")).toBe(true);
  });

  it("round-trips config with optional knowledge settings", () => {
    const raw = serializeConfig(sampleConfigWithKnowledge);

    expect(parseConfig(raw)).toEqual(sampleConfigWithKnowledge);
  });

  it("round-trips config with Hermes knowledge settings", () => {
    const configWithHermes: BbgConfig = {
      ...sampleConfigWithKnowledge,
      knowledge: {
        ...sampleConfigWithKnowledge.knowledge,
        hermes: {
          enabled: true,
          runsRoot: ".bbg/hermes/runs",
          evaluationsRoot: ".bbg/hermes/evaluations",
          candidatesRoot: ".bbg/hermes/candidates",
        },
      },
    };

    const raw = serializeConfig(configWithHermes);

    expect(parseConfig(raw)).toEqual(configWithHermes);
  });

  it("round-trips config with agent runner settings", () => {
    const raw = serializeConfig(sampleConfigWithAgentRunner);

    expect(parseConfig(raw)).toEqual(sampleConfigWithAgentRunner);
  });

  it("throws ConfigParseError for invalid JSON", () => {
    expect(() => parseConfig("not-json")).toThrow(ConfigParseError);
    expect(() => parseConfig("not-json")).not.toThrow(ConfigValidationError);
  });

  it("throws ConfigValidationError for invalid structure", () => {
    const invalidShape = JSON.stringify({
      ...sampleConfig,
      projectName: 123,
    });

    expect(() => parseConfig(invalidShape)).toThrow(ConfigValidationError);
    expect(() => parseConfig(invalidShape)).not.toThrow(ConfigParseError);
  });

  it("throws ConfigValidationError for invalid runtime structure", () => {
    const invalidShape = JSON.stringify({
      ...sampleConfig,
      runtime: {
        ...sampleConfig.runtime,
        context: {
          ...sampleConfig.runtime?.context,
          repoMapFile: 123,
        },
      },
    });

    expect(() => parseConfig(invalidShape)).toThrow(ConfigValidationError);
  });

  it("throws ConfigValidationError for invalid knowledge structure", () => {
    const invalidShape = JSON.stringify({
      ...sampleConfig,
      knowledge: {
        enabled: true,
        databaseFile: 123,
      },
    });

    expect(() => parseConfig(invalidShape)).toThrow(ConfigValidationError);
  });

  it("throws ConfigValidationError for knowledge paths outside allowed roots", () => {
    const invalidDatabasePath = JSON.stringify({
      ...sampleConfig,
      knowledge: {
        enabled: true,
        databaseFile: "../knowledge.db",
      },
    });

    const invalidAbsoluteDatabasePath = JSON.stringify({
      ...sampleConfig,
      knowledge: {
        enabled: true,
        databaseFile: "/tmp/knowledge.db",
      },
    });

    const invalidSourceRoot = JSON.stringify({
      ...sampleConfig,
      knowledge: {
        enabled: true,
        sourceRoot: "../docs/raw",
      },
    });

    const invalidWikiRoot = JSON.stringify({
      ...sampleConfig,
      knowledge: {
        enabled: true,
        wikiRoot: "/tmp/wiki",
      },
    });

    expect(() => parseConfig(invalidDatabasePath)).toThrow(ConfigValidationError);
    expect(() => parseConfig(invalidAbsoluteDatabasePath)).toThrow(ConfigValidationError);
    expect(() => parseConfig(invalidSourceRoot)).toThrow(ConfigValidationError);
    expect(() => parseConfig(invalidWikiRoot)).toThrow(ConfigValidationError);
  });

  it("throws ConfigValidationError for Hermes paths outside allowed roots", () => {
    const invalidShape = JSON.stringify({
      ...sampleConfigWithKnowledge,
      knowledge: {
        ...sampleConfigWithKnowledge.knowledge,
        hermes: {
          enabled: true,
          runsRoot: "../runs",
          evaluationsRoot: "/tmp/evals",
          candidatesRoot: ".bbg/hermes/candidates",
        },
      },
    });

    expect(() => parseConfig(invalidShape)).toThrow(ConfigValidationError);
  });

  it("throws ConfigValidationError for invalid agent runner structure", () => {
    const invalidShape = JSON.stringify({
      ...sampleConfig,
      agentRunner: {
        defaultTool: "claude",
        tools: {
          claude: {
            command: "",
            args: ["resume"],
          },
        },
      },
    });

    expect(() => parseConfig(invalidShape)).toThrow(ConfigValidationError);
  });

  it("throws ConfigValidationError for runtime paths outside .bbg", () => {
    const invalidShape = JSON.stringify({
      ...sampleConfig,
      runtime: {
        ...sampleConfig.runtime,
        telemetry: {
          ...sampleConfig.runtime?.telemetry,
          file: "../telemetry.json",
        },
      },
    });

    expect(() => parseConfig(invalidShape)).toThrow(ConfigValidationError);
  });

  it("throws ConfigValidationError for runtime paths not rooted under .bbg", () => {
    const invalidShape = JSON.stringify({
      ...sampleConfig,
      runtime: {
        ...sampleConfig.runtime,
        context: {
          ...sampleConfig.runtime?.context,
          repoMapFile: "runtime/repo-map.json",
        },
      },
    });

    expect(() => parseConfig(invalidShape)).toThrow(ConfigValidationError);
  });

  it("throws ConfigValidationError for runtime command cwd values outside the workspace root", () => {
    const invalidTraversal = JSON.stringify({
      ...sampleConfig,
      runtime: {
        ...sampleConfig.runtime,
        commands: {
          build: {
            command: "npm",
            args: ["run", "build"],
            cwd: "../escape",
          },
        },
      },
    });

    const invalidAbsolute = JSON.stringify({
      ...sampleConfig,
      runtime: {
        ...sampleConfig.runtime,
        commands: {
          build: {
            command: "npm",
            args: ["run", "build"],
            cwd: "/tmp/escape",
          },
        },
      },
    });

    expect(() => parseConfig(invalidTraversal)).toThrow(ConfigValidationError);
    expect(() => parseConfig(invalidAbsolute)).toThrow(ConfigValidationError);
  });

  it("throws ConfigValidationError for repo names with path traversal", () => {
    const invalidShape = JSON.stringify({
      ...sampleConfig,
      repos: [
        {
          ...sampleConfig.repos[0],
          name: "../escape",
        },
      ],
    });

    expect(() => parseConfig(invalidShape)).toThrow(ConfigValidationError);
  });
});
