import { rm, unlink } from "node:fs/promises";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRepo } from "../analyzers/index.js";
import type { FileHashRecord } from "../config/hash.js";
import { sha256Hex } from "../config/hash.js";
import { parseConfig, serializeConfig } from "../config/read-write.js";
import type { RepoEntry, RepoType, StackInfo } from "../config/schema.js";
import { CLI_VERSION } from "../constants.js";
import { buildTemplateContext } from "../templates/context.js";
import { renderProjectTemplates } from "../templates/render.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";
import { cloneRepo, listRemoteBranches } from "../utils/git.js";
import { promptConfirm, promptInput, promptSelect } from "../utils/prompts.js";
import { runDoctor } from "./doctor.js";

export interface RunAddRepoInput {
  cwd: string;
  url?: string;
  branch?: string;
}

export interface RunAddRepoResult {
  addedRepoName: string;
}

const REPO_TYPE_CHOICES: Array<{ name: RepoType; value: RepoType }> = [
  { name: "backend", value: "backend" },
  { name: "frontend-pc", value: "frontend-pc" },
  { name: "frontend-h5", value: "frontend-h5" },
  { name: "frontend-web", value: "frontend-web" },
  { name: "other", value: "other" },
];

function sanitizePromptValue(value: string, fallback = ""): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function isParseableGitUrl(value: string): boolean {
  const raw = value.trim();
  if (raw.length === 0) {
    return false;
  }

  if (/^[^@\s]+@[^:\s]+:[^\s]+$/.test(raw)) {
    return true;
  }

  try {
    const parsed = new URL(raw);
    return ["https:", "http:", "ssh:", "git:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function inferRepoName(url: string): string {
  const normalized = url.trim().replace(/\/+$/, "");
  const slashName = normalized.split("/").at(-1) ?? normalized;
  const colonName = slashName.split(":").at(-1) ?? slashName;
  const withoutGit = colonName.replace(/\.git$/i, "");
  const safe = withoutGit.trim();
  if (safe.length === 0) {
    throw new Error(`Unable to infer repository name from URL: ${url}`);
  }

  return basename(safe);
}

function normalizeWorkspaceRelativePath(cwd: string, filePath: string): string {
  return relative(cwd, filePath).split(sep).join("/");
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

async function restoreFile(pathValue: string, previousContent: string | null): Promise<void> {
  if (previousContent === null) {
    if (await exists(pathValue)) {
      await unlink(pathValue);
    }
    return;
  }

  await writeTextFile(pathValue, previousContent);
}

async function resolveBuiltinTemplatesRoot(): Promise<string> {
  const commandDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(commandDir, "..", "..", "templates"), join(commandDir, "..", "templates")];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? join(commandDir, "..", "..", "templates");
}

export async function runAddRepo(input: RunAddRepoInput): Promise<RunAddRepoResult> {
  const configPath = join(input.cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  const config = parseConfig(await readTextFile(configPath));
  const resolvedUrl = sanitizePromptValue(
    input.url ?? (await promptInput({ message: "Repository git URL" })),
    "",
  );
  if (!isParseableGitUrl(resolvedUrl)) {
    throw new Error("Repository git URL is invalid. Please provide a parseable git URL.");
  }

  const { branches, credentials } = await listRemoteBranches(resolvedUrl);
  const branchChoices = (branches.length > 0 ? branches : ["main"]).map((branch) => ({
    name: branch,
    value: branch,
  }));
  const resolvedBranch = input.branch
    ? sanitizePromptValue(input.branch)
    : await promptSelect<string>({
        message: "Select default branch",
        choices: branchChoices,
        default: branchChoices[0]?.value,
      });

  if (!branchChoices.some((choice) => choice.value === resolvedBranch)) {
    throw new Error(`Branch ${resolvedBranch} is not available in remote branches.`);
  }

  const repoName = inferRepoName(resolvedUrl);
  const existingIndex = config.repos.findIndex((repo) => repo.name === repoName);
  if (existingIndex !== -1) {
    const overwrite = await promptConfirm({
      message: `Repository ${repoName} is already registered. Overwrite it?`,
      default: false,
    });
    if (!overwrite) {
      throw new Error(`Repository ${repoName} is already registered in config.`);
    }
  }

  const targetDir = join(input.cwd, repoName);
  // Remove existing directory if present so clone doesn't fail
  if (await exists(targetDir)) {
    await rm(targetDir, { recursive: true, force: true });
  }
  let clonedInThisRun = false;
  await cloneRepo({ url: resolvedUrl, branch: resolvedBranch, targetDir, credentials: credentials ?? undefined });
  clonedInThisRun = true;
  const analysis = await analyzeRepo(targetDir);
  const stack = await collectStackInfo(analysis.stack);

  const type = await promptSelect<RepoType>({
    message: "Repository type",
    choices: REPO_TYPE_CHOICES,
    default: "other",
  });
  const description = sanitizePromptValue(
    await promptInput({ message: "Repository description", default: "" }),
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

    const builtinTemplatesRoot = await resolveBuiltinTemplatesRoot();
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

    const existingHashes = previousHashText
      ? (JSON.parse(previousHashText) as FileHashRecord)
      : ({} as FileHashRecord);
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

  return { addedRepoName: repoName };
}
