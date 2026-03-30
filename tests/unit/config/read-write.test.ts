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
});
