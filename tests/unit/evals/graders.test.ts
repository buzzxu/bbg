import { describe, expect, it } from "vitest";
import { gradeDeterministicResult } from "../../../src/evals/graders.js";

describe("eval graders", () => {
  it("reports nested object mismatches and missing array values", () => {
    expect(gradeDeterministicResult(
      {
        ok: true,
        details: {
          changedFiles: ["README.md"],
          checkpointName: "baseline",
        },
      },
      {
        ok: false,
        details: {
          checkpointName: undefined,
        },
      },
    )).toEqual({
      passed: false,
      failures: [
        "ok expected true but received false",
        'details.changedFiles expected ["README.md"] but received undefined',
        'details.checkpointName expected "baseline" but received undefined',
      ],
    });
  });
});
