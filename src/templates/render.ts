import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { isAbsolute, join, normalize, sep } from "node:path";
import { BbgTemplateError } from "../utils/errors.js";
import { readTextFile, writeTextFile } from "../utils/fs.js";
import { createTemplateEngine } from "./engine.js";
import type { TemplateContext } from "./context.js";

export interface RenderTemplateTask {
  source: string;
  destination: string;
  mode: "handlebars" | "copy";
}

export interface RenderProjectTemplatesInput {
  workspaceRoot: string;
  builtinTemplatesRoot: string;
  context: TemplateContext;
  templates: RenderTemplateTask[];
}

export interface RenderedTemplateContent {
  destination: string;
  content: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureSafeRelativePath(pathValue: string, field: "source" | "destination"): string {
  if (isAbsolute(pathValue)) {
    throw new BbgTemplateError(
      `Template ${field} path cannot be absolute: ${pathValue}`,
      "TEMPLATE_PATH_INVALID",
      `Use a relative ${field} path inside the workspace template roots.`,
    );
  }

  const normalizedPath = normalize(pathValue);
  if (normalizedPath === ".." || normalizedPath.startsWith(`..${sep}`)) {
    throw new BbgTemplateError(
      `Template ${field} path escapes allowed root: ${pathValue}`,
      "TEMPLATE_PATH_INVALID",
      `Use a relative ${field} path that stays inside the allowed root.`,
    );
  }

  return normalizedPath;
}

export async function resolveTemplatePath(
  workspaceRoot: string,
  builtinTemplatesRoot: string,
  source: string,
): Promise<string> {
  const safeSource = ensureSafeRelativePath(source, "source");
  const overridePath = join(workspaceRoot, ".bbg", "templates", safeSource);
  if (await fileExists(overridePath)) {
    return overridePath;
  }

  const builtinPath = join(builtinTemplatesRoot, safeSource);
  if (await fileExists(builtinPath)) {
    return builtinPath;
  }

  throw new BbgTemplateError(
    `Template not found: ${source}`,
    "TEMPLATE_NOT_FOUND",
    "Create a template override under .bbg/templates or provide a built-in template.",
  );
}

export async function renderProjectTemplates(
  input: RenderProjectTemplatesInput,
): Promise<string[]> {
  const rendered = await renderTemplateContents(input);
  const writtenFiles: string[] = [];

  for (const item of rendered) {
    const outputPath = join(input.workspaceRoot, item.destination);
    await writeTextFile(outputPath, item.content);
    writtenFiles.push(outputPath);
  }

  return writtenFiles;
}

export async function renderTemplateContents(
  input: RenderProjectTemplatesInput,
): Promise<RenderedTemplateContent[]> {
  const engine = createTemplateEngine();
  const rendered: RenderedTemplateContent[] = [];

  for (const template of input.templates) {
    const templatePath = await resolveTemplatePath(
      input.workspaceRoot,
      input.builtinTemplatesRoot,
      template.source,
    );
    const sourceContent = await readTextFile(templatePath);
    const safeDestination = ensureSafeRelativePath(template.destination, "destination");
    const outputContent =
      template.mode === "handlebars"
        ? engine.compile(sourceContent)(input.context)
        : sourceContent;

    rendered.push({ destination: safeDestination, content: outputContent });
  }

  return rendered;
}
