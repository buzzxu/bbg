import { basename } from "node:path";

export function isParseableGitUrl(value: string): boolean {
  const raw = value.trim();
  if (raw.length === 0) {
    return false;
  }

  if (/^[^@\s]+@[^:\s]+:[^\s]+$/.test(raw)) {
    return true;
  }

  try {
    const parsed = new URL(raw);
    return ["https:", "http:", "ssh:", "git:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function inferRepoName(url: string): string {
  const normalized = url.trim().replace(/\/+$/, "");
  const slashName = normalized.split("/").at(-1) ?? normalized;
  const colonName = slashName.split(":").at(-1) ?? slashName;
  const withoutGit = colonName.replace(/\.git$/i, "");
  const safe = withoutGit.trim();
  if (safe.length === 0) {
    throw new Error(`Unable to infer repository name from URL: ${url}`);
  }

  return basename(safe);
}
