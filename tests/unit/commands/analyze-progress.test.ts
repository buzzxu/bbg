import { describe, expect, it } from "vitest";
import { formatAnalyzeProgressEvent, resolveAnalyzeProgressStyle } from "../../../src/commands/analyze-progress.js";

describe("analyze progress formatter", () => {
  const event = {
    version: 1 as const,
    runId: "run-1",
    updatedAt: "2026-04-24T00:00:00.000Z",
    phase: "ai-analysis" as const,
    status: "pending" as const,
    phaseIndex: 13,
    totalPhases: 20,
    progressPercent: 60,
    message: "Waiting for AI deep analysis response.",
    details: ["response=.bbg/analyze/ai/response.json"],
    nextAction: "Write .bbg/analyze/ai/response.json",
  };

  it("formats a TUI-style progress card by default", () => {
    const formatted = formatAnalyzeProgressEvent(event, { width: 72 });

    expect(formatted).toContain("BBG Analyze run-1");
    expect(formatted).toContain("WAIT     60%  [13/20]  ai-analysis");
    expect(formatted).toContain("Waiting for AI deep analysis response.");
    expect(formatted).toContain("info  response=.bbg/analyze/ai/response.json");
    expect(formatted).toContain("next  Write .bbg/analyze/ai/response.json");
  });

  it("formats AI-friendly progress lines with a stable text bar", () => {
    const formatted = formatAnalyzeProgressEvent(event, { style: "plain" });

    expect(formatted).toContain("[==============----------]  60%  [13/20] ai-analysis WAIT");
    expect(formatted).toContain("Waiting for AI deep analysis response.");
    expect(formatted).toContain("response=.bbg/analyze/ai/response.json");
    expect(formatted).toContain("next: Write .bbg/analyze/ai/response.json");
  });
});

describe("analyze progress style resolver", () => {
  it("uses AI-friendly plain progress for captured AI agent sessions by default", () => {
    expect(
      resolveAnalyzeProgressStyle({
        requested: "auto",
        currentTool: "codex",
        stdoutIsTTY: false,
      }),
    ).toBe("plain");
  });

  it("uses TUI progress for a real terminal when no AI agent is driving the run", () => {
    expect(
      resolveAnalyzeProgressStyle({
        requested: "auto",
        currentTool: null,
        stdoutIsTTY: true,
      }),
    ).toBe("tui");
  });

  it("respects explicit progress display choices", () => {
    expect(resolveAnalyzeProgressStyle({ requested: "plain", currentTool: "codex", stdoutIsTTY: true })).toBe("plain");
    expect(resolveAnalyzeProgressStyle({ requested: "tui", currentTool: "codex", stdoutIsTTY: false })).toBe("tui");
    expect(resolveAnalyzeProgressStyle({ requested: "silent", currentTool: "codex", stdoutIsTTY: true })).toBe("silent");
  });

  it("rejects unsupported progress display modes", () => {
    expect(() =>
      resolveAnalyzeProgressStyle({
        requested: "animated",
        currentTool: "codex",
        stdoutIsTTY: true,
      }),
    ).toThrow("Unsupported analyze progress mode");
  });
});
