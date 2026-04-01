export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  agents?: string[];
  skills?: string[];
  rules?: string[];
  commands?: string[];
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  root: string;
  source: "global" | "local" | "custom";
}
