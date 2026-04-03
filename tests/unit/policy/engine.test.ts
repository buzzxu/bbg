import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertPolicyAllowsCommand, evaluatePolicy, getPolicyCoverageReport } from "../../../src/policy/engine.js";
import { buildDefaultRuntimeConfig } from "../../../src/runtime/schema.js";
import { writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-policy-engine-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("policy engine", () => {
  it("creates and returns the default decision when no policy file exists", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();

    const decision = await evaluatePolicy({ cwd, runtime, command: "quality-gate" });

    expect(decision).toEqual({
      allowed: true,
      requiredApproval: false,
      reason: "Allowed by local default policy.",
    });

    expect(JSON.parse(await readFile(join(cwd, ".bbg", "policy", "decisions.json"), "utf8"))).toEqual({
      version: 1,
      provenance: {
        source: "generated",
      },
      commands: {
        "quality-gate": {
          allowed: true,
          requiredApproval: false,
          reason: "Allowed by local default policy.",
        },
        checkpoint: {
          allowed: true,
          requiredApproval: false,
          reason: "Allowed by local default policy.",
        },
        verify: {
          allowed: true,
          requiredApproval: false,
          reason: "Allowed by local default policy.",
        },
        "harness-audit": {
          allowed: true,
          requiredApproval: false,
          reason: "Allowed by local default policy.",
        },
      },
    });
  });

  it("returns explicit command guardrails from the local policy file", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(
      join(cwd, ".bbg", "policy", "decisions.json"),
      `${JSON.stringify({
        version: 1,
        commands: {
          verify: {
            allowed: true,
            requiredApproval: true,
            reason: "Release manager approval required.",
          },
        },
      }, null, 2)}\n`,
    );

    const decision = await evaluatePolicy({ cwd, runtime, command: "verify" });

    expect(decision).toEqual({
      allowed: true,
      requiredApproval: true,
      reason: "Release manager approval required.",
    });
  });

  it("rejects commands that require approval", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(
      join(cwd, ".bbg", "policy", "decisions.json"),
      `${JSON.stringify({
        version: 1,
        commands: {
          verify: {
            allowed: true,
            requiredApproval: true,
            reason: "Release manager approval required.",
          },
        },
      }, null, 2)}\n`,
    );

    await expect(assertPolicyAllowsCommand({ cwd, runtime, command: "verify" })).rejects.toThrow(
      "Policy requires approval for 'verify': Release manager approval required.",
    );
  });

  it("reports generated fallback coverage instead of treating it as authored policy", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();

    await evaluatePolicy({ cwd, runtime, command: "quality-gate" });

    const coverage = await getPolicyCoverageReport({ cwd, runtime });

    expect(coverage).toEqual(expect.objectContaining({
      source: "generated",
      explicitCommands: [],
      defaultedCommands: ["quality-gate", "checkpoint", "verify", "harness-audit"],
    }));
  });

  it("treats authored policy files with default values as authored coverage", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(
      join(cwd, ".bbg", "policy", "decisions.json"),
      `${JSON.stringify({
        version: 1,
        commands: {
          verify: {
            allowed: true,
            requiredApproval: false,
            reason: "Allowed by local default policy.",
          },
        },
      }, null, 2)}\n`,
    );

    const coverage = await getPolicyCoverageReport({ cwd, runtime });

    expect(coverage).toEqual(expect.objectContaining({
      source: "authored",
      explicitCommands: ["verify"],
      defaultedCommands: ["quality-gate", "checkpoint", "harness-audit"],
    }));
  });

  it("treats edited generated policy files as authored overrides", async () => {
    const cwd = await makeTempDir();
    const runtime = buildDefaultRuntimeConfig();
    await writeTextFile(
      join(cwd, ".bbg", "policy", "decisions.json"),
      `${JSON.stringify({
        version: 1,
        provenance: {
          source: "generated",
        },
        commands: {
          "quality-gate": {
            allowed: true,
            requiredApproval: false,
            reason: "Allowed by local default policy.",
          },
          checkpoint: {
            allowed: true,
            requiredApproval: false,
            reason: "Allowed by local default policy.",
          },
          verify: {
            allowed: true,
            requiredApproval: true,
            reason: "Release manager approval required.",
          },
          "harness-audit": {
            allowed: true,
            requiredApproval: false,
            reason: "Allowed by local default policy.",
          },
        },
      }, null, 2)}\n`,
    );

    const coverage = await getPolicyCoverageReport({ cwd, runtime });

    expect(coverage).toEqual(expect.objectContaining({
      source: "authored",
      explicitCommands: ["verify"],
      defaultedCommands: ["quality-gate", "checkpoint", "harness-audit"],
    }));
  });

  it("reports disabled policy coverage as fully defaulted", async () => {
    const cwd = await makeTempDir();
    const runtime = {
      ...buildDefaultRuntimeConfig(),
      policy: {
        enabled: false,
        file: ".bbg/policy/decisions.json",
      },
    };

    const coverage = await getPolicyCoverageReport({ cwd, runtime });

    expect(coverage).toEqual(expect.objectContaining({
      source: "disabled",
      explicitCommands: [],
      defaultedCommands: ["quality-gate", "checkpoint", "verify", "harness-audit"],
    }));
  });
});
