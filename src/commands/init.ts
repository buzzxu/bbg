import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRepo } from "../analyzers/index.js";
import { serializeConfig } from "../config/read-write.js";
import type { FileHashRecord } from "../config/hash.js";
import { sha256Hex } from "../config/hash.js";
import type { BbgConfig, RepoEntry, RepoType, StackInfo } from "../config/schema.js";
import { CLI_VERSION, DEFAULT_STACK, MANAGED_GITIGNORE_BLOCK_END, MANAGED_GITIGNORE_BLOCK_START, REPO_TYPE_CHOICES } from "../constants.js";
import { buildTemplateContext } from "../templates/context.js";
import { buildGovernanceManifest } from "../templates/governance.js";
import { renderProjectTemplates, type RenderTemplateTask } from "../templates/render.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";
import { cloneRepo, ensureGitAvailable, listRemoteBranches } from "../utils/git.js";
import { inferRepoName, isParseableGitUrl } from "../utils/git-url.js";
import {
  normalizeWorkspaceRelativePath,
  resolveBuiltinTemplatesRoot,
  resolvePackageRoot,
  toSnapshotRelativePath,
} from "../utils/paths.js";
import { makeExecutable } from "../utils/platform.js";
import { promptConfirm, promptInput, promptSelect, sanitizePromptValue } from "../utils/prompts.js";
import { runDoctor, type RunDoctorResult } from "./doctor.js";

export interface RunInitOptions {
  cwd: string;
  yes: boolean;
  dryRun: boolean;
}

export interface RunInitResult {
  createdFiles: string[];
  clonedRepos: string[];
  doctor: RunDoctorResult;
}

const ROOT_TEMPLATE_MANIFEST: RenderTemplateTask[] = [
  { source: "handlebars/AGENTS.md.hbs", destination: "AGENTS.md", mode: "handlebars" },
  { source: "handlebars/CLAUDE.md.hbs", destination: "CLAUDE.md", mode: "handlebars" },
  { source: "handlebars/RULES.md.hbs", destination: "RULES.md", mode: "handlebars" },
  { source: "handlebars/README.md.hbs", destination: "README.md", mode: "handlebars" },
  {
    source: "generic/docs/workflows/code-review-policy.md",
    destination: "docs/workflows/code-review-policy.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/cross-audit-policy.md",
    destination: "docs/workflows/cross-audit-policy.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/harness-engineering-playbook.md",
    destination: "docs/workflows/harness-engineering-playbook.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/ai-task-prompt-template.md",
    destination: "docs/workflows/ai-task-prompt-template.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/requirement-template.md",
    destination: "docs/workflows/requirement-template.md",
    mode: "copy",
  },
  {
    source: "generic/docs/security/backend-red-team-playbook.md",
    destination: "docs/security/backend-red-team-playbook.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/regression-checklist.md",
    destination: "docs/workflows/regression-checklist.md",
    mode: "copy",
  },
  {
    source: "generic/docs/tasks/TEMPLATE.md",
    destination: "docs/tasks/TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/changes/TEMPLATE.md",
    destination: "docs/changes/TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/handoffs/TEMPLATE.md",
    destination: "docs/handoffs/TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/reports/cross-audit-report-TEMPLATE.md",
    destination: "docs/reports/cross-audit-report-TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/reports/red-team-report-TEMPLATE.md",
    destination: "docs/reports/red-team-report-TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/cleanup/secrets-and-config-governance.md",
    destination: "docs/cleanup/secrets-and-config-governance.md",
    mode: "copy",
  },
  {
    source: "generic/docs/environments/env-overview.md",
    destination: "docs/environments/env-overview.md",
    mode: "copy",
  },
  {
    source: "handlebars/docs/architecture/order-lifecycle.md.hbs",
    destination: "docs/architecture/order-lifecycle.md",
    mode: "handlebars",
  },
  {
    source: "scaffold/docs/domains/core.md",
    destination: "docs/domains/core.md",
    mode: "copy",
  },
  {
    source: "handlebars/docs/system-architecture-and-ai-workflow.md.hbs",
    destination: "docs/system-architecture-and-ai-workflow.md",
    mode: "handlebars",
  },
  {
    source: "handlebars/docs/workflows/development-standards.md.hbs",
    destination: "docs/workflows/development-standards.md",
    mode: "handlebars",
  },
  {
    source: "handlebars/docs/workflows/release-checklist.md.hbs",
    destination: "docs/workflows/release-checklist.md",
    mode: "handlebars",
  },
  {
    source: "handlebars/.githooks/pre-commit.hbs",
    destination: ".githooks/pre-commit",
    mode: "handlebars",
  },
  {
    source: "handlebars/.githooks/pre-push.hbs",
    destination: ".githooks/pre-push",
    mode: "handlebars",
  },
  {
    source: "handlebars/scripts/doctor.py.hbs",
    destination: "scripts/doctor.py",
    mode: "handlebars",
  },
  {
    source: "handlebars/scripts/sync_versions.py.hbs",
    destination: "scripts/sync_versions.py",
    mode: "handlebars",
  },
];

/* ------------------------------------------------------------------ */
/*  AI tool config templates — deployed alongside governance files     */
/* ------------------------------------------------------------------ */

const TOOL_CONFIG_TEMPLATES: RenderTemplateTask[] = [
  // Claude Code
  { source: "generic/.claude/settings.json", destination: ".claude/settings.json", mode: "copy" },
  { source: "generic/.claude/commands/plan.md", destination: ".claude/commands/plan.md", mode: "copy" },
  { source: "generic/.claude/commands/tdd.md", destination: ".claude/commands/tdd.md", mode: "copy" },
  { source: "generic/.claude/commands/code-review.md", destination: ".claude/commands/code-review.md", mode: "copy" },
  { source: "generic/.claude/commands/build-fix.md", destination: ".claude/commands/build-fix.md", mode: "copy" },
  { source: "generic/.claude/commands/security-scan.md", destination: ".claude/commands/security-scan.md", mode: "copy" },
  // Cursor
  { source: "generic/.cursor/rules/standards.mdc", destination: ".cursor/rules/standards.mdc", mode: "copy" },
  { source: "generic/.cursor/rules/security.mdc", destination: ".cursor/rules/security.mdc", mode: "copy" },
  { source: "generic/.cursor/rules/testing.mdc", destination: ".cursor/rules/testing.mdc", mode: "copy" },
  // OpenCode
  { source: "generic/.opencode/opencode.json", destination: ".opencode/opencode.json", mode: "copy" },
  { source: "generic/.opencode/instructions/coding-standards.md", destination: ".opencode/instructions/coding-standards.md", mode: "copy" },
  { source: "generic/.opencode/instructions/security.md", destination: ".opencode/instructions/security.md", mode: "copy" },
  { source: "generic/.opencode/commands/plan.md", destination: ".opencode/commands/plan.md", mode: "copy" },
  { source: "generic/.opencode/commands/tdd.md", destination: ".opencode/commands/tdd.md", mode: "copy" },
  { source: "generic/.opencode/commands/code-review.md", destination: ".opencode/commands/code-review.md", mode: "copy" },
  { source: "generic/.opencode/commands/build-fix.md", destination: ".opencode/commands/build-fix.md", mode: "copy" },
  { source: "generic/.opencode/commands/security.md", destination: ".opencode/commands/security.md", mode: "copy" },
  { source: "generic/.opencode/commands/doctor.md", destination: ".opencode/commands/doctor.md", mode: "copy" },
  // Codex CLI
  { source: "generic/.codex/config.toml", destination: ".codex/config.toml", mode: "copy" },
  { source: "handlebars/.codex/AGENTS.md.hbs", destination: ".codex/AGENTS.md", mode: "handlebars" },
  // GitHub Copilot
  { source: "handlebars/.github/copilot-instructions.md.hbs", destination: ".github/copilot-instructions.md", mode: "handlebars" },
  // Kiro
  { source: "generic/.kiro/steering/coding-style.md", destination: ".kiro/steering/coding-style.md", mode: "copy" },
  { source: "generic/.kiro/steering/security.md", destination: ".kiro/steering/security.md", mode: "copy" },
  { source: "generic/.kiro/steering/testing.md", destination: ".kiro/steering/testing.md", mode: "copy" },
];

export function getRootTemplateManifest(): RenderTemplateTask[] {
  return ROOT_TEMPLATE_MANIFEST.map((template) => ({ ...template }));
}

export function getToolConfigTemplates(): RenderTemplateTask[] {
  return TOOL_CONFIG_TEMPLATES.map((template) => ({ ...template }));
}

export function buildTemplatePlan(config: BbgConfig): RenderTemplateTask[] {
  const childAgentTemplates: RenderTemplateTask[] = config.repos.map((repo) => ({
    source: "handlebars/child-AGENTS.md.hbs",
    destination: `${repo.name}/AGENTS.md`,
    mode: "handlebars",
  }));

  const ctx = buildTemplateContext(config);
  const governanceTemplates = buildGovernanceManifest(ctx);

  return [
    ...getRootTemplateManifest(),
    ...getToolConfigTemplates(),
    ...governanceTemplates,
    ...childAgentTemplates,
  ];
}

function buildBaselineConfig(nowIso: string): BbgConfig {
  return {
    version: CLI_VERSION,
    projectName: "bbg-project",
    projectDescription: "Generated by bbg init",
    createdAt: nowIso,
    updatedAt: nowIso,
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
  };
}

function buildPlannedFiles(cwd: string, config: BbgConfig): string[] {
  const plannedTemplateFiles = buildTemplatePlan(config).map((template) => join(cwd, template.destination));
  return [join(cwd, ".bbg", "config.json"), join(cwd, ".bbg", "file-hashes.json"), join(cwd, ".gitignore"), ...plannedTemplateFiles];
}

async function collectStackInfo(detectedStack: StackInfo): Promise<StackInfo> {
  const useDetectedStack = await promptConfirm({ message: "Use detected stack info?", default: true });
  if (useDetectedStack) {
    return detectedStack;
  }

  return {
    language: sanitizePromptValue(
      await promptInput({ message: "Stack language", default: detectedStack.language }),
      detectedStack.language,
    ),
    framework: sanitizePromptValue(
      await promptInput({ message: "Stack framework", default: detectedStack.framework }),
      detectedStack.framework,
    ),
    buildTool: sanitizePromptValue(
      await promptInput({ message: "Stack build tool", default: detectedStack.buildTool }),
      detectedStack.buildTool,
    ),
    testFramework: sanitizePromptValue(
      await promptInput({ message: "Stack test framework", default: detectedStack.testFramework }),
      detectedStack.testFramework,
    ),
    packageManager: sanitizePromptValue(
      await promptInput({ message: "Stack package manager", default: detectedStack.packageManager }),
      detectedStack.packageManager,
    ),
  };
}

function parseRiskThresholdInput(
  raw: string,
  fallback: { grade: string; minScore: number },
): { grade: string; minScore: number } {
  const parts = raw.split(":").map((part) => part.trim());
  if (parts.length !== 2 || parts[0]?.length === 0) {
    return fallback;
  }

  const score = Number(parts[1]);
  if (!Number.isFinite(score)) {
    return fallback;
  }

  return {
    grade: parts[0],
    minScore: score,
  };
}

interface InitCollectionResult {
  config: BbgConfig;
  clonedRepos: string[];
}

async function collectInitConfig(nowIso: string, options: RunInitOptions): Promise<InitCollectionResult> {
  const defaults = buildBaselineConfig(nowIso);
  if (options.yes) {
    return {
      config: defaults,
      clonedRepos: [],
    };
  }

  await ensureGitAvailable();

  const projectName = sanitizePromptValue(
    await promptInput({ message: "Project name", default: defaults.projectName }),
    defaults.projectName,
  );
  const projectDescription = sanitizePromptValue(
    await promptInput({ message: "Project description", default: defaults.projectDescription }),
    defaults.projectDescription,
  );

  const repos: RepoEntry[] = [];
  const clonedRepos: string[] = [];
  let shouldAddRepo = await promptConfirm({ message: "Add repository now?", default: true });

  while (shouldAddRepo) {
    const gitUrl = sanitizePromptValue(
      await promptInput({ message: "Repository git URL" }),
      "",
    );
    if (!isParseableGitUrl(gitUrl)) {
      throw new Error("Repository git URL is invalid. Please provide a parseable git URL.");
    }
    const remoteBranches = await listRemoteBranches(gitUrl);
    const branchChoices = (remoteBranches.length > 0 ? remoteBranches : ["main"]).map((branch) => ({
      name: branch,
      value: branch,
    }));
    const branch = await promptSelect<string>({
      message: "Select default branch",
      choices: branchChoices,
      default: branchChoices[0]?.value,
    });
    const repoName = inferRepoName(gitUrl);
    const targetDir = join(options.cwd, repoName);

    let stack = DEFAULT_STACK;
    if (!options.dryRun) {
      await cloneRepo({ url: gitUrl, branch, targetDir });
      clonedRepos.push(targetDir);
      const analysis = await analyzeRepo(targetDir);
      stack = await collectStackInfo(analysis.stack);
    }

    const type = await promptSelect<RepoType>({
      message: "Repository type",
      choices: REPO_TYPE_CHOICES,
      default: "other",
    });
    const description = sanitizePromptValue(
      await promptInput({ message: "Repository description", default: "" }),
      "",
    );

    repos.push({
      name: repoName,
      gitUrl,
      branch,
      type,
      stack,
      description,
    });

    shouldAddRepo = await promptConfirm({ message: "Add another repository?", default: false });
  }

  const overrideThresholds = await promptConfirm({
    message: "Override default governance risk thresholds?",
    default: false,
  });

  const riskThresholds = overrideThresholds
    ? {
        high: parseRiskThresholdInput(
          await promptInput({ message: "High risk threshold (GRADE:score)", default: "A+:99" }),
          defaults.governance.riskThresholds.high,
        ),
        medium: parseRiskThresholdInput(
          await promptInput({ message: "Medium risk threshold (GRADE:score)", default: "A:95" }),
          defaults.governance.riskThresholds.medium,
        ),
        low: parseRiskThresholdInput(
          await promptInput({ message: "Low risk threshold (GRADE:score)", default: "B:85" }),
          defaults.governance.riskThresholds.low,
        ),
      }
    : defaults.governance.riskThresholds;

  const enableRedTeam = await promptConfirm({
    message: "Enable red-team workflow?",
    default: defaults.governance.enableRedTeam,
  });
  const enableCrossAudit = await promptConfirm({
    message: "Enable cross-audit workflow?",
    default: defaults.governance.enableCrossAudit,
  });

  return {
    config: {
      ...defaults,
      projectName,
      projectDescription,
      repos,
      governance: {
        riskThresholds,
        enableRedTeam,
        enableCrossAudit,
      },
    },
    clonedRepos,
  };
}

function buildRepoIgnoreEntries(repos: RepoEntry[]): string[] {
  const seen = new Set<string>();
  const entries: string[] = [];

  for (const repo of repos) {
    const cleanedName = repo.name.trim().replace(/^\/+|\/+$/g, "");
    if (cleanedName.length === 0 || seen.has(cleanedName)) {
      continue;
    }

    seen.add(cleanedName);
    entries.push(`${cleanedName}/`);
  }

  return entries;
}

async function ensureRootGitignore(cwd: string, repos: RepoEntry[]): Promise<string> {
  const gitignorePath = join(cwd, ".gitignore");
  const hasGitignore = await exists(gitignorePath);
  const existingContent = hasGitignore ? await readTextFile(gitignorePath) : "";
  const originalLines = existingContent.length > 0 ? existingContent.split(/\r?\n/) : [];
  const lines = [...originalLines];
  const managedStartIndex = lines.findIndex((line) => line.trim() === MANAGED_GITIGNORE_BLOCK_START);
  const managedEndIndex = lines.findIndex((line, index) => index > managedStartIndex && line.trim() === MANAGED_GITIGNORE_BLOCK_END);

  if (managedStartIndex >= 0 && managedEndIndex > managedStartIndex) {
    lines.splice(managedStartIndex, managedEndIndex - managedStartIndex + 1);
  }

  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
    lines.pop();
  }

  const managedEntries = buildRepoIgnoreEntries(repos);
  if (managedEntries.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push(MANAGED_GITIGNORE_BLOCK_START, ...managedEntries, MANAGED_GITIGNORE_BLOCK_END);
  }

  const outputLines = lines;
  await writeTextFile(gitignorePath, `${outputLines.join("\n")}\n`);
  return gitignorePath;
}

export async function runInit(options: RunInitOptions): Promise<RunInitResult> {
  const bbgDirPath = join(options.cwd, ".bbg");
  if (await exists(bbgDirPath)) {
    throw new Error(
      "Initialization aborted: .bbg already exists. Run `bbg upgrade` to refresh generated files.",
    );
  }

  const nowIso = new Date().toISOString();
  const initData = await collectInitConfig(nowIso, options);
  const baselineConfig = initData.config;
  const plannedFiles = buildPlannedFiles(options.cwd, baselineConfig);
  if (options.dryRun) {
    return {
      createdFiles: plannedFiles,
      clonedRepos: initData.clonedRepos,
      doctor: {
        ok: true,
        mode: "full",
        checks: [],
        errors: [],
        warnings: [],
        info: [],
        exitCode: 0,
        fixesApplied: [],
      },
    };
  }

  const configPath = plannedFiles[0];
  const fileHashesPath = plannedFiles[1];
  const gitignorePath = plannedFiles[2];

  await writeTextFile(configPath, serializeConfig(baselineConfig));
  await ensureRootGitignore(options.cwd, baselineConfig.repos);

  const commandDir = dirname(fileURLToPath(import.meta.url));
  const builtinTemplatesRoot = await resolveBuiltinTemplatesRoot(commandDir);
  const packageRoot = await resolvePackageRoot(commandDir);
  const templateContext = buildTemplateContext(baselineConfig);
  const governanceTemplates = buildGovernanceManifest(templateContext);

  const rootRenderedFiles = await renderProjectTemplates({
    workspaceRoot: options.cwd,
    builtinTemplatesRoot,
    packageRoot,
    context: templateContext,
    templates: [...ROOT_TEMPLATE_MANIFEST, ...TOOL_CONFIG_TEMPLATES],
  });

  const governanceRenderedFiles = await renderProjectTemplates({
    workspaceRoot: options.cwd,
    builtinTemplatesRoot,
    packageRoot,
    context: templateContext,
    templates: governanceTemplates,
  });

  makeExecutable(join(options.cwd, ".githooks", "pre-commit"));
  makeExecutable(join(options.cwd, ".githooks", "pre-push"));

  const childAgentFiles: string[] = [];
  for (const repo of baselineConfig.repos) {
    const childRendered = await renderProjectTemplates({
      workspaceRoot: options.cwd,
      builtinTemplatesRoot,
      packageRoot,
      context: { ...templateContext, repo },
      templates: [
        {
          source: "handlebars/child-AGENTS.md.hbs",
          destination: `${repo.name}/AGENTS.md`,
          mode: "handlebars",
        },
      ],
    });
    childAgentFiles.push(...childRendered);
  }

  const generatedAt = new Date().toISOString();
  const hashRecord: FileHashRecord = {};
  const trackedFiles = [configPath, gitignorePath, ...rootRenderedFiles, ...governanceRenderedFiles, ...childAgentFiles];
  for (const generatedFile of trackedFiles) {
    const content = await readTextFile(generatedFile);
    const relativePath = normalizeWorkspaceRelativePath(options.cwd, generatedFile);
    hashRecord[relativePath] = {
      generatedHash: sha256Hex(content),
      generatedAt,
      templateVersion: CLI_VERSION,
    };
    await writeTextFile(join(options.cwd, toSnapshotRelativePath(relativePath)), content);
  }

  await writeTextFile(fileHashesPath, `${JSON.stringify(hashRecord, null, 2)}\n`);

  const doctorResult = await runDoctor({ cwd: options.cwd });

  if (!doctorResult.ok) {
    const failedChecks = doctorResult.checks
      .filter((check) => check.severity === "error" && !check.passed)
      .map((check) => check.checkId)
      .join(", ");
    throw new Error(`Initialization validation failed (${doctorResult.mode}): ${failedChecks}`);
  }

  return {
    createdFiles: [configPath, fileHashesPath, gitignorePath, ...rootRenderedFiles, ...governanceRenderedFiles, ...childAgentFiles],
    clonedRepos: initData.clonedRepos,
    doctor: doctorResult,
  };
}
