import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeTextFile } from "../../../src/utils/fs.js";
import { runSelfChecks, type SelfCheckResult } from "../../../src/doctor/self-checks.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-selfcheck-test-"));
  tempDirs.push(dir);
  return dir;
}

async function createMinimalGovernance(root: string): Promise<void> {
  await writeTextFile(join(root, "agents", "planner.md"), "# Planner\n\n## Related\n");
  await writeTextFile(join(root, "agents", "architect.md"), "# Architect\n\n## Related\n");
  await writeTextFile(join(root, "skills", "tdd-workflow", "SKILL.md"), "# TDD\n\n## Related\n");
  await writeTextFile(join(root, "rules", "common", "coding-style.md"), "# Coding Style\n\n## Related\n");
  await writeTextFile(join(root, "commands", "plan.md"), "# Plan\n\n## Related\n");
  await writeTextFile(join(root, "hooks", "hooks.json"), "{}");
  await writeTextFile(join(root, "hooks", "README.md"), "# Hooks\n");
  await writeTextFile(join(root, "hooks", "scripts", "session-start.js"), "// hook\n");
  await writeTextFile(join(root, "mcp-configs", "mcp-servers.json"), "{}");
  await writeTextFile(join(root, "mcp-configs", "README.md"), "# MCP\n");
}

describe("doctor/self-checks", () => {
  afterEach(async () => {
    const { rm } = await import("node:fs/promises");
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("detects missing agent files", async () => {
    const root = await makeTempDir();

    const result = await runSelfChecks(root);

    const agentCheck = result.checks.find((c) => c.id === "self-agents-exist");
    expect(agentCheck).toBeDefined();
    expect(agentCheck!.passed).toBe(false);
    expect(agentCheck!.message).toContain("missing");
  });

  it("passes when all expected agent files exist", async () => {
    const root = await makeTempDir();
    await createMinimalGovernance(root);

    const { GOVERNANCE_MANIFEST } = await import("../../../src/templates/governance.js");
    for (const agent of GOVERNANCE_MANIFEST.coreAgents) {
      await writeTextFile(join(root, "agents", `${agent}.md`), `# ${agent}\n`);
    }

    const result = await runSelfChecks(root);
    const agentCheck = result.checks.find((c) => c.id === "self-agents-exist");
    expect(agentCheck).toBeDefined();
    expect(agentCheck!.passed).toBe(true);
  });

  it("detects missing skill files", async () => {
    const root = await makeTempDir();

    const result = await runSelfChecks(root);

    const skillCheck = result.checks.find((c) => c.id === "self-skills-exist");
    expect(skillCheck).toBeDefined();
    expect(skillCheck!.passed).toBe(false);
  });

  it("detects broken cross-reference links", async () => {
    const root = await makeTempDir();
    await writeTextFile(
      join(root, "agents", "planner.md"),
      "# Planner\n\n## Related\n- [Missing Skill](../skills/nonexistent/SKILL.md)\n",
    );

    const result = await runSelfChecks(root);

    const crossrefCheck = result.checks.find((c) => c.id === "self-crossref-valid");
    expect(crossrefCheck).toBeDefined();
    expect(crossrefCheck!.passed).toBe(false);
    expect(crossrefCheck!.message).toContain("broken");
  });

  it("returns structured result with ok flag", async () => {
    const root = await makeTempDir();

    const result = await runSelfChecks(root);

    expect(typeof result.ok).toBe("boolean");
    expect(Array.isArray(result.checks)).toBe(true);
  });
});
