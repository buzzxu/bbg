import { join } from "node:path";
import type { RenderTemplateTask } from "../templates/render.js";
import type { LoadedPlugin } from "./types.js";

/**
 * Merges plugin governance templates with built-in templates.
 * Plugin templates use absolute source paths (resolved from plugin root).
 * Built-in templates take precedence — plugin entries with matching
 * destinations are skipped.
 */
export function mergePluginTemplates(
  builtinTemplates: RenderTemplateTask[],
  plugins: LoadedPlugin[],
): RenderTemplateTask[] {
  if (plugins.length === 0) return builtinTemplates;

  const existingDestinations = new Set(
    builtinTemplates.map((t) => t.destination),
  );

  const pluginTasks: RenderTemplateTask[] = [];

  for (const plugin of plugins) {
    const { manifest, root } = plugin;

    for (const agent of manifest.agents ?? []) {
      const dest = `agents/${agent}.md`;
      if (!existingDestinations.has(dest)) {
        pluginTasks.push({
          source: join(root, "agents", `${agent}.md`),
          destination: dest,
          mode: "copy",
        });
        existingDestinations.add(dest);
      }
    }

    for (const skill of manifest.skills ?? []) {
      const dest = `skills/${skill}/SKILL.md`;
      if (!existingDestinations.has(dest)) {
        pluginTasks.push({
          source: join(root, "skills", skill, "SKILL.md"),
          destination: dest,
          mode: "copy",
        });
        existingDestinations.add(dest);
      }
    }

    for (const rule of manifest.rules ?? []) {
      const dest = `rules/${rule}.md`;
      if (!existingDestinations.has(dest)) {
        pluginTasks.push({
          source: join(root, "rules", `${rule}.md`),
          destination: dest,
          mode: "copy",
        });
        existingDestinations.add(dest);
      }
    }

    for (const command of manifest.commands ?? []) {
      const dest = `commands/${command}.md`;
      if (!existingDestinations.has(dest)) {
        pluginTasks.push({
          source: join(root, "commands", `${command}.md`),
          destination: dest,
          mode: "copy",
        });
        existingDestinations.add(dest);
      }
    }
  }

  return [...builtinTemplates, ...pluginTasks];
}
