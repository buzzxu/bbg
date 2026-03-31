import { describe, expect, it } from "vitest";
import { inferRepoName, isParseableGitUrl } from "../../../src/utils/git-url.js";

describe("utils/git-url", () => {
  describe("isParseableGitUrl", () => {
    it("returns true for HTTPS URLs", () => {
      expect(isParseableGitUrl("https://github.com/org/my-repo.git")).toBe(true);
      expect(isParseableGitUrl("https://github.com/org/my-repo")).toBe(true);
    });

    it("returns true for HTTP URLs", () => {
      expect(isParseableGitUrl("http://github.com/org/my-repo.git")).toBe(true);
    });

    it("returns true for SSH URLs", () => {
      expect(isParseableGitUrl("git@github.com:org/my-repo.git")).toBe(true);
    });

    it("returns true for git:// protocol URLs", () => {
      expect(isParseableGitUrl("git://github.com/org/my-repo.git")).toBe(true);
    });

    it("returns true for ssh:// protocol URLs", () => {
      expect(isParseableGitUrl("ssh://git@github.com/org/my-repo.git")).toBe(true);
    });

    it("returns false for empty strings", () => {
      expect(isParseableGitUrl("")).toBe(false);
    });

    it("returns false for whitespace-only strings", () => {
      expect(isParseableGitUrl("   ")).toBe(false);
    });

    it("returns false for plain text", () => {
      expect(isParseableGitUrl("not-a-url")).toBe(false);
    });

    it("returns false for non-git protocols like ftp", () => {
      expect(isParseableGitUrl("ftp://example.com/repo.git")).toBe(false);
    });
  });

  describe("inferRepoName", () => {
    it("extracts repo name from HTTPS URL", () => {
      expect(inferRepoName("https://github.com/org/my-repo.git")).toBe("my-repo");
    });

    it("extracts repo name from SSH URL", () => {
      expect(inferRepoName("git@github.com:org/my-repo.git")).toBe("my-repo");
    });

    it("handles URLs without .git suffix", () => {
      expect(inferRepoName("https://github.com/org/my-repo")).toBe("my-repo");
    });

    it("handles trailing slashes", () => {
      expect(inferRepoName("https://github.com/org/my-repo/")).toBe("my-repo");
      expect(inferRepoName("https://github.com/org/my-repo///")).toBe("my-repo");
    });

    it("throws for empty string", () => {
      expect(() => inferRepoName("")).toThrow("Unable to infer repository name from URL");
    });

    it("throws for whitespace-only string", () => {
      expect(() => inferRepoName("   ")).toThrow("Unable to infer repository name from URL");
    });
  });
});
