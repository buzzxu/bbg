import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeTextFile } from "../../../src/utils/fs.js";
import { runSelfChecks } from "../../../src/doctor/self-checks.js";
import { GOVERNANCE_MANIFEST } from "../../../src/templates/governance.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-selfcheck-test-"));
  tempDirs.push(dir);
  return dir;
}

function markdownContent(path: string): string {
  return `# ${path}\n\n## Related\n`;
}

function fileContent(path: string): string {
  if (path.endsWith(".md")) return markdownContent(path);
  if (path.endsWith(".json")) return "{}\n";
  if (path.endsWith(".sql")) return "SELECT 1;\n";
  if (path.endsWith(".js")) return "// generated for test\n";
  return "\n";
}

function getCheck(result: Awaited<ReturnType<typeof runSelfChecks>>, id: string) {
  const check = result.checks.find((entry) => entry.id === id);
  expect(check).toBeDefined();
  return check!;
}

async function writeManifestPaths(root: string, relativePaths: string[]): Promise<void> {
  for (const relativePath of relativePaths) {
    await writeTextFile(join(root, relativePath), fileContent(relativePath));
  }
}

async function createMinimalGovernance(root: string): Promise<void> {
  const requiredPaths = [
    ...GOVERNANCE_MANIFEST.coreAgents.map((agent) => `agents/${agent}.md`),
    ...[...GOVERNANCE_MANIFEST.coreSkills, ...GOVERNANCE_MANIFEST.operationsSkills].map(
      (skill) => `skills/${skill}/SKILL.md`,
    ),
    ...GOVERNANCE_MANIFEST.commonRules.map((rule) => `rules/common/${rule}.md`),
    ...GOVERNANCE_MANIFEST.coreCommands.map((command) => `commands/${command}.md`),
    ...GOVERNANCE_MANIFEST.wikiDocFiles,
    ...GOVERNANCE_MANIFEST.wikiCompiledDocFiles,
    ...GOVERNANCE_MANIFEST.wikiTrustDocFiles,
    ...GOVERNANCE_MANIFEST.hermesDocFiles,
    ...GOVERNANCE_MANIFEST.knowledgeFiles,
    ...GOVERNANCE_MANIFEST.wikiSkills.map((skill) => `skills/${skill}/SKILL.md`),
    ...GOVERNANCE_MANIFEST.wikiCompilationSkills.map((skill) => `skills/${skill}/SKILL.md`),
    ...GOVERNANCE_MANIFEST.wikiTrustSkills.map((skill) => `skills/${skill}/SKILL.md`),
    ...GOVERNANCE_MANIFEST.hermesSkills.map((skill) => `skills/${skill}/SKILL.md`),
    ...GOVERNANCE_MANIFEST.wikiCommands.map((command) => `commands/${command}.md`),
    ...GOVERNANCE_MANIFEST.wikiCompilationCommands.map((command) => `commands/${command}.md`),
    ...GOVERNANCE_MANIFEST.wikiTrustCommands.map((command) => `commands/${command}.md`),
    ...GOVERNANCE_MANIFEST.hermesCommands.map((command) => `commands/${command}.md`),
    ...GOVERNANCE_MANIFEST.knowledgeScripts.map((script) => `.bbg/scripts/${script}`),
    ...GOVERNANCE_MANIFEST.knowledgeProvenanceScripts.map((script) => `.bbg/scripts/${script}`),
    ...GOVERNANCE_MANIFEST.hermesScripts.map((script) => `.bbg/scripts/${script}`),
    ...GOVERNANCE_MANIFEST.hookFiles.map((hook) => `hooks/${hook}`),
  ];

  await writeManifestPaths(root, requiredPaths);
}

describe("doctor/self-checks", () => {
  afterEach(async () => {
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

  it("passes when all expected governance files exist in the minimal fixture", async () => {
    const root = await makeTempDir();
    await createMinimalGovernance(root);

    const result = await runSelfChecks(root);
    const failingErrorChecks = result.checks.filter((c) => c.severity === "error" && !c.passed);
    expect(result.ok).toBe(true);
    expect(failingErrorChecks).toEqual([]);
    const agentCheck = result.checks.find((c) => c.id === "self-agents-exist");
    const wikiCheck = result.checks.find((c) => c.id === "self-wiki-docs-exist");
    const wikiSkillsCheck = result.checks.find((c) => c.id === "self-wiki-skills-exist");
    const wikiCommandsCheck = result.checks.find((c) => c.id === "self-wiki-commands-exist");
    const wikiCompilationSkillsCheck = result.checks.find((c) => c.id === "self-wiki-compilation-skills-exist");
    const wikiCompilationCommandsCheck = result.checks.find((c) => c.id === "self-wiki-compilation-commands-exist");
    const wikiCompiledDocsCheck = result.checks.find((c) => c.id === "self-wiki-compiled-docs-exist");
    const knowledgeFilesCheck = result.checks.find((c) => c.id === "self-knowledge-files-exist");
    const knowledgeScriptsCheck = result.checks.find((c) => c.id === "self-knowledge-scripts-exist");
    const hermesSkillsCheck = result.checks.find((c) => c.id === "self-hermes-skills-exist");
    const hermesCommandsCheck = result.checks.find((c) => c.id === "self-hermes-commands-exist");
    const hermesDocsCheck = result.checks.find((c) => c.id === "self-hermes-docs-exist");
    const hermesScriptsCheck = result.checks.find((c) => c.id === "self-hermes-scripts-exist");
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
    expect(hermesSkillsCheck).toBeDefined();
    expect(hermesSkillsCheck!.passed).toBe(true);
    expect(getCheck(result, "self-hermes-skills-exist").message).not.toContain("missing");
    expect(hermesCommandsCheck).toBeDefined();
    expect(hermesCommandsCheck!.passed).toBe(true);
    expect(getCheck(result, "self-hermes-commands-exist").message).not.toContain("missing");
    expect(hermesDocsCheck).toBeDefined();
    expect(hermesDocsCheck!.passed).toBe(true);
    expect(getCheck(result, "self-hermes-docs-exist").message).not.toContain("missing");
    expect(hermesScriptsCheck).toBeDefined();
    expect(hermesScriptsCheck!.passed).toBe(true);
  });

  it("fails overall self-checks when Hermes assets are missing from an empty repo", async () => {
    const root = await makeTempDir();

    const result = await runSelfChecks(root);

    expect(result.ok).toBe(false);
    expect(result.checks.find((c) => c.id === "self-hermes-skills-exist")?.passed).toBe(false);
    expect(result.checks.find((c) => c.id === "self-hermes-commands-exist")?.passed).toBe(false);
    expect(result.checks.find((c) => c.id === "self-hermes-docs-exist")?.passed).toBe(false);
    expect(result.checks.find((c) => c.id === "self-hermes-scripts-exist")?.passed).toBe(false);
  });

  it("fails the Hermes skill check for a missing Hermes skill path", async () => {
    const root = await makeTempDir();
    await createMinimalGovernance(root);

    const missingPath = "skills/hermes-runtime/SKILL.md";
    await rm(join(root, missingPath));

    const result = await runSelfChecks(root);
    const check = getCheck(result, "self-hermes-skills-exist");

    expect(result.ok).toBe(false);
    expect(check.passed).toBe(false);
    expect(check.message).toContain(missingPath);
  });

  it("fails the Hermes command check for a missing K7A distillation command", async () => {
    const root = await makeTempDir();
    await createMinimalGovernance(root);

    const missingPath = "commands/hermes-distill.md";
    await rm(join(root, missingPath));

    const result = await runSelfChecks(root);
    const check = getCheck(result, "self-hermes-commands-exist");

    expect(result.ok).toBe(false);
    expect(check.passed).toBe(false);
    expect(check.message).toContain(missingPath);
  });

  it("fails the Hermes skill check for a missing K7A distillation skill", async () => {
    const root = await makeTempDir();
    await createMinimalGovernance(root);

    const missingPath = "skills/hermes-distillation/SKILL.md";
    await rm(join(root, missingPath));

    const result = await runSelfChecks(root);
    const check = getCheck(result, "self-hermes-skills-exist");

    expect(result.ok).toBe(false);
    expect(check.passed).toBe(false);
    expect(check.message).toContain(missingPath);
  });

  it("fails the Hermes doc check for a missing K7A distillation process doc", async () => {
    const root = await makeTempDir();
    await createMinimalGovernance(root);

    const missingPath = "docs/wiki/processes/hermes-distillation.md";
    await rm(join(root, missingPath));

    const result = await runSelfChecks(root);
    const check = getCheck(result, "self-hermes-docs-exist");

    expect(result.ok).toBe(false);
    expect(check.passed).toBe(false);
    expect(check.message).toContain(missingPath);
  });

  it("fails the Hermes command check for a missing Hermes command path", async () => {
    const root = await makeTempDir();
    await createMinimalGovernance(root);

    const missingPath = "commands/hermes-log.md";
    await rm(join(root, missingPath));

    const result = await runSelfChecks(root);
    const check = getCheck(result, "self-hermes-commands-exist");

    expect(result.ok).toBe(false);
    expect(check.passed).toBe(false);
    expect(check.message).toContain(missingPath);
  });

  it("fails the Hermes doc check for a missing Hermes doc path", async () => {
    const root = await makeTempDir();
    await createMinimalGovernance(root);

    const missingPath = "docs/wiki/processes/hermes-runtime.md";
    await rm(join(root, missingPath));

    const result = await runSelfChecks(root);
    const check = getCheck(result, "self-hermes-docs-exist");

    expect(result.ok).toBe(false);
    expect(check.passed).toBe(false);
    expect(check.message).toContain(missingPath);
  });

  it("fails the Hermes script check for a missing Hermes script path", async () => {
    const root = await makeTempDir();
    await createMinimalGovernance(root);

    const missingPath = ".bbg/scripts/hermes-schema.sql";
    await rm(join(root, missingPath));

    const result = await runSelfChecks(root);
    const check = getCheck(result, "self-hermes-scripts-exist");

    expect(result.ok).toBe(false);
    expect(check.passed).toBe(false);
    expect(check.message).toContain(missingPath);
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
