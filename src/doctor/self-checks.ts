import { join, relative, dirname } from "node:path";
import fg from "fast-glob";
import { exists, readTextFile } from "../utils/fs.js";
import { GOVERNANCE_MANIFEST } from "../templates/governance.js";
import type { DoctorCheckResult, DoctorSeverity } from "./checks.js";

export interface SelfCheckResult {
  ok: boolean;
  checks: DoctorCheckResult[];
}

function buildCheck(
  id: string,
  severity: DoctorSeverity,
  passed: boolean,
  message: string,
): DoctorCheckResult {
  return { id, checkId: id, severity, passed, message };
}

async function checkFilesExist(
  root: string,
  checkId: string,
  label: string,
  relativePaths: string[],
): Promise<DoctorCheckResult> {
  const missing: string[] = [];
  for (const relPath of relativePaths) {
    if (!(await exists(join(root, relPath)))) {
      missing.push(relPath);
    }
  }

  return buildCheck(
    checkId,
    "error",
    missing.length === 0,
    missing.length === 0
      ? `all ${label} files exist (${relativePaths.length})`
      : `missing ${label} files (${missing.length}/${relativePaths.length}): ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "..." : ""}`,
  );
}

async function checkCrossReferences(root: string): Promise<DoctorCheckResult> {
  const mdFiles = await fg(["agents/*.md", "skills/*/SKILL.md", "rules/**/*.md", "commands/*.md"], {
    cwd: root,
    absolute: true,
    onlyFiles: true,
  });

  const brokenLinks: string[] = [];

  for (const filePath of mdFiles) {
    let content: string;
    try {
      content = await readTextFile(filePath);
    } catch {
      continue;
    }

    const relatedSection = content.split("## Related")[1];
    if (!relatedSection) continue;

    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(relatedSection)) !== null) {
      const linkTarget = match[2];
      if (linkTarget.startsWith("http://") || linkTarget.startsWith("https://")) continue;

      const resolved = join(dirname(filePath), linkTarget);
      if (!(await exists(resolved))) {
        const relFile = relative(root, filePath);
        brokenLinks.push(`${relFile} -> ${linkTarget}`);
      }
    }
  }

  return buildCheck(
    "self-crossref-valid",
    "error",
    brokenLinks.length === 0,
    brokenLinks.length === 0
      ? "all cross-reference links are valid"
      : `${brokenLinks.length} broken cross-reference link(s): ${brokenLinks.slice(0, 3).join("; ")}${brokenLinks.length > 3 ? "..." : ""}`,
  );
}

async function checkNoOrphanFiles(root: string): Promise<DoctorCheckResult> {
  const allManifestPaths = new Set<string>();

  for (const agent of GOVERNANCE_MANIFEST.coreAgents) {
    allManifestPaths.add(`agents/${agent}.md`);
  }
  for (const agents of Object.values(GOVERNANCE_MANIFEST.languageAgents)) {
    for (const agent of agents) {
      allManifestPaths.add(`agents/${agent}.md`);
    }
  }
  for (const skill of [...GOVERNANCE_MANIFEST.coreSkills, ...GOVERNANCE_MANIFEST.operationsSkills]) {
    allManifestPaths.add(`skills/${skill}/SKILL.md`);
  }
  for (const skill of GOVERNANCE_MANIFEST.wikiSkills) {
    allManifestPaths.add(`skills/${skill}/SKILL.md`);
  }
  for (const skill of GOVERNANCE_MANIFEST.wikiCompilationSkills) {
    allManifestPaths.add(`skills/${skill}/SKILL.md`);
  }
  for (const skill of GOVERNANCE_MANIFEST.wikiTrustSkills) {
    allManifestPaths.add(`skills/${skill}/SKILL.md`);
  }
  for (const skills of Object.values(GOVERNANCE_MANIFEST.languageSkills)) {
    for (const skill of skills) {
      allManifestPaths.add(`skills/${skill}/SKILL.md`);
    }
  }
  for (const rule of GOVERNANCE_MANIFEST.commonRules) {
    allManifestPaths.add(`rules/common/${rule}.md`);
  }
  for (const [langDir, rules] of Object.entries(GOVERNANCE_MANIFEST.languageRules)) {
    for (const rule of rules) {
      allManifestPaths.add(`rules/${langDir}/${rule}.md`);
    }
  }
  for (const cmd of GOVERNANCE_MANIFEST.coreCommands) {
    allManifestPaths.add(`commands/${cmd}.md`);
  }
  for (const cmd of GOVERNANCE_MANIFEST.wikiCommands) {
    allManifestPaths.add(`commands/${cmd}.md`);
  }
  for (const cmd of GOVERNANCE_MANIFEST.wikiCompilationCommands) {
    allManifestPaths.add(`commands/${cmd}.md`);
  }
  for (const cmd of GOVERNANCE_MANIFEST.wikiTrustCommands) {
    allManifestPaths.add(`commands/${cmd}.md`);
  }
  for (const cmds of Object.values(GOVERNANCE_MANIFEST.languageCommands)) {
    for (const cmd of cmds) {
      allManifestPaths.add(`commands/${cmd}.md`);
    }
  }
  for (const wikiDoc of GOVERNANCE_MANIFEST.wikiDocFiles) {
    allManifestPaths.add(wikiDoc);
  }
  for (const wikiDoc of GOVERNANCE_MANIFEST.wikiCompiledDocFiles) {
    allManifestPaths.add(wikiDoc);
  }
  for (const file of GOVERNANCE_MANIFEST.wikiTrustDocFiles) {
    allManifestPaths.add(file);
  }
  for (const wikiDoc of GOVERNANCE_MANIFEST.backendWikiCompiledDocFiles) {
    allManifestPaths.add(wikiDoc);
  }
  for (const file of GOVERNANCE_MANIFEST.knowledgeFiles) {
    allManifestPaths.add(file);
  }
  for (const script of GOVERNANCE_MANIFEST.bbgScripts) {
    allManifestPaths.add(`.bbg/scripts/${script}`);
  }
  for (const script of GOVERNANCE_MANIFEST.knowledgeScripts) {
    allManifestPaths.add(`.bbg/scripts/${script}`);
  }
  for (const script of GOVERNANCE_MANIFEST.knowledgeProvenanceScripts) {
    allManifestPaths.add(`.bbg/scripts/${script}`);
  }
  for (const script of GOVERNANCE_MANIFEST.backendGovernance.scripts) {
    allManifestPaths.add(`.bbg/scripts/${script}`);
  }
  for (const orgFile of GOVERNANCE_MANIFEST.orgGovernanceFiles) {
    if (orgFile.startsWith(".bbg/scripts/")) {
      allManifestPaths.add(orgFile);
    }
  }

  for (const script of GOVERNANCE_MANIFEST.workflowFiles.scripts) {
    allManifestPaths.add(`.bbg/scripts/${script}`);
  }
  for (const schema of GOVERNANCE_MANIFEST.workflowFiles.schema) {
    allManifestPaths.add(`workflows/${schema}`);
  }
  for (const preset of GOVERNANCE_MANIFEST.workflowFiles.presets) {
    allManifestPaths.add(`workflows/presets/${preset}`);
  }

  for (const skill of GOVERNANCE_MANIFEST.backendGovernance.skills) {
    allManifestPaths.add(`skills/${skill}/SKILL.md`);
  }
  for (const cmd of GOVERNANCE_MANIFEST.backendGovernance.commands) {
    allManifestPaths.add(`commands/${cmd}.md`);
  }

  const diskFiles = await fg(
    [
      "agents/*.md",
      "skills/*/SKILL.md",
      "rules/**/*.md",
      "commands/*.md",
      "docs/raw/*.md",
      "docs/wiki/**/*.md",
      ".bbg/knowledge/*.md",
      ".bbg/scripts/*.sql",
    ],
    { cwd: root, onlyFiles: true },
  );

  const orphans = diskFiles.filter((f) => !allManifestPaths.has(f.split("\\").join("/")));

  return buildCheck(
    "self-no-orphans",
    "warning",
    orphans.length === 0,
    orphans.length === 0
      ? "no orphaned governance files found"
      : `${orphans.length} orphaned file(s) not in manifest: ${orphans.slice(0, 5).join(", ")}${orphans.length > 5 ? "..." : ""}`,
  );
}

export async function runSelfChecks(packageRoot: string): Promise<SelfCheckResult> {
  const checks: DoctorCheckResult[] = [];

  // Check core agent files
  const coreAgentPaths = GOVERNANCE_MANIFEST.coreAgents.map((a) => `agents/${a}.md`);
  checks.push(await checkFilesExist(packageRoot, "self-agents-exist", "agent", coreAgentPaths));

  // Check core + operations skill files
  const allCoreSkills = [
    ...GOVERNANCE_MANIFEST.coreSkills,
    ...GOVERNANCE_MANIFEST.operationsSkills,
  ];
  const skillPaths = allCoreSkills.map((s) => `skills/${s}/SKILL.md`);
  checks.push(await checkFilesExist(packageRoot, "self-skills-exist", "skill", skillPaths));

  // Check common rule files
  const rulePaths = GOVERNANCE_MANIFEST.commonRules.map((r) => `rules/common/${r}.md`);
  checks.push(await checkFilesExist(packageRoot, "self-rules-exist", "rule", rulePaths));

  // Check core command files
  const cmdPaths = GOVERNANCE_MANIFEST.coreCommands.map((c) => `commands/${c}.md`);
  checks.push(await checkFilesExist(packageRoot, "self-commands-exist", "command", cmdPaths));

  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-wiki-docs-exist",
      "wiki scaffold",
      GOVERNANCE_MANIFEST.wikiDocFiles,
    ),
  );
  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-wiki-skills-exist",
      "wiki skill",
      GOVERNANCE_MANIFEST.wikiSkills.map((skill) => `skills/${skill}/SKILL.md`),
    ),
  );
  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-wiki-compilation-skills-exist",
      "wiki compilation skill",
      GOVERNANCE_MANIFEST.wikiCompilationSkills.map((skill) => `skills/${skill}/SKILL.md`),
    ),
  );
  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-wiki-trust-skills-exist",
      "wiki trust skill",
      GOVERNANCE_MANIFEST.wikiTrustSkills.map((skill) => `skills/${skill}/SKILL.md`),
    ),
  );
  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-wiki-commands-exist",
      "wiki command",
      GOVERNANCE_MANIFEST.wikiCommands.map((cmd) => `commands/${cmd}.md`),
    ),
  );
  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-wiki-compilation-commands-exist",
      "wiki compilation command",
      GOVERNANCE_MANIFEST.wikiCompilationCommands.map((cmd) => `commands/${cmd}.md`),
    ),
  );
  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-wiki-trust-commands-exist",
      "wiki trust command",
      GOVERNANCE_MANIFEST.wikiTrustCommands.map((cmd) => `commands/${cmd}.md`),
    ),
  );
  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-wiki-compiled-docs-exist",
      "compiled wiki doc",
      GOVERNANCE_MANIFEST.wikiCompiledDocFiles,
    ),
  );
  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-wiki-trust-docs-exist",
      "wiki trust doc",
      GOVERNANCE_MANIFEST.wikiTrustDocFiles,
    ),
  );
  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-knowledge-files-exist",
      "knowledge metadata",
      GOVERNANCE_MANIFEST.knowledgeFiles,
    ),
  );
  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-knowledge-scripts-exist",
      "knowledge script",
      GOVERNANCE_MANIFEST.knowledgeScripts.map((s) => `.bbg/scripts/${s}`),
    ),
  );
  checks.push(
    await checkFilesExist(
      packageRoot,
      "self-knowledge-provenance-scripts-exist",
      "knowledge provenance script",
      GOVERNANCE_MANIFEST.knowledgeProvenanceScripts.map((s) => `.bbg/scripts/${s}`),
    ),
  );

  // Check hook files
  const hookPaths = GOVERNANCE_MANIFEST.hookFiles.map((h) => `hooks/${h}`);
  checks.push(await checkFilesExist(packageRoot, "self-hooks-exist", "hook", hookPaths));

  // Check cross-references
  checks.push(await checkCrossReferences(packageRoot));

  // Check for orphaned files
  checks.push(await checkNoOrphanFiles(packageRoot));

  const ok = checks.filter((c) => c.severity === "error" && !c.passed).length === 0;

  return { ok, checks };
}
