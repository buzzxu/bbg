import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FileHashRecord } from "../config/hash.js";
import { sha256Hex } from "../config/hash.js";
import { parseConfig, serializeConfig } from "../config/read-write.js";
import type { RepoEntry } from "../config/schema.js";
import { CLI_VERSION } from "../constants.js";
import { buildTemplateContext } from "../templates/context.js";
import { buildGovernanceManifest } from "../templates/governance.js";
import { buildTemplatePlan, getRootTemplateManifest, getToolConfigTemplates } from "./init.js";
import { renderTemplateContents } from "../templates/render.js";
import { createUnifiedPatch } from "../upgrade/diff.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";
import {
  resolveBuiltinTemplatesRoot,
  resolvePackageRoot,
  toSnapshotRelativePath,
} from "../utils/paths.js";
import { promptConfirm } from "../utils/prompts.js";

export interface RunUpgradeInput {
  cwd: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface RunUpgradeResult {
  overwritten: string[];
  patches: string[];
  skipped: string[];
  skippedWithNotice: string[];
  skippedDeletedTemplate: string[];
  created: string[];
}

interface TrackedFile {
  path: string;
  nextContent: string | null;
  previousHash?: string;
  missingRepoContext?: boolean;
}

function tryExtractChildAgentsRepoName(filePath: string): string | null {
  const normalizedPath = filePath.split("\\").join("/");
  const match = normalizedPath.match(/^([^/]+)\/AGENTS\.md$/);
  return match?.[1] ?? null;
}

function toPatchRelativePath(filePath: string): string {
  return `.bbg/upgrade-patches/${filePath}.patch`.split("\\").join("/");
}

async function loadSnapshot(cwd: string, filePath: string): Promise<string | null> {
  const snapshotPath = join(cwd, toSnapshotRelativePath(filePath));
  if (!(await exists(snapshotPath))) {
    return null;
  }

  return readTextFile(snapshotPath);
}

async function writeSnapshot(cwd: string, filePath: string, content: string): Promise<void> {
  await writeTextFile(join(cwd, toSnapshotRelativePath(filePath)), content);
}

async function buildTrackedFiles(cwd: string, hashRecord: FileHashRecord): Promise<TrackedFile[]> {
  const config = parseConfig(await readTextFile(join(cwd, ".bbg", "config.json")));
  const commandDir = dirname(fileURLToPath(import.meta.url));
  const builtinTemplatesRoot = await resolveBuiltinTemplatesRoot(commandDir, [
    join(cwd, "node_modules", "bbg", "templates"),
  ]);
  const packageRoot = await resolvePackageRoot(commandDir);

  const baseContext = buildTemplateContext(config);
  const governanceTemplates = buildGovernanceManifest(baseContext);

  const rootRendered = await renderTemplateContents({
    workspaceRoot: cwd,
    builtinTemplatesRoot,
    packageRoot,
    context: baseContext,
    templates: [...getRootTemplateManifest(), ...getToolConfigTemplates()],
  });

  const governanceRendered = await renderTemplateContents({
    workspaceRoot: cwd,
    builtinTemplatesRoot,
    packageRoot,
    context: baseContext,
    templates: governanceTemplates,
  });

  const childRenderedByRepo = await Promise.all(
    config.repos.map((repo) =>
      renderTemplateContents({
        workspaceRoot: cwd,
        builtinTemplatesRoot,
        packageRoot,
        context: { ...baseContext, repo },
        templates: [
          {
            source: "handlebars/child-AGENTS.md.hbs",
            destination: `${repo.name}/AGENTS.md`,
            mode: "handlebars",
          },
        ],
      }),
    ),
  );
  const rendered = [...rootRendered, ...governanceRendered, ...childRenderedByRepo.flat()];

  const renderedByPath = new Map(rendered.map((item) => [item.destination, item.content]));

  const repoByName = new Map<string, RepoEntry>(config.repos.map((repo) => [repo.name, repo]));
  const trackedFromHashes = Object.keys(hashRecord)
    .sort((a, b) => a.localeCompare(b))
    .map((path) => {
      const nextContent = renderedByPath.get(path) ?? null;
      const childRepoName = tryExtractChildAgentsRepoName(path);
      const missingRepoContext = childRepoName !== null && nextContent === null && !repoByName.has(childRepoName);
      return {
        path,
        nextContent,
        previousHash: hashRecord[path]?.generatedHash,
        missingRepoContext,
      };
    });

  const trackedSet = new Set(trackedFromHashes.map((item) => item.path));
  const newlyIntroducedManifestFiles = rendered
    .filter((item) => !trackedSet.has(item.destination))
    .map((item) => ({
      path: item.destination,
      nextContent: item.content,
      previousHash: undefined,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return [...trackedFromHashes, ...newlyIntroducedManifestFiles];
}

function buildMissingBaselineNotice(filePath: string, nextContent: string): string {
  const previewLines = nextContent.split(/\r?\n/).slice(0, 40);
  const previewBody = previewLines.join("\n");
  return [
    "# BASELINE UNAVAILABLE",
    `# file: ${filePath}`,
    "# old-generated snapshot unavailable for a user-modified file",
    "# deterministic handling: file is skippedWithNotice and not auto-overwritten",
    "# new generated content preview:",
    previewBody,
    "",
  ].join("\n");
}

function buildMissingChildRepoContextNotice(filePath: string): string {
  const repoName = tryExtractChildAgentsRepoName(filePath) ?? "<unknown-repo>";
  return [
    "# CHILD AGENTS REPO CONTEXT MISSING",
    `# file: ${filePath}`,
    `# repo: ${repoName}`,
    "# expected repo entry missing in .bbg/config.json repos[]",
    "# deterministic handling: file is skippedWithNotice and not auto-overwritten",
    "# action: add/update repo entry then rerun `bbg upgrade`",
    "",
  ].join("\n");
}

export async function runUpgrade(input: RunUpgradeInput): Promise<RunUpgradeResult> {
  const configPath = join(input.cwd, ".bbg", "config.json");
  const hashPath = join(input.cwd, ".bbg", "file-hashes.json");

  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  if (!(await exists(hashPath))) {
    throw new Error(".bbg/file-hashes.json not found. Run `bbg init` first.");
  }

  const hashRecord = JSON.parse(await readTextFile(hashPath)) as FileHashRecord;
  const trackedFiles = await buildTrackedFiles(input.cwd, hashRecord);

  if (input.force) {
    const confirmed = await promptConfirm({
      message: `Force overwrite ${trackedFiles.length} generated files?`,
      default: false,
    });
    if (!confirmed) {
      throw new Error("Upgrade aborted: force overwrite requires explicit confirmation.");
    }
  }

  const overwritten: string[] = [];
  const patches: string[] = [];
  const skipped: string[] = [];
  const skippedWithNotice: string[] = [];
  const skippedDeletedTemplate: string[] = [];
  const created: string[] = [];
  const nextHashes: FileHashRecord = { ...hashRecord };
  const nowIso = new Date().toISOString();

  for (const trackedFile of trackedFiles) {
    const absolutePath = join(input.cwd, trackedFile.path);
    const nextContent = trackedFile.nextContent;

    if (trackedFile.missingRepoContext) {
      const patchRelativePath = toPatchRelativePath(trackedFile.path);
      patches.push(patchRelativePath);
      skippedWithNotice.push(trackedFile.path);
      if (!input.dryRun) {
        await writeTextFile(join(input.cwd, patchRelativePath), buildMissingChildRepoContextNotice(trackedFile.path));
      }
      continue;
    }

    if (nextContent === null) {
      skippedDeletedTemplate.push(trackedFile.path);
      continue;
    }

    const hasCurrentFile = await exists(absolutePath);

    if (!hasCurrentFile) {
      if (trackedFile.previousHash) {
        skipped.push(trackedFile.path);
        continue;
      }

      created.push(trackedFile.path);
      if (!input.dryRun) {
        await writeTextFile(absolutePath, nextContent);
        await writeSnapshot(input.cwd, trackedFile.path, nextContent);
        nextHashes[trackedFile.path] = {
          generatedHash: sha256Hex(nextContent),
          generatedAt: nowIso,
          templateVersion: CLI_VERSION,
        };
      }
      continue;
    }

    const currentContent = await readTextFile(absolutePath);
    const currentHash = sha256Hex(currentContent);
    const snapshotContent = await loadSnapshot(input.cwd, trackedFile.path);
    const oldGeneratedContent =
      snapshotContent ?? (trackedFile.previousHash && currentHash === trackedFile.previousHash ? currentContent : null);

    if (!trackedFile.previousHash) {
      const patchRelativePath = toPatchRelativePath(trackedFile.path);
      patches.push(patchRelativePath);
      skippedWithNotice.push(trackedFile.path);
      if (!input.dryRun) {
        await writeTextFile(join(input.cwd, patchRelativePath), buildMissingBaselineNotice(trackedFile.path, nextContent));
      }
      continue;
    }

    if (!input.dryRun && snapshotContent === null && oldGeneratedContent !== null) {
      await writeSnapshot(input.cwd, trackedFile.path, oldGeneratedContent);
    }

    if (input.force || currentHash === trackedFile.previousHash) {
      overwritten.push(trackedFile.path);
      if (!input.dryRun) {
        await writeTextFile(absolutePath, nextContent);
        await writeSnapshot(input.cwd, trackedFile.path, nextContent);
        nextHashes[trackedFile.path] = {
          generatedHash: sha256Hex(nextContent),
          generatedAt: nowIso,
          templateVersion: CLI_VERSION,
        };
      }
      continue;
    }

    if (snapshotContent === null) {
      const patchRelativePath = toPatchRelativePath(trackedFile.path);
      patches.push(patchRelativePath);
      skippedWithNotice.push(trackedFile.path);
      if (!input.dryRun) {
        await writeTextFile(join(input.cwd, patchRelativePath), buildMissingBaselineNotice(trackedFile.path, nextContent));
      }
      continue;
    }

    const patchRelativePath = toPatchRelativePath(trackedFile.path);
    patches.push(patchRelativePath);
    if (!input.dryRun) {
        await writeTextFile(
          join(input.cwd, patchRelativePath),
          createUnifiedPatch(oldGeneratedContent ?? currentContent, nextContent, "old-generated", "new-generated"),
        );
      }
    }

  if (!input.dryRun) {
    const config = parseConfig(await readTextFile(configPath));
    config.version = CLI_VERSION;
    config.updatedAt = nowIso;
    await writeTextFile(configPath, serializeConfig(config));
    await writeTextFile(hashPath, `${JSON.stringify(nextHashes, null, 2)}\n`);
  }

  return { overwritten, patches, skipped, skippedWithNotice, skippedDeletedTemplate, created };
}
