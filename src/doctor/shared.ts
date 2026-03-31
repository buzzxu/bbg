import type { BbgConfig } from "../config/schema.js";

export function expectedRepoIgnoreEntries(config: BbgConfig | null): string[] {
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
