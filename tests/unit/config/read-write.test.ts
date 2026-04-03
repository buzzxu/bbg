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
