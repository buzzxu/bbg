import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";
import { BbgGitError } from "../../../src/utils/errors.js";
import { ensureGitAvailable, listRemoteBranches, parseRemoteBranches } from "../../../src/utils/git.js";

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

  it("lists remote branches via git ls-remote --heads", async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: "abc123\trefs/heads/main\ndef456\trefs/heads/dev\n",
    } as never);

    await expect(listRemoteBranches("https://example.com/repo.git")).resolves.toEqual([
      "main",
      "dev",
    ]);

    expect(execa).toHaveBeenCalledWith("git", [
      "ls-remote",
      "--heads",
      "https://example.com/repo.git",
    ]);
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

  it("wraps ls-remote failures as BbgGitError", async () => {
    const cause = new Error("network issue");
    vi.mocked(execa).mockRejectedValue(cause);

    await expect(listRemoteBranches("https://example.com/repo.git")).rejects.toMatchObject({
      name: "BbgGitError",
      code: "E_GIT_LIST_REMOTE_BRANCHES",
    });

    await expect(listRemoteBranches("https://example.com/repo.git")).rejects.toBeInstanceOf(
      BbgGitError,
    );
  });
});
