import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");

type GovernanceDoc = {
  path: string;
  relativePath: string;
  content: string;
  relatedSection: string;
};

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

function loadGovernanceDocs(): GovernanceDoc[] {
  return getGovernanceFiles().map((file) => {
    const content = readFileSync(file, "utf8");
    return {
      path: file,
      relativePath: file.replace(ROOT + "/", ""),
      content,
      relatedSection: content.split("## Related")[1] ?? "",
    };
  });
}

describe("governance cross-references", () => {
  const docs = loadGovernanceDocs();

  it("finds governance files to validate", () => {
    expect(docs.length).toBeGreaterThanOrEqual(156);
  });

  it("all governance docs have a Related section", () => {
    const missing: string[] = [];
    for (const doc of docs) {
      if (!doc.content.includes("## Related")) {
        missing.push(doc.relativePath);
      }
    }
    expect(missing).toEqual([]);
  });

  it("all relative links in Related sections point to existing files", () => {
    const brokenLinks: string[] = [];
    for (const doc of docs) {
      const relatedSection = doc.relatedSection;
      if (!relatedSection) continue;

      const linkPattern = /\]\(([^)]+)\)/g;
      let match;
      while ((match = linkPattern.exec(relatedSection)) !== null) {
        const linkPath = match[1];
        if (linkPath.startsWith("http")) continue;
        const resolvedPath = resolve(join(doc.path, ".."), linkPath);
        if (!existsSync(resolvedPath)) {
          brokenLinks.push(`${doc.relativePath}: ${linkPath}`);
        }
      }
    }
    expect(brokenLinks).toEqual([]);
  });
});
