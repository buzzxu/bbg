import { rm, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRepo } from "../analyzers/index.js";
import type { FileHashRecord } from "../config/hash.js";
import { sha256Hex } from "../config/hash.js";
import { parseConfig, serializeConfig } from "../config/read-write.js";
import type { RepoEntry, RepoType } from "../config/schema.js";
import { CLI_VERSION, REPO_TYPE_CHOICES } from "../constants.js";
import { writeRepoRegistrationState } from "../runtime/repos.js";
import { buildTemplateContext } from "../templates/context.js";
import { renderProjectTemplates } from "../templates/render.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";
import { cloneRepo, listRemoteBranches, readLocalRepoMetadata } from "../utils/git.js";
import { inferRepoName, isParseableGitUrl } from "../utils/git-url.js";
import { normalizeWorkspaceRelativePath, resolveBuiltinTemplatesRoot } from "../utils/paths.js";
import { collectStackInfo, promptConfirm, promptInput, promptSelect, sanitizePromptValue } from "../utils/prompts.js";
import { uiText } from "../i18n/ui-copy.js";
import { runAnalyzeCommand } from "./analyze.js";
import { runDoctor } from "./doctor.js";

export interface RunAddRepoInput {
  cwd: string;
  url?: string;
  branch?: string;
  analyze?: boolean;
}

export interface RunAddRepoResult {
  addedRepoName: string;
}

function isWorkspaceChildRelativePath(relativePath: string): boolean {
  return relativePath.length > 0 && !relativePath.startsWith("..") && !relativePath.includes("/");
}

async function restoreFile(pathValue: string, previousContent: string | null): Promise<void> {
  if (previousContent === null) {
    if (await exists(pathValue)) {
      await unlink(pathValue);
    }
    return;
  }

  await writeTextFile(pathValue, previousContent);
}

export async function runAddRepo(input: RunAddRepoInput): Promise<RunAddRepoResult> {
  const configPath = join(input.cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  const config = parseConfig(await readTextFile(configPath));
  const repoSource = sanitizePromptValue(
    input.url ?? (await promptInput({ message: uiText("addRepo.repositoryGitUrlOrLocalPath") })),
    "",
  );
  const localSourcePath = resolve(input.cwd, repoSource);
  const isLocalSource = !isParseableGitUrl(repoSource) && await exists(localSourcePath);

  let resolvedUrl = repoSource;
  let resolvedBranch = sanitizePromptValue(input.branch ?? "", "");
  let repoName: string;
  let targetDir: string;
  let clonedInThisRun = false;

  if (isLocalSource) {
    const localRepo = await readLocalRepoMetadata(input.cwd, localSourcePath);
    if (!isWorkspaceChildRelativePath(localRepo.relativePath)) {
      throw new Error("Local repository path must be a direct child of the current workspace root.");
    }

    resolvedUrl = localRepo.remoteUrl;
    resolvedBranch = resolvedBranch || localRepo.branch;
    repoName = localRepo.name;
    targetDir = localRepo.absolutePath;
  } else {
    if (!isParseableGitUrl(repoSource)) {
      throw new Error("Repository git URL or local path is invalid. Provide a parseable git URL or an existing local git repository path.");
    }

    const { branches, credentials } = await listRemoteBranches(repoSource);
    const branchChoices = (branches.length > 0 ? branches : ["main"]).map((branch) => ({
      name: branch,
      value: branch,
    }));
    resolvedBranch = resolvedBranch
      ? resolvedBranch
      : await promptSelect<string>({
          message: uiText("addRepo.selectDefaultBranch"),
          choices: branchChoices,
          default: branchChoices[0]?.value,
        });

    if (!branchChoices.some((choice) => choice.value === resolvedBranch)) {
      throw new Error(`Branch ${resolvedBranch} is not available in remote branches.`);
    }

    repoName = inferRepoName(repoSource);
    targetDir = join(input.cwd, repoName);

    if (await exists(targetDir)) {
      await rm(targetDir, { recursive: true, force: true });
    }
    await cloneRepo({ url: repoSource, branch: resolvedBranch, targetDir, credentials: credentials ?? undefined });
    clonedInThisRun = true;
  }

  const existingIndex = config.repos.findIndex((repo) => repo.name === repoName);
  if (existingIndex !== -1) {
    const overwrite = await promptConfirm({
      message: uiText("addRepo.repositoryAlreadyRegistered", { value: repoName }),
      default: false,
    });
    if (!overwrite) {
      throw new Error(`Repository ${repoName} is already registered in config.`);
    }
  }

  const analysis = await analyzeRepo(targetDir);
  const stack = await collectStackInfo(analysis.stack);

  const type = await promptSelect<RepoType>({
    message: uiText("addRepo.repositoryType"),
    choices: REPO_TYPE_CHOICES,
    default: "other",
  });
  const description = sanitizePromptValue(
    await promptInput({ message: uiText("addRepo.repositoryDescription"), default: "" }),
    "",
  );

  const repoEntry: RepoEntry = {
    name: repoName,
    gitUrl: resolvedUrl,
    branch: resolvedBranch,
    type,
    stack,
    description,
  };
  const hashPath = join(input.cwd, ".bbg", "file-hashes.json");
  const rootAgentsPath = join(input.cwd, "AGENTS.md");
  const childAgentsPath = join(targetDir, "AGENTS.md");

  const [previousConfigText, previousHashText, previousRootAgentsText, previousChildAgentsText] = await Promise.all([
    readTextFile(configPath),
    (await exists(hashPath)) ? readTextFile(hashPath) : Promise.resolve<string | null>(null),
    (await exists(rootAgentsPath)) ? readTextFile(rootAgentsPath) : Promise.resolve<string | null>(null),
    (await exists(childAgentsPath)) ? readTextFile(childAgentsPath) : Promise.resolve<string | null>(null),
  ]);

  const nextRepos =
    existingIndex !== -1
      ? config.repos.map((repo, i) => (i === existingIndex ? repoEntry : repo))
      : [...config.repos, repoEntry];

  const nextConfig = {
    ...config,
    repos: nextRepos,
    updatedAt: new Date().toISOString(),
  };

  try {
    await writeTextFile(configPath, serializeConfig(nextConfig));

    const commandDir = dirname(fileURLToPath(import.meta.url));
    const builtinTemplatesRoot = await resolveBuiltinTemplatesRoot(commandDir);
    const templateContext = buildTemplateContext(nextConfig);

    const [rootAgentsFiles, childAgentsFiles] = await Promise.all([
      renderProjectTemplates({
        workspaceRoot: input.cwd,
        builtinTemplatesRoot,
        context: templateContext,
        templates: [{ source: "handlebars/AGENTS.md.hbs", destination: "AGENTS.md", mode: "handlebars" }],
      }),
      renderProjectTemplates({
        workspaceRoot: input.cwd,
        builtinTemplatesRoot,
        context: { ...templateContext, repo: repoEntry },
        templates: [
          {
            source: "handlebars/child-AGENTS.md.hbs",
            destination: `${repoName}/AGENTS.md`,
            mode: "handlebars",
          },
        ],
      }),
    ]);

    const existingHashes = previousHashText ? (JSON.parse(previousHashText) as FileHashRecord) : ({} as FileHashRecord);
    const generatedAt = new Date().toISOString();
    const trackedFiles = [configPath, ...rootAgentsFiles, ...childAgentsFiles];
    for (const trackedFile of trackedFiles) {
      const content = await readTextFile(trackedFile);
      existingHashes[normalizeWorkspaceRelativePath(input.cwd, trackedFile)] = {
        generatedHash: sha256Hex(content),
        generatedAt,
        templateVersion: CLI_VERSION,
      };
    }
    await writeTextFile(hashPath, `${JSON.stringify(existingHashes, null, 2)}\n`);

    const doctorResult = await runDoctor({ cwd: input.cwd });
    if (!doctorResult.ok) {
      throw new Error("add-repo validation failed: bbg doctor reported errors.");
    }
  } catch (error: unknown) {
    const rollbackTasks: Array<Promise<unknown>> = [
      writeTextFile(configPath, previousConfigText),
      restoreFile(rootAgentsPath, previousRootAgentsText),
      restoreFile(childAgentsPath, previousChildAgentsText),
      restoreFile(hashPath, previousHashText),
    ];

    if (clonedInThisRun) {
      rollbackTasks.push(rm(targetDir, { recursive: true, force: true }));
    }

    await Promise.allSettled(rollbackTasks);

    throw error;
  }

  const shouldAnalyzeNow = input.analyze ?? true;
  let analyzeStatus: "completed" | "pending" | "failed" = "pending";
  let workspaceFusionStatus: "completed" | "pending" | "failed" = "pending";

  if (shouldAnalyzeNow) {
    try {
      await runAnalyzeCommand({ cwd: input.cwd, repos: [repoName] });
      analyzeStatus = "completed";
      workspaceFusionStatus = "completed";
    } catch {
      analyzeStatus = "failed";
      workspaceFusionStatus = "failed";
    }
  }

  await writeRepoRegistrationState(input.cwd, {
    version: 1,
    name: repoName,
    source: resolvedUrl || normalizeWorkspaceRelativePath(input.cwd, targetDir),
    branch: resolvedBranch,
    registeredAt: new Date().toISOString(),
    analyzeStatus,
    workspaceFusionStatus,
  });

  return { addedRepoName: repoName };
}
