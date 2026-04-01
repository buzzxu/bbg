import { execa } from "execa";

export interface ConventionalCommit {
  hash: string;
  type: string;
  scope?: string;
  breaking: boolean;
  subject: string;
  author: string;
  date: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  sections: Map<string, ConventionalCommit[]>;
}

export const CONVENTIONAL_RE = /^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/;

export const TYPE_TO_SECTION: Record<string, string> = {
  feat: "Added",
  fix: "Fixed",
  refactor: "Changed",
  perf: "Changed",
  docs: "Documentation",
  test: "Tests",
  chore: "Maintenance",
  ci: "Maintenance",
  build: "Maintenance",
  style: "Maintenance",
};

export function parseConventionalCommit(
  hash: string,
  message: string,
  author: string,
  date: string,
): ConventionalCommit | null {
  const match = message.match(CONVENTIONAL_RE);
  if (!match) return null;

  const [, type, scope, bang, subject] = match;
  return {
    hash,
    type,
    scope: scope || undefined,
    breaking: bang === "!",
    subject: subject.trim(),
    author,
    date,
  };
}

export function groupCommitsByType(
  commits: ConventionalCommit[],
): Map<string, ConventionalCommit[]> {
  const groups = new Map<string, ConventionalCommit[]>();
  for (const commit of commits) {
    const existing = groups.get(commit.type) ?? [];
    existing.push(commit);
    groups.set(commit.type, existing);
  }
  return groups;
}

export function formatChangelogEntry(entry: ChangelogEntry): string {
  const lines: string[] = [];
  lines.push(`## [${entry.version}] - ${entry.date}`);
  lines.push("");

  // Ordered sections
  const sectionOrder = ["Added", "Fixed", "Changed", "Documentation", "Tests", "Maintenance"];

  for (const sectionName of sectionOrder) {
    const commits: ConventionalCommit[] = [];
    for (const [type, typeCommits] of entry.sections) {
      if (TYPE_TO_SECTION[type] === sectionName) {
        commits.push(...typeCommits);
      }
    }

    if (commits.length === 0) continue;

    lines.push(`### ${sectionName}`);
    lines.push("");
    for (const commit of commits) {
      const scopePart = commit.scope ? ` **(${commit.scope})**` : "";
      lines.push(`- ${commit.subject}${scopePart}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export async function getLastTag(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execa("git", ["describe", "--tags", "--abbrev=0"], { cwd });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function getCommitsSinceTag(
  cwd: string,
  sinceTag?: string,
): Promise<ConventionalCommit[]> {
  const SEP = "%x00";
  const format = `%H${SEP}%s${SEP}%an${SEP}%aI`;
  const args = ["log", `--format=${format}`];
  if (sinceTag) {
    args.push(`${sinceTag}..HEAD`);
  }

  try {
    const { stdout } = await execa("git", args, { cwd });
    if (!stdout.trim()) return [];

    const commits: ConventionalCommit[] = [];
    for (const line of stdout.trim().split("\n")) {
      const parts = line.split("\0");
      if (parts.length < 4) continue;
      const [hash, message, author, date] = parts;
      const parsed = parseConventionalCommit(hash, message, author, date);
      if (parsed) {
        commits.push(parsed);
      }
    }
    return commits;
  } catch {
    return [];
  }
}

export async function generateChangelog(
  cwd: string,
  version: string,
  date: string,
): Promise<{ entry: string; commitCount: number }> {
  const lastTag = await getLastTag(cwd);
  const commits = await getCommitsSinceTag(cwd, lastTag ?? undefined);
  const sections = groupCommitsByType(commits);

  const changelogEntry: ChangelogEntry = {
    version,
    date,
    sections,
  };

  return {
    entry: formatChangelogEntry(changelogEntry),
    commitCount: commits.length,
  };
}

export async function appendToChangelog(
  cwd: string,
  entry: string,
  changelogPath: string,
): Promise<void> {
  const { exists, readTextFile, writeTextFile } = await import("../utils/fs.js");
  const { join, resolve } = await import("node:path");
  const fullPath = resolve(cwd, changelogPath);

  if (!fullPath.startsWith(resolve(cwd))) {
    throw new Error("changelogPath must resolve within cwd");
  }

  if (await exists(fullPath)) {
    const existing = await readTextFile(fullPath);
    // Insert after the first "# Changelog" header line
    const headerEnd = existing.indexOf("\n");
    if (headerEnd !== -1 && existing.startsWith("# ")) {
      const before = existing.slice(0, headerEnd + 1);
      const after = existing.slice(headerEnd + 1);
      await writeTextFile(fullPath, `${before}\n${entry}\n${after}`);
    } else {
      await writeTextFile(fullPath, `${existing}\n${entry}`);
    }
  } else {
    await writeTextFile(fullPath, `# Changelog\n\n${entry}`);
  }
}
