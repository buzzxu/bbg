import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeTextFile } from "../../../src/utils/fs.js";
import { runSelfChecks } from "../../../src/doctor/self-checks.js";

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
  await writeTextFile(join(root, "skills", "wiki-ingestion", "SKILL.md"), "# Wiki Ingestion\n\n## Related\n");
  await writeTextFile(join(root, "skills", "wiki-query", "SKILL.md"), "# Wiki Query\n\n## Related\n");
  await writeTextFile(join(root, "skills", "wiki-lint", "SKILL.md"), "# Wiki Lint\n\n## Related\n");
  await writeTextFile(join(root, "rules", "common", "coding-style.md"), "# Coding Style\n\n## Related\n");
  await writeTextFile(join(root, "rules", "common", "knowledge.md"), "# Knowledge Layer: Common\n\n## Related\n");
  await writeTextFile(join(root, "commands", "plan.md"), "# Plan\n\n## Related\n");
  await writeTextFile(join(root, "commands", "wiki-ingest.md"), "# /wiki-ingest\n\n## Related\n");
  await writeTextFile(join(root, "commands", "wiki-query.md"), "# /wiki-query\n\n## Related\n");
  await writeTextFile(join(root, "commands", "wiki-lint.md"), "# /wiki-lint\n\n## Related\n");
  await writeTextFile(join(root, "docs", "raw", "README.md"), "# Raw Sources\n");
  await writeTextFile(join(root, "docs", "wiki", "index.md"), "# Wiki Index\n");
  await writeTextFile(join(root, "docs", "wiki", "log.md"), "# Wiki Log\n");
  await writeTextFile(join(root, "docs", "wiki", "concepts", "README.md"), "# Concepts\n");
  await writeTextFile(join(root, "docs", "wiki", "decisions", "README.md"), "# Decisions\n");
  await writeTextFile(join(root, "docs", "wiki", "reports", "README.md"), "# Reports\n");
  await writeTextFile(join(root, "docs", "wiki", "processes", "README.md"), "# Processes\n");
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
    const wikiCheck = result.checks.find((c) => c.id === "self-wiki-docs-exist");
    const wikiSkillsCheck = result.checks.find((c) => c.id === "self-wiki-skills-exist");
    const wikiCommandsCheck = result.checks.find((c) => c.id === "self-wiki-commands-exist");
    expect(agentCheck).toBeDefined();
    expect(agentCheck!.passed).toBe(true);
    expect(wikiCheck).toBeDefined();
    expect(wikiCheck!.passed).toBe(true);
    expect(wikiSkillsCheck).toBeDefined();
    expect(wikiSkillsCheck!.passed).toBe(true);
    expect(wikiCommandsCheck).toBeDefined();
    expect(wikiCommandsCheck!.passed).toBe(true);
  });

  it("detects missing skill files", async () => {
    const root = await makeTempDir();

    const result = await runSelfChecks(root);

    const skillCheck = result.checks.find((c) => c.id === "self-skills-exist");
    expect(skillCheck).toBeDefined();
    expect(skillCheck!.passed).toBe(false);
  });

  it("detects missing wiki scaffold files", async () => {
    const root = await makeTempDir();

    const result = await runSelfChecks(root);

    const wikiCheck = result.checks.find((c) => c.id === "self-wiki-docs-exist");
    const wikiSkillsCheck = result.checks.find((c) => c.id === "self-wiki-skills-exist");
    const wikiCommandsCheck = result.checks.find((c) => c.id === "self-wiki-commands-exist");
    expect(wikiCheck).toBeDefined();
    expect(wikiCheck!.passed).toBe(false);
    expect(wikiSkillsCheck).toBeDefined();
    expect(wikiSkillsCheck!.passed).toBe(false);
    expect(wikiCommandsCheck).toBeDefined();
    expect(wikiCommandsCheck!.passed).toBe(false);
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
