import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runHarnessAuditCommand } from "../../src/commands/harness-audit.js";
import { serializeConfig } from "../../src/config/read-write.js";
import { buildDefaultRuntimeConfig } from "../../src/runtime/schema.js";
import { writeTextFile } from "../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-harness-audit-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string, policyEnabled = true): Promise<void> {
  const runtime = buildDefaultRuntimeConfig();
  await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig({
    version: "0.1.0",
    projectName: "bbg-project",
    projectDescription: "harness audit command test",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    repos: [],
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
      policy: {
        ...runtime.policy,
        enabled: policyEnabled,
      },
    },
  }));
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("harness-audit command", () => {
  it("blocks the audit when policy denies it", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "policy", "decisions.json"),
      `${JSON.stringify({
        version: 1,
        commands: {
          "harness-audit": {
            allowed: false,
            requiredApproval: false,
            reason: "Audit output locked during review.",
          },
        },
      }, null, 2)}\n`,
    );

    await expect(runHarnessAuditCommand({ cwd })).rejects.toThrow(
      "Policy blocked 'harness-audit': Audit output locked during review.",
    );
  });

  it("reports disabled policy coverage as defaulted instead of authored", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd, false);

    const result = await runHarnessAuditCommand({ cwd });

    expect(result.policy).toEqual(expect.objectContaining({
      source: "disabled",
      explicitCommands: [],
      defaultedCommands: ["quality-gate", "checkpoint", "verify", "harness-audit"],
      blockedCommands: [],
      approvalRequiredCommands: [],
    }));
  });

  it("reports approval-required commands and authored default-value policy as authored", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
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
          checkpoint: {
            allowed: true,
            requiredApproval: false,
            reason: "Allowed by local default policy.",
          },
        },
      }, null, 2)}\n`,
    );

    const result = await runHarnessAuditCommand({ cwd });

    expect(result.policy).toEqual(expect.objectContaining({
      source: "authored",
      explicitCommands: ["verify", "checkpoint"],
      defaultedCommands: ["quality-gate", "harness-audit"],
      blockedCommands: [],
      approvalRequiredCommands: ["verify"],
    }));
  });

  it("reports approval-required harness audit state instead of failing early", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "policy", "decisions.json"),
      `${JSON.stringify({
        version: 1,
        commands: {
          "harness-audit": {
            allowed: true,
            requiredApproval: true,
            reason: "Ops approval required before sharing audit output.",
          },
        },
      }, null, 2)}\n`,
    );

    const result = await runHarnessAuditCommand({ cwd });

    expect(result.policy).toEqual(expect.objectContaining({
      approvalRequiredCommands: ["harness-audit"],
      auditState: "approval-required",
      auditMessage: expect.stringContaining("Ops approval required"),
    }));
    expect(result.summary.gaps).toContainEqual(expect.stringContaining("approval required"));
  });

  it("reports invalid policy state in the audit summary instead of throwing", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(
      join(cwd, ".bbg", "policy", "decisions.json"),
      '{\n  "version": 1,\n  "commands": []\n}\n',
    );

    const result = await runHarnessAuditCommand({ cwd });

    expect(result.policy).toEqual(expect.objectContaining({
      auditState: "invalid",
      auditMessage: expect.stringContaining("invalid policy store"),
    }));
    expect(result.checks.find((entry) => entry.id === "runtime-policy-coverage")).toEqual(expect.objectContaining({
      passed: false,
      message: expect.stringContaining("invalid policy store"),
    }));
    expect(result.summary.gaps).toContainEqual(expect.stringContaining("invalid policy store"));
  });

  it("detects missing runtime command capabilities even when package scripts exist", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(
      join(cwd, "package.json"),
      `${JSON.stringify({
        name: "audit-runtime-capabilities",
        private: true,
        scripts: {
          build: "missing-build-tool",
          typecheck: 'node -e "process.exit(0)"',
          test: 'node -e "process.exit(0)"',
          lint: "missing-lint-tool --check .",
        },
      }, null, 2)}\n`,
    );

    const result = await runHarnessAuditCommand({ cwd });

    expect(result.checks.find((entry) => entry.id === "runtime-command-scripts")).toEqual(expect.objectContaining({
      passed: false,
      message: expect.stringContaining("missing executable command capabilities"),
    }));
    expect(result.checks.find((entry) => entry.id === "runtime-command-scripts")?.message).toContain("build");
    expect(result.checks.find((entry) => entry.id === "runtime-command-scripts")?.message).toContain("lint");
  });

  it("treats shell builtins and wrapper-style runtime scripts as supported capabilities", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(join(cwd, "src", "index.ts"), "export const ready = true;\n");
    await writeTextFile(
      join(cwd, "package.json"),
      `${JSON.stringify({
        name: "audit-runtime-capabilities-builtins",
        private: true,
        scripts: {
          build: 'test -d src && node -e "process.exit(0)"',
          typecheck: 'command -v node && node -e "process.exit(0)"',
          test: 'sh -c "node -e \\"process.exit(0)\\""',
          lint: 'node -e "process.exit(0)"',
        },
      }, null, 2)}\n`,
    );

    const result = await runHarnessAuditCommand({ cwd });

    expect(result.checks.find((entry) => entry.id === "runtime-command-scripts")).toEqual(expect.objectContaining({
      passed: true,
      message: "runtime command scripts exist",
    }));
  });

  it("treats absolute-path env wrappers as supported runtime capabilities", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    await writeTextFile(
      join(cwd, "package.json"),
      `${JSON.stringify({
        name: "audit-runtime-capabilities-absolute-wrapper",
        private: true,
        scripts: {
          build: '/usr/bin/env node -e "process.exit(0)"',
          typecheck: '/usr/bin/env node -e "process.exit(0)"',
          test: '/usr/bin/env node -e "process.exit(0)"',
          lint: '/usr/bin/env node -e "process.exit(0)"',
        },
      }, null, 2)}\n`,
    );

    const result = await runHarnessAuditCommand({ cwd });

    expect(result.checks.find((entry) => entry.id === "runtime-command-scripts")).toEqual(expect.objectContaining({
      passed: true,
      message: "runtime command scripts exist",
    }));
  });

  it("accepts Windows absolute executable runtime scripts without appending PATHEXT", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    const wrapperPath = join(cwd, "runtime-tool.exe");
    const platformSpy = vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const originalPathext = process.env.PATHEXT;
    process.env.PATHEXT = ".EXE;.CMD;.BAT;.COM";
    await writeTextFile(wrapperPath, "@echo off\r\nexit /b 0\r\n");
    await writeTextFile(
      join(cwd, "package.json"),
      `${JSON.stringify({
        name: "audit-runtime-capabilities-windows-absolute-executable",
        private: true,
        scripts: {
          build: wrapperPath,
          typecheck: wrapperPath,
          test: wrapperPath,
          lint: wrapperPath,
        },
      }, null, 2)}\n`,
    );

    try {
      const result = await runHarnessAuditCommand({ cwd });

      expect(result.checks.find((entry) => entry.id === "runtime-command-scripts")).toEqual(expect.objectContaining({
        passed: true,
        message: "runtime command scripts exist",
      }));
    } finally {
      if (originalPathext === undefined) {
        delete process.env.PATHEXT;
      } else {
        process.env.PATHEXT = originalPathext;
      }
      platformSpy.mockRestore();
    }
  });

  it("accepts Windows parent-relative executable runtime scripts without appending PATHEXT", async () => {
    const cwd = await makeTempDir();
    const workspace = join(cwd, "child");
    await seedWorkspace(workspace);
    const platformSpy = vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const originalPathext = process.env.PATHEXT;
    process.env.PATHEXT = ".EXE;.CMD;.BAT;.COM";
    await writeTextFile(join(cwd, "bin", "tool.cmd"), "@echo off\r\nexit /b 0\r\n");
    await writeTextFile(
      join(workspace, "package.json"),
      `${JSON.stringify({
        name: "audit-runtime-capabilities-windows-parent-relative-executable",
        private: true,
        scripts: {
          build: "..\\bin\\tool.cmd",
          typecheck: "..\\bin\\tool.cmd",
          test: "..\\bin\\tool.cmd",
          lint: "..\\bin\\tool.cmd",
        },
      }, null, 2)}\n`,
    );

    try {
      const result = await runHarnessAuditCommand({ cwd: workspace });

      expect(result.checks.find((entry) => entry.id === "runtime-command-scripts")).toEqual(expect.objectContaining({
        passed: true,
        message: "runtime command scripts exist",
      }));
    } finally {
      if (originalPathext === undefined) {
        delete process.env.PATHEXT;
      } else {
        process.env.PATHEXT = originalPathext;
      }
      platformSpy.mockRestore();
    }
  });

  it("reports edited generated policy files as authored overrides", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
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

    const result = await runHarnessAuditCommand({ cwd });

    expect(result.policy).toEqual(expect.objectContaining({
      source: "authored",
      explicitCommands: ["verify"],
      defaultedCommands: ["quality-gate", "checkpoint", "harness-audit"],
      blockedCommands: [],
      approvalRequiredCommands: ["verify"],
    }));
  });

  it("includes actionable gap details in the summary", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runHarnessAuditCommand({ cwd });

    expect(result.summary.gaps).toContainEqual(expect.stringContaining("runtime-command-scripts: missing package.json scripts"));
    expect(result.summary.gaps).toContainEqual(expect.stringContaining("runtime-telemetry:"));
    expect(result.summary.gaps).toContainEqual(expect.stringContaining("runtime-policy-coverage: policy coverage gap"));
  });
});
