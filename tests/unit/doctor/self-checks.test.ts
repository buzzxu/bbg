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
  await writeTextFile(join(root, "skills", "wiki-compilation", "SKILL.md"), "# Wiki Compilation\n\n## Related\n");
  await writeTextFile(join(root, "skills", "wiki-maintenance", "SKILL.md"), "# Wiki Maintenance\n\n## Related\n");
  await writeTextFile(join(root, "skills", "wiki-auditor", "SKILL.md"), "# Wiki Auditor\n\n## Related\n");
  await writeTextFile(join(root, "skills", "wiki-provenance", "SKILL.md"), "# Wiki Provenance\n\n## Related\n");
  await writeTextFile(join(root, "skills", "wiki-distillation", "SKILL.md"), "# Wiki Distillation\n\n## Related\n");
  await writeTextFile(join(root, "rules", "common", "coding-style.md"), "# Coding Style\n\n## Related\n");
  await writeTextFile(join(root, "rules", "common", "knowledge.md"), "# Knowledge Layer: Common\n\n## Related\n");
  await writeTextFile(join(root, "commands", "plan.md"), "# Plan\n\n## Related\n");
  await writeTextFile(join(root, "commands", "wiki-ingest.md"), "# /wiki-ingest\n\n## Related\n");
  await writeTextFile(join(root, "commands", "wiki-query.md"), "# /wiki-query\n\n## Related\n");
  await writeTextFile(join(root, "commands", "wiki-lint.md"), "# /wiki-lint\n\n## Related\n");
  await writeTextFile(join(root, "commands", "wiki-compile.md"), "# /wiki-compile\n\n## Related\n");
  await writeTextFile(join(root, "commands", "wiki-refresh.md"), "# /wiki-refresh\n\n## Related\n");
  await writeTextFile(join(root, "commands", "wiki-audit.md"), "# /wiki-audit\n\n## Related\n");
  await writeTextFile(join(root, "commands", "wiki-stale.md"), "# /wiki-stale\n\n## Related\n");
  await writeTextFile(join(root, "commands", "wiki-promote.md"), "# /wiki-promote\n\n## Related\n");
  await writeTextFile(join(root, "docs", "raw", "README.md"), "# Raw Sources\n");
  await writeTextFile(join(root, "docs", "wiki", "index.md"), "# Wiki Index\n");
  await writeTextFile(join(root, "docs", "wiki", "log.md"), "# Wiki Log\n");
  await writeTextFile(join(root, "docs", "wiki", "concepts", "README.md"), "# Concepts\n");
  await writeTextFile(join(root, "docs", "wiki", "decisions", "README.md"), "# Decisions\n");
  await writeTextFile(join(root, "docs", "wiki", "reports", "README.md"), "# Reports\n");
  await writeTextFile(join(root, "docs", "wiki", "processes", "README.md"), "# Processes\n");
  await writeTextFile(join(root, "docs", "wiki", "reports", "regression-risk-summary.md"), "# Regression Risk Summary\n");
  await writeTextFile(join(root, "docs", "wiki", "reports", "workflow-stability-summary.md"), "# Workflow Stability Summary\n");
  await writeTextFile(join(root, "docs", "wiki", "reports", "red-team-findings-summary.md"), "# Red Team Findings Summary\n");
  await writeTextFile(join(root, "docs", "wiki", "processes", "knowledge-compilation.md"), "# Knowledge Compilation\n");
  await writeTextFile(join(root, "docs", "wiki", "processes", "knowledge-trust-model.md"), "# Knowledge Trust Model\n");
  await writeTextFile(join(root, ".bbg", "knowledge", "README.md"), "# Knowledge Metadata\n");
  await writeTextFile(
    join(root, ".bbg", "scripts", "knowledge-schema.sql"),
    "CREATE TABLE IF NOT EXISTS knowledge_sources (id INTEGER);\n",
  );
  await writeTextFile(join(root, ".bbg", "scripts", "knowledge-provenance.sql"), "-- stale pages\n");
  await writeTextFile(
    join(root, ".bbg", "scripts", "telemetry-init.sql"),
    "CREATE TABLE IF NOT EXISTS telemetry_events (id INTEGER);\n",
  );
  await writeTextFile(
    join(root, ".bbg", "scripts", "telemetry-report.sql"),
    "SELECT 1;\n",
  );
  await writeTextFile(
    join(root, ".bbg", "scripts", "eval-schema.sql"),
    "CREATE TABLE IF NOT EXISTS eval_runs (id INTEGER);\n",
  );
  await writeTextFile(
    join(root, ".bbg", "scripts", "interview-schema.sql"),
    "CREATE TABLE IF NOT EXISTS interview_sessions (id INTEGER);\n",
  );
  await writeTextFile(
    join(root, ".bbg", "scripts", "policy-schema.sql"),
    "CREATE TABLE IF NOT EXISTS policy_decisions (id INTEGER);\n",
  );
  await writeTextFile(
    join(root, ".bbg", "scripts", "context-schema.sql"),
    "CREATE TABLE IF NOT EXISTS context_snapshots (id INTEGER);\n",
  );
  await writeTextFile(
    join(root, ".bbg", "scripts", "workflow-schema.sql"),
    "CREATE TABLE IF NOT EXISTS workflow_instances (id INTEGER);\n",
  );
  await writeTextFile(
    join(root, ".bbg", "scripts", "org-schema.sql"),
    "CREATE TABLE IF NOT EXISTS org_policy_syncs (id INTEGER);\n",
  );
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
    const wikiCompilationSkillsCheck = result.checks.find((c) => c.id === "self-wiki-compilation-skills-exist");
    const wikiCompilationCommandsCheck = result.checks.find((c) => c.id === "self-wiki-compilation-commands-exist");
    const wikiCompiledDocsCheck = result.checks.find((c) => c.id === "self-wiki-compiled-docs-exist");
    const knowledgeFilesCheck = result.checks.find((c) => c.id === "self-knowledge-files-exist");
    const knowledgeScriptsCheck = result.checks.find((c) => c.id === "self-knowledge-scripts-exist");
    expect(agentCheck).toBeDefined();
    expect(agentCheck!.passed).toBe(true);
    expect(wikiCheck).toBeDefined();
    expect(wikiCheck!.passed).toBe(true);
    expect(wikiSkillsCheck).toBeDefined();
    expect(wikiSkillsCheck!.passed).toBe(true);
    expect(wikiCommandsCheck).toBeDefined();
    expect(wikiCommandsCheck!.passed).toBe(true);
    expect(wikiCompilationSkillsCheck).toBeDefined();
    expect(wikiCompilationSkillsCheck!.passed).toBe(true);
    expect(wikiCompilationCommandsCheck).toBeDefined();
    expect(wikiCompilationCommandsCheck!.passed).toBe(true);
    expect(wikiCompiledDocsCheck).toBeDefined();
    expect(wikiCompiledDocsCheck!.passed).toBe(true);
    expect(knowledgeFilesCheck).toBeDefined();
    expect(knowledgeFilesCheck!.passed).toBe(true);
    expect(knowledgeScriptsCheck).toBeDefined();
    expect(knowledgeScriptsCheck!.passed).toBe(true);
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

  it("detects missing knowledge metadata files", async () => {
    const root = await makeTempDir();

    const result = await runSelfChecks(root);

    const filesCheck = result.checks.find((c) => c.id === "self-knowledge-files-exist");
    const scriptsCheck = result.checks.find((c) => c.id === "self-knowledge-scripts-exist");
    expect(filesCheck).toBeDefined();
    expect(filesCheck!.passed).toBe(false);
    expect(scriptsCheck).toBeDefined();
    expect(scriptsCheck!.passed).toBe(false);
  });

  it("detects missing wiki compilation assets", async () => {
    const root = await makeTempDir();

    const result = await runSelfChecks(root);

    const skillsCheck = result.checks.find((c) => c.id === "self-wiki-compilation-skills-exist");
    const commandsCheck = result.checks.find((c) => c.id === "self-wiki-compilation-commands-exist");
    const docsCheck = result.checks.find((c) => c.id === "self-wiki-compiled-docs-exist");
    expect(skillsCheck).toBeDefined();
    expect(skillsCheck!.passed).toBe(false);
    expect(commandsCheck).toBeDefined();
    expect(commandsCheck!.passed).toBe(false);
    expect(docsCheck).toBeDefined();
    expect(docsCheck!.passed).toBe(false);
  });

  it("detects missing wiki trust assets", async () => {
    const root = await makeTempDir();

    const result = await runSelfChecks(root);

    const skillsCheck = result.checks.find((c) => c.id === "self-wiki-trust-skills-exist");
    const commandsCheck = result.checks.find((c) => c.id === "self-wiki-trust-commands-exist");
    const docsCheck = result.checks.find((c) => c.id === "self-wiki-trust-docs-exist");
    const scriptsCheck = result.checks.find((c) => c.id === "self-knowledge-provenance-scripts-exist");
    expect(skillsCheck).toBeDefined();
    expect(skillsCheck!.passed).toBe(false);
    expect(commandsCheck).toBeDefined();
    expect(commandsCheck!.passed).toBe(false);
    expect(docsCheck).toBeDefined();
    expect(docsCheck!.passed).toBe(false);
    expect(scriptsCheck).toBeDefined();
    expect(scriptsCheck!.passed).toBe(false);
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

  it("does not mark known knowledge and script assets as orphaned", async () => {
    const root = await makeTempDir();
    await createMinimalGovernance(root);

    const orphanCheck = (await runSelfChecks(root)).checks.find((c) => c.id === "self-no-orphans");

    expect(orphanCheck).toBeDefined();
    expect(orphanCheck!.passed).toBe(true);
  });

  it("returns structured result with ok flag", async () => {
    const root = await makeTempDir();

    const result = await runSelfChecks(root);

    expect(typeof result.ok).toBe("boolean");
    expect(Array.isArray(result.checks)).toBe(true);
  });
});
