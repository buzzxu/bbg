import { execa } from "execa";
import { BbgGitError } from "./errors.js";

const REMOTE_HEAD_PREFIX = "refs/heads/";

export function parseRemoteBranches(stdout: string): string[] {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split(/\s+/);
      const ref = parts[1];

      if (!ref || !ref.startsWith(REMOTE_HEAD_PREFIX)) {
        return null;
      }

      return ref.slice(REMOTE_HEAD_PREFIX.length);
    })
    .filter((branchName): branchName is string => branchName !== null);
}

export async function ensureGitAvailable(): Promise<void> {
  try {
    await execa("git", ["--version"]);
  } catch (error: unknown) {
    throw new BbgGitError(
      "Git is required for init remote operations but was not found.",
      "E_GIT_UNAVAILABLE",
      "Install Git and ensure `git --version` works in your shell, then retry `bbg init`.",
      error,
    );
  }
}

export async function listRemoteBranches(url: string): Promise<string[]> {
  try {
    const { stdout } = await execa("git", ["ls-remote", "--heads", url]);
    return parseRemoteBranches(stdout);
  } catch (error: unknown) {
    throw new BbgGitError(
      `Failed to list remote branches for ${url}.`,
      "E_GIT_LIST_REMOTE_BRANCHES",
      "Check repository URL and network access, then retry.",
      error,
    );
  }
}

export interface CloneRepoInput {
  url: string;
  branch: string;
  targetDir: string;
}

export async function cloneRepo(input: CloneRepoInput): Promise<void> {
  try {
    await execa("git", [
      "clone",
      "--branch",
      input.branch,
      "--single-branch",
      input.url,
      input.targetDir,
    ]);
  } catch (error: unknown) {
    throw new BbgGitError(
      `Failed to clone ${input.url} (${input.branch}).`,
      "E_GIT_CLONE",
      "Check repository URL, branch, and local directory permissions, then retry.",
      error,
    );
  }
}
