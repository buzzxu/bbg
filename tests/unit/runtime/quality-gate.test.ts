import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDefaultRuntimeConfig } from "../../../src/runtime/schema.js";
import * as fsUtils from "../../../src/utils/fs.js";
import { writeTextFile } from "../../../src/utils/fs.js";

const execaState = vi.hoisted(() => ({
  execa: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: execaState.execa,
}));

import { runQualityGate } from "../../../src/runtime/quality-gate.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-quality-gate-"));
  tempDirs.push(dir);
  return dir;
}

function buildRuntime() {
  return {
    ...buildDefaultRuntimeConfig(),
    telemetry: {
      ...buildDefaultRuntimeConfig().telemetry,
      enabled: true,
    },
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("runtime quality gate", () => {
  beforeEach(() => {
    execaState.execa.mockReset();
    execaState.execa.mockImplementation(async (_command: string, args: string[]) => ({
      stdout: `ok:${args.join(" ")}`,
      stderr: "",
      exitCode: 0,
    }));
  });

  it("returns a stable result shape and records evaluation and telemetry", async () => {
    const cwd = await makeTempDir();
    const runtime = buildRuntime();
    await writeTextFile(join(cwd, "README.md"), "# Workspace\n");

    const result = await runQualityGate({ cwd, runtime, repos: [] });

    expect(result.ok).toBe(true);
    expect(result.checks).toEqual({
      build: expect.objectContaining({ name: "build", command: "npm run build", ok: true, exitCode: 0 }),
      typecheck: expect.objectContaining({ name: "typecheck", command: "npm run typecheck", ok: true, exitCode: 0 }),
      tests: expect.objectContaining({ name: "tests", command: "npm test", ok: true, exitCode: 0 }),
      lint: expect.objectContaining({ name: "lint", command: "npm run lint", ok: true, exitCode: 0 }),
      security: expect.objectContaining({ name: "security", command: "phase1-security-scan", ok: true, exitCode: 0 }),
    });

    expect(execaState.execa.mock.calls.map((call) => call[1])).toEqual([
      ["run", "build"],
      ["run", "typecheck"],
      ["test"],
      ["run", "lint"],
    ]);

    const evaluation = JSON.parse(await readFile(join(cwd, ".bbg", "evaluations", "history.json"), "utf8")) as {
      runs: Array<{ command: string; ok: boolean }>;
    };
    expect(evaluation.runs).toEqual([
      expect.objectContaining({ command: "quality-gate", ok: true }),
    ]);

    const telemetry = JSON.parse(await readFile(join(cwd, ".bbg", "telemetry", "events.json"), "utf8")) as {
      events: Array<{ type: string; details: { command?: string } }>;
    };
    expect(telemetry.events).toEqual([
      expect.objectContaining({ type: "runtime.command.completed", details: expect.objectContaining({ command: "quality-gate" }) }),
    ]);
  });

  it("fails the deterministic security check when secret-like content is present", async () => {
    const cwd = await makeTempDir();
    const runtime = buildRuntime();
    await writeTextFile(join(cwd, "src", "secrets.ts"), 'export const token = "sk_live_super_secret";\n');

    const result = await runQualityGate({ cwd, runtime, repos: [] });

    expect(result.ok).toBe(false);
    expect(result.checks.security.ok).toBe(false);
    expect(result.checks.security.stdout).toContain("src/secrets.ts");
  });

  it("ignores secret-like placeholders in docs, tests, and fixtures", async () => {
    const cwd = await makeTempDir();
    const runtime = buildRuntime();
    await writeTextFile(join(cwd, "docs", "security.md"), 'Example token = "sk_live_docs_placeholder"\n');
    await writeTextFile(join(cwd, "tests", "fixtures", "secrets.ts"), 'export const token = "sk_live_fixture_placeholder";\n');

    const result = await runQualityGate({ cwd, runtime, repos: [] });

    expect(result.ok).toBe(true);
    expect(result.checks.security.ok).toBe(true);
    expect(result.checks.security.stdout).toBe("No secret-like content detected.");
  });

  it("fails closed when the security scan cannot read a workspace file", async () => {
    const cwd = await makeTempDir();
    const runtime = buildRuntime();
    await writeTextFile(join(cwd, "private.txt"), 'token = "sk_live_hidden"\n');
    const originalReadTextFile = fsUtils.readTextFile;
    const readSpy = vi.spyOn(fsUtils, "readTextFile").mockImplementation(async (filePath) => {
      if (filePath.endsWith("private.txt")) {
        throw new Error("EACCES: permission denied");
      }

      return originalReadTextFile(filePath);
    });

    try {
      const result = await runQualityGate({ cwd, runtime, repos: [] });

      expect(result.ok).toBe(false);
      expect(result.checks.security.ok).toBe(false);
      expect(result.checks.security.stderr).toContain("private.txt");
    } finally {
      readSpy.mockRestore();
    }
  });

  it("ignores symlinks that point outside the workspace", async () => {
    const cwd = await makeTempDir();
    const runtime = buildRuntime();
    const externalDir = await makeTempDir();
    const externalFile = join(externalDir, "outside.txt");
    await writeFile(externalFile, 'token = "sk_live_external_secret"\n');
    await symlink(externalFile, join(cwd, "outside-link.txt"));

    const result = await runQualityGate({ cwd, runtime, repos: [] });

    expect(result.ok).toBe(true);
    expect(result.checks.security.ok).toBe(true);
    expect(result.checks.security.stdout).toBe("No secret-like content detected.");
    expect(result.checks.security.stderr).toBe("");
  });
});
