import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256Hex, type FileHashRecord } from "../config/hash.js";
import { parseConfig } from "../config/read-write.js";
import { CLI_VERSION } from "../constants.js";
import { buildTemplateContext } from "../templates/context.js";
import { renderTemplateContents } from "../templates/render.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";
import { resolveBuiltinTemplatesRoot, resolvePackageRoot, toSnapshotRelativePath } from "../utils/paths.js";
import { getAdapterTemplates } from "./init-manifest.js";
import { replaceManagedSection } from "../adapters/managed.js";

export interface RunRepairAdaptersInput {
  cwd: string;
}

export interface RunRepairAdaptersResult {
  repaired: string[];
  created: string[];
}

export async function runRepairAdapters(input: RunRepairAdaptersInput): Promise<RunRepairAdaptersResult> {
  const configPath = join(input.cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  const config = parseConfig(await readTextFile(configPath));
  const commandDir = dirname(fileURLToPath(import.meta.url));
  const builtinTemplatesRoot = await resolveBuiltinTemplatesRoot(commandDir, [join(input.cwd, "node_modules", "bbg", "templates")]);
  const packageRoot = await resolvePackageRoot(commandDir);
  const context = buildTemplateContext(config);
  const rendered = await renderTemplateContents({
    workspaceRoot: input.cwd,
    builtinTemplatesRoot,
    packageRoot,
    context,
    templates: getAdapterTemplates(),
  });

  const hashesPath = join(input.cwd, ".bbg", "file-hashes.json");
  const hashRecord = (await exists(hashesPath))
    ? JSON.parse(await readTextFile(hashesPath)) as FileHashRecord
    : {};

  const repaired: string[] = [];
  const created: string[] = [];
  const generatedAt = new Date().toISOString();

  for (const item of rendered) {
    const absolutePath = join(input.cwd, item.destination);
    let nextContent = item.content;

    if (await exists(absolutePath)) {
      const currentContent = await readTextFile(absolutePath);
      const mergedContent = replaceManagedSection(currentContent, item.content);
      if (mergedContent !== null) {
        nextContent = mergedContent;
      }
      repaired.push(item.destination);
    } else {
      created.push(item.destination);
    }

    await writeTextFile(absolutePath, nextContent);
    await writeTextFile(join(input.cwd, toSnapshotRelativePath(item.destination)), item.content);
    hashRecord[item.destination] = {
      generatedHash: sha256Hex(item.content),
      generatedAt,
      templateVersion: CLI_VERSION,
    };
  }

  await writeTextFile(hashesPath, `${JSON.stringify(hashRecord, null, 2)}\n`);

  return { repaired, created };
}
