import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serializeConfig } from "../config/read-write.js";
import type { FileHashRecord } from "../config/hash.js";
import { sha256Hex } from "../config/hash.js";
import type { BbgConfig } from "../config/schema.js";
import { CLI_VERSION } from "../constants.js";
import { buildTemplateContext } from "../templates/context.js";
import { buildGovernanceManifest } from "../templates/governance.js";
import { renderProjectTemplates } from "../templates/render.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";
import {
  normalizeWorkspaceRelativePath,
  resolveBuiltinTemplatesRoot,
  resolvePackageRoot,
  toSnapshotRelativePath,
} from "../utils/paths.js";
import { makeExecutable } from "../utils/platform.js";
import { runDoctor, type RunDoctorResult } from "./doctor.js";
import { ROOT_TEMPLATE_MANIFEST, TOOL_CONFIG_TEMPLATES, buildTemplatePlan } from "./init-manifest.js";
import { collectInitConfig } from "./init-prompts.js";
import { ensureRootGitignore } from "./init-gitignore.js";

/* ------------------------------------------------------------------ */
/*  Re-exports for backward compatibility (upgrade.ts, tests, etc.)   */
/* ------------------------------------------------------------------ */

export { getRootTemplateManifest, getToolConfigTemplates, buildTemplatePlan } from "./init-manifest.js";
export type { InitCollectionResult } from "./init-prompts.js";
export { collectInitConfig } from "./init-prompts.js";
export { buildRepoIgnoreEntries, ensureRootGitignore } from "./init-gitignore.js";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Planning helper                                                    */
/* ------------------------------------------------------------------ */

function buildPlannedFiles(cwd: string, config: BbgConfig): string[] {
  const plannedTemplateFiles = buildTemplatePlan(config).map((template) => join(cwd, template.destination));
  return [join(cwd, ".bbg", "config.json"), join(cwd, ".bbg", "file-hashes.json"), join(cwd, ".gitignore"), ...plannedTemplateFiles];
}

/* ------------------------------------------------------------------ */
/*  Main orchestrator                                                  */
/* ------------------------------------------------------------------ */

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
