import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FileHashRecord } from "../config/hash.js";
import { parseConfig } from "../config/read-write.js";
import type { RepoEntry } from "../config/schema.js";
import { buildTemplateContext } from "../templates/context.js";
import { buildGovernanceManifest } from "../templates/governance.js";
import { renderTemplateContents } from "../templates/render.js";
import { readTextFile, writeTextFile } from "../utils/fs.js";
import {
  resolveBuiltinTemplatesRoot,
  resolvePackageRoot,
  toSnapshotRelativePath,
} from "../utils/paths.js";
import { getRootTemplateManifest, getToolConfigTemplates } from "../commands/init-manifest.js";

export interface TrackedFile {
  path: string;
  nextContent: string | null;
  previousHash?: string;
  missingRepoContext?: boolean;
}

export function tryExtractChildAgentsRepoName(filePath: string): string | null {
  const normalizedPath = filePath.split("\\").join("/");
  const match = normalizedPath.match(/^([^/]+)\/AGENTS\.md$/);
  return match?.[1] ?? null;
}

export function toPatchRelativePath(filePath: string): string {
  return `.bbg/upgrade-patches/${filePath}.patch`.split("\\").join("/");
}

export async function loadSnapshot(cwd: string, filePath: string): Promise<string | null> {
  const snapshotPath = join(cwd, toSnapshotRelativePath(filePath));
  try {
    return await readTextFile(snapshotPath);
  } catch {
    return null;
  }
}

export async function writeSnapshot(cwd: string, filePath: string, content: string): Promise<void> {
  await writeTextFile(join(cwd, toSnapshotRelativePath(filePath)), content);
}

export async function buildTrackedFiles(cwd: string, hashRecord: FileHashRecord): Promise<TrackedFile[]> {
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
