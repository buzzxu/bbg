import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BbgConfig } from "../config/schema.js";
import { buildTemplateContext } from "../templates/context.js";
import { renderProjectTemplates, type RenderTemplateTask } from "../templates/render.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";

function expectedRepoIgnoreEntries(config: BbgConfig | null): string[] {
  if (!config) {
    return [];
  }

  const seen = new Set<string>();
  const entries: string[] = [];
  for (const repo of config.repos) {
    const name = repo.name.trim().replace(/^\/+|\/+$/g, "");
    if (name.length === 0 || seen.has(name)) {
      continue;
    }

    seen.add(name);
    entries.push(`${name}/`);
  }

  return entries;
}

export interface DoctorFixResult {
  changed: string[];
}

const ROOT_FIX_TEMPLATES: RenderTemplateTask[] = [
  { source: "handlebars/AGENTS.md.hbs", destination: "AGENTS.md", mode: "handlebars" },
  { source: "handlebars/README.md.hbs", destination: "README.md", mode: "handlebars" },
];

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

async function applyRootGovernanceFileFixes(cwd: string, config: BbgConfig | null): Promise<string[]> {
  if (!config) {
    return [];
  }

  const missingTemplates: RenderTemplateTask[] = [];
  for (const template of ROOT_FIX_TEMPLATES) {
    if (!(await exists(join(cwd, template.destination)))) {
      missingTemplates.push(template);
    }
  }

  if (missingTemplates.length === 0) {
    return [];
  }

  const builtinTemplatesRoot = await resolveBuiltinTemplatesRoot();
  return renderProjectTemplates({
    workspaceRoot: cwd,
    builtinTemplatesRoot,
    context: buildTemplateContext(config),
    templates: missingTemplates,
  });
}

async function applyGitignoreFixes(cwd: string, config: BbgConfig | null): Promise<string[]> {
  const changed: string[] = [];
  const gitignorePath = join(cwd, ".gitignore");
  const expectedEntries = expectedRepoIgnoreEntries(config);

  if (!(await exists(gitignorePath))) {
    if (expectedEntries.length > 0) {
      await writeTextFile(gitignorePath, `${expectedEntries.join("\n")}\n`);
      changed.push(gitignorePath);
    }
    return changed;
  }

  const current = await readTextFile(gitignorePath);
  const lines = current.split(/\r?\n/);
  const trimmed = new Set(lines.map((line) => line.trim()));
  const missingEntries = expectedEntries.filter((entry) => !trimmed.has(entry));

  if (missingEntries.length === 0) {
    return changed;
  }

  const outLines = [...lines];
  while (outLines.length > 0 && outLines[outLines.length - 1]?.trim() === "") {
    outLines.pop();
  }

  if (outLines.length > 0) {
    outLines.push("");
  }
  outLines.push(...missingEntries);

  await writeTextFile(gitignorePath, `${outLines.join("\n")}\n`);
  changed.push(gitignorePath);
  return changed;
}

export async function applyDoctorFixes(cwd: string, config: BbgConfig | null): Promise<DoctorFixResult> {
  const changed: string[] = [];
  changed.push(...(await applyGitignoreFixes(cwd, config)));
  changed.push(...(await applyRootGovernanceFileFixes(cwd, config)));
  return { changed };
}
