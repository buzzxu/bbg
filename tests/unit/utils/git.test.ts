import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

vi.mock("../../../src/utils/prompts.js", () => ({
  promptInput: vi.fn(),
}));

import { execa } from "execa";
import { promptInput } from "../../../src/utils/prompts.js";
import { BbgGitError } from "../../../src/utils/errors.js";
import {
  cloneRepo,
  embedCredentials,
  ensureGitAvailable,
  isHttpsUrl,
  listRemoteBranches,
  parseRemoteBranches,
} from "../../../src/utils/git.js";

describe("utils/git", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("parses branch names from git ls-remote output", () => {
    const stdout = [
      "a1b2c3\trefs/heads/main",
      "d4e5f6\trefs/heads/feature/task-6",
      "",
    ].join("\n");

    expect(parseRemoteBranches(stdout)).toEqual(["main", "feature/task-6"]);
  });

  describe("isHttpsUrl", () => {
    it("returns true for https URLs", () => {
      expect(isHttpsUrl("https://github.com/org/repo.git")).toBe(true);
      expect(isHttpsUrl("http://example.com/repo.git")).toBe(true);
    });

    it("returns false for SSH and git URLs", () => {
      expect(isHttpsUrl("git@github.com:org/repo.git")).toBe(false);
      expect(isHttpsUrl("ssh://git@github.com/org/repo.git")).toBe(false);
      expect(isHttpsUrl("git://github.com/org/repo.git")).toBe(false);
    });
  });

  describe("embedCredentials", () => {
    it("embeds username and password into an HTTPS URL", () => {
      const result = embedCredentials("https://github.com/org/repo.git", "user", "tok@en");
      expect(result).toBe("https://user:tok%40en@github.com/org/repo.git");
    });
  });

  it("lists remote branches via git ls-remote --heads (public / credential-helper)", async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: "abc123\trefs/heads/main\ndef456\trefs/heads/dev\n",
    } as never);

    const result = await listRemoteBranches("https://example.com/repo.git");
    expect(result.branches).toEqual(["main", "dev"]);
    expect(result.credentials).toBeNull();

    // First call should try without prompting (GIT_TERMINAL_PROMPT=0)
    expect(execa).toHaveBeenCalledOnce();
    expect(execa).toHaveBeenCalledWith(
      "git",
      ["ls-remote", "--heads", "https://example.com/repo.git"],
      expect.objectContaining({ env: expect.objectContaining({ GIT_TERMINAL_PROMPT: "0" }) }),
    );
  });

  it("prompts for credentials on HTTPS auth failure then retries, returning used credentials", async () => {
    vi.mocked(execa)
      .mockRejectedValueOnce(new Error("Authentication failed"))
      .mockResolvedValueOnce({ stdout: "abc123\trefs/heads/main\n" } as never);

    vi.mocked(promptInput)
      .mockResolvedValueOnce("myuser")
      .mockResolvedValueOnce("mypassword");

    const result = await listRemoteBranches("https://example.com/repo.git");
    expect(result.branches).toEqual(["main"]);
    expect(result.credentials).toEqual({ username: "myuser", password: "mypassword" });

    expect(promptInput).toHaveBeenCalledTimes(2);
    // Second execa call should have credentials embedded in URL
    const secondCall = vi.mocked(execa).mock.calls[1];
    expect(secondCall?.[1]).toEqual(
      expect.arrayContaining([expect.stringContaining("myuser")]),
    );
  });

  it("uses cached credentials on clone without prompting again", async () => {
    vi.mocked(execa)
      .mockRejectedValueOnce(new Error("auth fail"))        // ls-remote first attempt
      .mockResolvedValueOnce({ stdout: "abc123\trefs/heads/main\n" } as never) // ls-remote retry with creds
      .mockRejectedValueOnce(new Error("auth fail"))        // clone first attempt (GIT_TERMINAL_PROMPT=0)
      .mockResolvedValueOnce({ stdout: "" } as never);      // clone retry with cached creds

    vi.mocked(promptInput)
      .mockResolvedValueOnce("myuser")
      .mockResolvedValueOnce("mypassword");

    const { credentials } = await listRemoteBranches("https://example.com/repo.git");
    expect(credentials).toEqual({ username: "myuser", password: "mypassword" });

    // Clone with cached credentials — should NOT prompt again
    await cloneRepo({
      url: "https://example.com/repo.git",
      branch: "main",
      targetDir: "/tmp/repo",
      credentials: credentials ?? undefined,
    });

    // promptInput called exactly twice (during ls-remote), not again for clone
    expect(promptInput).toHaveBeenCalledTimes(2);

    // 4th execa call (index 3) is the clone retry with embedded credentials
    const cloneRetryCall = vi.mocked(execa).mock.calls[3];
    expect(cloneRetryCall?.[1]).toEqual(
      expect.arrayContaining([expect.stringContaining("myuser")]),
    );
  });

  it("lists remote branches for SSH without setting GIT_TERMINAL_PROMPT", async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: "abc123\trefs/heads/main\n",
    } as never);

    const result = await listRemoteBranches("git@github.com:org/repo.git");
    expect(result.branches).toEqual(["main"]);
    expect(result.credentials).toBeNull();

    expect(execa).toHaveBeenCalledOnce();
    // SSH calls pass no options object, so no GIT_TERMINAL_PROMPT override
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstCallOpts = (vi.mocked(execa).mock.calls[0] as any[])?.[2] as Record<string, unknown> | undefined;
    const envVars = firstCallOpts?.["env"] as Record<string, string> | undefined;
    expect(envVars?.["GIT_TERMINAL_PROMPT"]).toBeUndefined();
  });

  it("checks git availability via git --version", async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: "git version 2.45.0" } as never);

    await expect(ensureGitAvailable()).resolves.toBeUndefined();

    expect(execa).toHaveBeenCalledWith("git", ["--version"]);
  });

  it("wraps git availability failures as BbgGitError", async () => {
    vi.mocked(execa).mockRejectedValue(new Error("spawn git ENOENT"));

    await expect(ensureGitAvailable()).rejects.toMatchObject({
      name: "BbgGitError",
      code: "E_GIT_UNAVAILABLE",
      hint: expect.stringContaining("Install Git"),
    });

    await expect(ensureGitAvailable()).rejects.toBeInstanceOf(BbgGitError);
  });

  it("wraps ls-remote failures as BbgGitError after credential retry fails", async () => {
    vi.mocked(execa).mockRejectedValue(new Error("network issue"));
    vi.mocked(promptInput).mockResolvedValue("value");

    await expect(listRemoteBranches("https://example.com/repo.git")).rejects.toMatchObject({
      name: "BbgGitError",
      code: "E_GIT_LIST_REMOTE_BRANCHES",
    });

    await expect(listRemoteBranches("https://example.com/repo.git")).rejects.toBeInstanceOf(
      BbgGitError,
    );
  });

  it("wraps clone failures as BbgGitError", async () => {
    vi.mocked(execa).mockRejectedValue(new Error("clone failed"));
    vi.mocked(promptInput).mockResolvedValue("value");

    await expect(
      cloneRepo({ url: "https://example.com/repo.git", branch: "main", targetDir: "/tmp/repo" }),
    ).rejects.toMatchObject({
      name: "BbgGitError",
      code: "E_GIT_CLONE",
    });
  });
});
