import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");

function getGovernanceFiles(): string[] {
  const files: string[] = [];

  // Agents
  for (const f of readdirSync(join(ROOT, "agents"))) {
    if (f.endsWith(".md")) files.push(join(ROOT, "agents", f));
  }

  // Skills
  for (const d of readdirSync(join(ROOT, "skills"))) {
    const skillFile = join(ROOT, "skills", d, "SKILL.md");
    if (existsSync(skillFile)) files.push(skillFile);
  }

  // Rules
  for (const subdir of readdirSync(join(ROOT, "rules"))) {
    const fullPath = join(ROOT, "rules", subdir);
    try {
      for (const f of readdirSync(fullPath)) {
        if (f.endsWith(".md") && f !== "README.md") {
          files.push(join(fullPath, f));
        }
      }
    } catch {
      // Not a directory
    }
  }

  // Commands
  for (const f of readdirSync(join(ROOT, "commands"))) {
    if (f.endsWith(".md")) files.push(join(ROOT, "commands", f));
  }

  return files;
}

describe("governance cross-references", () => {
  const files = getGovernanceFiles();

  it("finds governance files to validate", () => {
    expect(files.length).toBeGreaterThanOrEqual(150);
  });

  it("all governance docs have a Related section", () => {
    const missing: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (!content.includes("## Related")) {
        missing.push(file.replace(ROOT + "/", ""));
      }
    }
    expect(missing).toEqual([]);
  });

  it("all relative links in Related sections point to existing files", () => {
    const brokenLinks: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const relatedSection = content.split("## Related")[1];
      if (!relatedSection) continue;

      const linkPattern = /\]\(([^)]+)\)/g;
      let match;
      while ((match = linkPattern.exec(relatedSection)) !== null) {
        const linkPath = match[1];
        if (linkPath.startsWith("http")) continue;
        const resolvedPath = resolve(join(file, ".."), linkPath);
        if (!existsSync(resolvedPath)) {
          brokenLinks.push(`${file.replace(ROOT + "/", "")}: ${linkPath}`);
        }
      }
    }
    expect(brokenLinks).toEqual([]);
  });
});
