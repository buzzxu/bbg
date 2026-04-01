import { join } from "node:path";
import { readTextFile } from "../utils/fs.js";
import type { PluginManifest } from "./types.js";

export function validatePluginManifest(raw: unknown): PluginManifest {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Plugin manifest must be a JSON object");
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.name !== "string" || obj.name.trim().length === 0) {
    throw new Error("Plugin manifest requires a non-empty 'name' field");
  }

  if (typeof obj.version !== "string" || obj.version.trim().length === 0) {
    throw new Error("Plugin manifest requires a non-empty 'version' field");
  }

  if (typeof obj.description !== "string") {
    throw new Error("Plugin manifest requires a 'description' field");
  }

  const manifest: PluginManifest = {
    name: obj.name,
    version: obj.version,
    description: obj.description,
  };

  if (Array.isArray(obj.agents)) {
    manifest.agents = obj.agents.filter((a): a is string => typeof a === "string");
  }
  if (Array.isArray(obj.skills)) {
    manifest.skills = obj.skills.filter((s): s is string => typeof s === "string");
  }
  if (Array.isArray(obj.rules)) {
    manifest.rules = obj.rules.filter((r): r is string => typeof r === "string");
  }
  if (Array.isArray(obj.commands)) {
    manifest.commands = obj.commands.filter((c): c is string => typeof c === "string");
  }

  return manifest;
}

export async function loadPluginManifest(pluginDir: string): Promise<PluginManifest> {
  const manifestPath = join(pluginDir, "plugin.json");
  const raw = JSON.parse(await readTextFile(manifestPath)) as unknown;
  return validatePluginManifest(raw);
}
