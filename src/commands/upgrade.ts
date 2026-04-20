import { join } from "node:path";
import type { FileHashRecord } from "../config/hash.js";
import { sha256Hex } from "../config/hash.js";
import { parseConfig, serializeConfig } from "../config/read-write.js";
import { CLI_VERSION } from "../constants.js";
import { threeWayMerge } from "../upgrade/merge3.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";
import { promptConfirm } from "../utils/prompts.js";
import { isManagedAdapterPath, replaceManagedSection } from "../adapters/managed.js";
import { makeExecutable } from "../utils/platform.js";
import { uiText } from "../i18n/ui-copy.js";
import {
  buildTrackedFiles,
  loadSnapshot,
  toPatchRelativePath,
  tryExtractChildAgentsRepoName,
  writeSnapshot,
} from "../lifecycle/tracked-files.js";

export interface RunUpgradeInput {
  cwd: string;
  dryRun?: boolean;
  force?: boolean;
  interactive?: boolean;
}

export interface RunUpgradeResult {
  overwritten: string[];
  unchanged: string[];
  merged: string[];
  conflicted: string[];
  patches: string[];
  skipped: string[];
  skippedWithNotice: string[];
  skippedDeletedTemplate: string[];
  created: string[];
}

const EXECUTABLE_GENERATED_PATHS = new Set([
  ".githooks/pre-commit",
  ".githooks/pre-push",
  "scripts/doctor.py",
  "scripts/sync_versions.py",
]);

function maybeMakeExecutable(cwd: string, relativePath: string): void {
  if (!EXECUTABLE_GENERATED_PATHS.has(relativePath)) {
    return;
  }

  makeExecutable(join(cwd, relativePath));
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
      message: uiText("upgrade.forceOverwrite", { value: trackedFiles.length }),
      default: false,
    });
    if (!confirmed) {
      throw new Error("Upgrade aborted: force overwrite requires explicit confirmation.");
    }
  }

  const overwritten: string[] = [];
  const unchanged: string[] = [];
  const merged: string[] = [];
  const conflicted: string[] = [];
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
        maybeMakeExecutable(input.cwd, trackedFile.path);
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
    if (isManagedAdapterPath(trackedFile.path)) {
      const managedUpdated = replaceManagedSection(currentContent, nextContent);
      if (managedUpdated !== null) {
        if (managedUpdated === currentContent) {
          unchanged.push(trackedFile.path);
        }
        if (managedUpdated !== currentContent) {
          merged.push(trackedFile.path);
        }
        if (!input.dryRun) {
          if (managedUpdated !== currentContent) {
            await writeTextFile(absolutePath, managedUpdated);
            maybeMakeExecutable(input.cwd, trackedFile.path);
          }
          await writeSnapshot(input.cwd, trackedFile.path, nextContent);
          nextHashes[trackedFile.path] = {
            generatedHash: sha256Hex(nextContent),
            generatedAt: nowIso,
            templateVersion: CLI_VERSION,
          };
        }
        continue;
      }
    }
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

    if (currentContent === nextContent) {
      unchanged.push(trackedFile.path);
      if (!input.dryRun) {
        await writeSnapshot(input.cwd, trackedFile.path, nextContent);
        nextHashes[trackedFile.path] = {
          generatedHash: sha256Hex(nextContent),
          generatedAt: nowIso,
          templateVersion: CLI_VERSION,
        };
      }
      continue;
    }

    if (input.force || currentHash === trackedFile.previousHash) {
      overwritten.push(trackedFile.path);
      if (!input.dryRun) {
        await writeTextFile(absolutePath, nextContent);
        maybeMakeExecutable(input.cwd, trackedFile.path);
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

    // Three-way merge: base=snapshot, ours=current user file, theirs=new template
    const mergeResult = threeWayMerge(snapshotContent, currentContent, nextContent, {
      ours: "user",
      theirs: "template",
    });

    if (!mergeResult.hasConflicts) {
      merged.push(trackedFile.path);
      if (!input.dryRun) {
        await writeTextFile(absolutePath, mergeResult.merged);
        maybeMakeExecutable(input.cwd, trackedFile.path);
        await writeSnapshot(input.cwd, trackedFile.path, nextContent);
        nextHashes[trackedFile.path] = {
          generatedHash: sha256Hex(nextContent),
          generatedAt: nowIso,
          templateVersion: CLI_VERSION,
        };
      }
    } else if (input.interactive) {
      const accept = await promptConfirm({
        message: uiText("upgrade.acceptConflictMarkers", { value: trackedFile.path }),
        default: true,
      });
      if (accept) {
        conflicted.push(trackedFile.path);
        if (!input.dryRun) {
          await writeTextFile(absolutePath, mergeResult.merged);
        }
      } else {
        skipped.push(trackedFile.path);
      }
    } else {
      conflicted.push(trackedFile.path);
      if (!input.dryRun) {
        await writeTextFile(absolutePath, mergeResult.merged);
      }
    }
    }

  if (!input.dryRun) {
    const config = parseConfig(await readTextFile(configPath));
    config.version = CLI_VERSION;
    config.updatedAt = nowIso;
    await writeTextFile(configPath, serializeConfig(config));
    await writeTextFile(hashPath, `${JSON.stringify(nextHashes, null, 2)}\n`);
  }

  return {
    overwritten,
    unchanged,
    merged,
    conflicted,
    patches,
    skipped,
    skippedWithNotice,
    skippedDeletedTemplate,
    created,
  };
}
