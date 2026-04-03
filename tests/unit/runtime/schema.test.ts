import { describe, expect, it } from "vitest";
import { resolveRuntimePaths } from "../../../src/runtime/paths.js";
import {
  buildDefaultRuntimeConfig,
  createDefaultRepoMap,
  createDefaultSessionHistory,
} from "../../../src/runtime/schema.js";

describe("runtime schema", () => {
  it("builds default runtime config with human-readable json paths", () => {
    expect(buildDefaultRuntimeConfig()).toEqual({
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
    });
  });

  it("creates an empty session history document", () => {
    expect(createDefaultSessionHistory()).toEqual({
      version: 1,
      sessions: [],
    });
  });

  it("creates an empty repo map document", () => {
    expect(createDefaultRepoMap()).toEqual({
      version: 1,
      repos: [],
    });
  });

  it("rejects runtime paths that escape the workspace", () => {
    const runtime = buildDefaultRuntimeConfig();

    expect(() =>
      resolveRuntimePaths("/workspace", {
        ...runtime,
        telemetry: {
          ...runtime.telemetry,
          file: ".bbg/../telemetry/events.json",
        },
      }),
    ).toThrow("Invalid runtime path");
  });
});
