import { join } from "node:path";
import { homedir } from "node:os";
import { readdir } from "node:fs/promises";
import { exists } from "../utils/fs.js";
import { loadPluginManifest } from "./loader.js";
import type { LoadedPlugin } from "./types.js";

async function scanPluginDirectory(
  baseDir: string,
  source: LoadedPlugin["source"],
): Promise<LoadedPlugin[]> {
  if (!(await exists(baseDir))) return [];

  const plugins: LoadedPlugin[] = [];
  let entries: string[];
  try {
    entries = await readdir(baseDir).then((items) => items.filter((item) => !item.startsWith(".")));
  } catch {
    return [];
  }

  for (const entry of entries) {
    const pluginDir = join(baseDir, entry);
    const manifestPath = join(pluginDir, "plugin.json");
    if (!(await exists(manifestPath))) continue;

    try {
      const manifest = await loadPluginManifest(pluginDir);
      plugins.push({ manifest, root: pluginDir, source });
    } catch {
      // Skip invalid plugins silently
    }
  }

  return plugins;
}

/**
 * Discover plugins from standard directories and optional custom paths.
 *
 * Search order:
 * 1. `~/.bbg/plugins/` (global)
 * 2. `<cwd>/.bbg/plugins/` (local)
 * 3. Any custom directories provided
 */
export async function discoverPlugins(
  cwd: string,
  customDirs?: string[],
): Promise<LoadedPlugin[]> {
  const allPlugins: LoadedPlugin[] = [];

  // Global plugins
  const globalDir = join(homedir(), ".bbg", "plugins");
  allPlugins.push(...(await scanPluginDirectory(globalDir, "global")));

  // Local plugins
  const localDir = join(cwd, ".bbg", "plugins");
  allPlugins.push(...(await scanPluginDirectory(localDir, "local")));

  // Custom directories
  for (const customDir of customDirs ?? []) {
    allPlugins.push(...(await scanPluginDirectory(customDir, "custom")));
  }

  return allPlugins;
}
