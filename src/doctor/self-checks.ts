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
  for (const cmds of Object.values(GOVERNANCE_MANIFEST.languageCommands)) {
    for (const cmd of cmds) {
      allManifestPaths.add(`commands/${cmd}.md`);
    }
  }

  const diskFiles = await fg(
    ["agents/*.md", "skills/*/SKILL.md", "rules/**/*.md", "commands/*.md"],
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
