import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import { beforeAll, describe, expect, it } from "vitest";

const testFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(testFilePath), "../..");
const distCliPath = path.join(repoRoot, "dist", "cli.js");

async function ensureBuiltCli(): Promise<void> {
  try {
    await access(distCliPath);
  } catch {
    await execa("npm", ["run", "build"], { cwd: repoRoot });
  }
}

describe("cli smoke", () => {
  beforeAll(async () => {
    await ensureBuiltCli();
  });

  it("prints v1 command list in --help output", { timeout: 45000 }, async () => {
    const { stdout } = await execa("node", [distCliPath, "--help"], { cwd: repoRoot });

    expect(stdout).toContain("Usage: bbg");
    expect(stdout).toContain("init");
    expect(stdout).toContain("doctor");
    expect(stdout).toContain("sync");
    expect(stdout).toContain("release");
    expect(stdout).toContain("upgrade");
    expect(stdout).toContain("uninstall");
    expect(stdout).not.toContain("add-repo");
    expect(stdout).not.toContain("add-repo-agent");
    expect(stdout).not.toMatch(/\bstart \[task/);
    expect(stdout).not.toContain("start-agent");
    expect(stdout).not.toMatch(/\bresume <task/);
    expect(stdout).not.toContain("resume-agent");
    expect(stdout).not.toMatch(/^ {2}workflow(\s|$)/m);
    expect(stdout).not.toContain("workflow-agent");
    expect(stdout).not.toMatch(/^ {2}hermes(\s|$)/m);
    expect(stdout).not.toContain("hermes-agent");
    expect(stdout).not.toContain("model-route");
    expect(stdout).not.toContain("model-route-agent");
    expect(stdout).not.toContain("task-start");
    expect(stdout).not.toContain("task-start-agent");
    expect(stdout).not.toContain("analyze-agent");
    expect(stdout).not.toMatch(/\banalyze \[focus/);
    expect(stdout).not.toContain("analyze-repo");
    expect(stdout).not.toContain("analyze-repo-agent");
    expect(stdout).not.toContain("deliver");
    expect(stdout).not.toContain("deliver-agent");
    expect(stdout).not.toContain("cross-audit");
    expect(stdout).not.toContain("cross-audit-agent");
  });
});
