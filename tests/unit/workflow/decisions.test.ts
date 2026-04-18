import { describe, expect, it } from "vitest";
import { buildWorkflowDecisions } from "../../../src/workflow/decisions.js";

describe("workflow decisions", () => {
  it("marks debugging tasks as requiring task environments and observation", () => {
    const result = buildWorkflowDecisions("plan", "Fix flaky checkout latency using logs and traces");

    expect(result.taskEnv).toEqual({
      decision: "required",
      reasons: expect.arrayContaining(["debug-or-stabilization-task", "runtime-evidence-expected"]),
    });
    expect(result.observe).toEqual({
      decision: "required",
      reasons: expect.arrayContaining(["runtime-evidence-useful", "debug-investigation"]),
    });
    expect(result.hermesQuery.decision).toBe("recommended");
  });

  it("marks security-sensitive tasks as requiring security review", () => {
    const result = buildWorkflowDecisions("plan", "Add auth token validation to payment webhook handler");

    expect(result.security).toEqual({
      decision: "required",
      reasons: ["security-sensitive-surface"],
    });
    expect(result.tdd.decision).toBe("optional");
  });

  it("marks cross-repo implementation work as requiring task environments, tdd, and hermes context", () => {
    const result = buildWorkflowDecisions(
      "plan",
      "Implement checkout integration across frontend and backend workspace services",
    );

    expect(result.taskEnv).toEqual({
      decision: "required",
      reasons: expect.arrayContaining(["cross-cutting-scope"]),
    });
    expect(result.tdd).toEqual({
      decision: "required",
      reasons: expect.arrayContaining(["change-risk-needs-regression-coverage"]),
    });
    expect(result.hermesQuery).toEqual({
      decision: "recommended",
      reasons: expect.arrayContaining(["architecture-or-integration-context-useful"]),
    });
  });

  it("requires observation for frontend visual verification without forcing runtime logs", () => {
    const result = buildWorkflowDecisions("plan", "Refactor dashboard page layout and validate the visual component states");

    expect(result.observe).toEqual({
      decision: "required",
      reasons: expect.arrayContaining(["frontend-surface-verification"]),
    });
    expect(result.taskEnv.decision).toBe("not-required");
  });
});
