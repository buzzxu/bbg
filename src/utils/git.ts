import { execa } from "execa";
import { BbgGitError } from "./errors.js";
import { promptInput } from "./prompts.js";

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

export function isHttpsUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function embedCredentials(url: string, username: string, password: string): string {
  const parsed = new URL(url);
  parsed.username = encodeURIComponent(username);
  parsed.password = encodeURIComponent(password);
  return parsed.toString();
}

export interface GitCredentials {
  username: string;
  password: string;
}

export async function promptGitCredentials(): Promise<GitCredentials> {
  const username = await promptInput({ message: "Git username" });
  const password = await promptInput({ message: "Git password / token", transformer: () => "****" });
  return { username, password };
}

/**
 * Run a git command against a URL, handling HTTPS auth automatically.
 *
 * - SSH / git:// URLs: passed straight through (SSH agent handles auth).
 * - HTTPS URLs:
 *   1. Try without credentials (public repos + credential helper).
 *   2. On auth failure, use `cachedCredentials` if provided (no prompt),
 *      otherwise prompt the user once and retry.
 *
 * Returns the credentials that were actually used (null for SSH or public HTTPS).
 */
async function runGitWithOptionalCredentials(
  args: string[],
  url: string,
  cachedCredentials?: GitCredentials,
  execOptions: Record<string, unknown> = {},
): Promise<{ stdout: string; usedCredentials: GitCredentials | null }> {
  if (!isHttpsUrl(url)) {
    // SSH or git:// — let the system SSH agent handle auth naturally
    const result = await (execa("git", args, execOptions) as Promise<{ stdout: string }>);
    return { ...result, usedCredentials: null };
  }

  // HTTPS — try first without credentials (covers public repos + credential helper)
  try {
    const result = await (execa("git", args, {
      ...execOptions,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    }) as Promise<{ stdout: string }>);
    return { ...result, usedCredentials: null };
  } catch {
    // Use cached credentials from a prior call if available, otherwise prompt
    const credentials = cachedCredentials ?? (await promptGitCredentials());
    const authedUrl = embedCredentials(url, credentials.username, credentials.password);
    const authedArgs = args.map((arg) => (arg === url ? authedUrl : arg));
    const result = await (execa("git", authedArgs, execOptions) as Promise<{ stdout: string }>);
    return { ...result, usedCredentials: credentials };
  }
}

export interface ListRemoteBranchesResult {
  branches: string[];
  /** Credentials used to authenticate, if any. Pass to cloneRepo to avoid re-prompting. */
  credentials: GitCredentials | null;
}

export async function listRemoteBranches(
  url: string,
  cachedCredentials?: GitCredentials,
): Promise<ListRemoteBranchesResult> {
  try {
    const { stdout, usedCredentials } = await runGitWithOptionalCredentials(
      ["ls-remote", "--heads", url],
      url,
      cachedCredentials,
    );
    return { branches: parseRemoteBranches(stdout), credentials: usedCredentials };
  } catch (error: unknown) {
    throw new BbgGitError(
      `Failed to list remote branches for ${url}.`,
      "E_GIT_LIST_REMOTE_BRANCHES",
      "Check repository URL, credentials, and network access, then retry.",
      error,
    );
  }
}

export interface CloneRepoInput {
  url: string;
  branch: string;
  targetDir: string;
  /** Credentials from a prior listRemoteBranches call — skips re-prompting. */
  credentials?: GitCredentials;
}

export async function cloneRepo(input: CloneRepoInput): Promise<void> {
  try {
    await runGitWithOptionalCredentials(
      ["clone", "--branch", input.branch, "--single-branch", input.url, input.targetDir],
      input.url,
      input.credentials,
    );
  } catch (error: unknown) {
    throw new BbgGitError(
      `Failed to clone ${input.url} (${input.branch}).`,
      "E_GIT_CLONE",
      "Check repository URL, branch, credentials, and local directory permissions, then retry.",
      error,
    );
  }
}
