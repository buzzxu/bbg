import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  parseConventionalCommit,
  groupCommitsByType,
  formatChangelogEntry,
  getLastTag,
  getCommitsSinceTag,
  generateChangelog,
  appendToChangelog,
  type ConventionalCommit,
  type ChangelogEntry,
} from "../../../src/release/changelog.js";
import type { Result } from "execa";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

vi.mock("../../../src/utils/fs.js", () => ({
  exists: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

const createExecaResult = (stdout: string, command: string): Result => ({
  stdout,
  stderr: "",
  all: undefined,
  stdio: [undefined, stdout, ""],
  ipcOutput: [],
  pipedFrom: [],
  command,
  escapedCommand: command,
  cwd: "/fake/cwd",
  durationMs: 0,
  failed: false,
  timedOut: false,
  isCanceled: false,
  isGracefullyCanceled: false,
  isMaxBuffer: false,
  isTerminated: false,
  isForcefullyTerminated: false,
  exitCode: 0,
  signal: undefined,
  signalDescription: undefined,
  message: undefined,
  shortMessage: undefined,
  originalMessage: undefined,
  cause: undefined,
  code: undefined,
  name: undefined,
  stack: undefined,
});

describe("release/changelog", () => {
  describe("parseConventionalCommit", () => {
    it("parses a simple feat commit", () => {
      const result = parseConventionalCommit("abc1234", "feat: add new feature", "Author", "2026-04-01");

      expect(result).not.toBeNull();
      expect(result!.type).toBe("feat");
      expect(result!.subject).toBe("add new feature");
      expect(result!.scope).toBeUndefined();
      expect(result!.breaking).toBe(false);
    });

    it("parses a scoped fix commit", () => {
      const result = parseConventionalCommit("def5678", "fix(parser): handle edge case", "Author", "2026-04-01");

      expect(result).not.toBeNull();
      expect(result!.type).toBe("fix");
      expect(result!.scope).toBe("parser");
      expect(result!.subject).toBe("handle edge case");
    });

    it("detects breaking change indicator", () => {
      const result = parseConventionalCommit("ghi9012", "feat!: breaking API change", "Author", "2026-04-01");

      expect(result).not.toBeNull();
      expect(result!.breaking).toBe(true);
      expect(result!.subject).toBe("breaking API change");
    });

    it("returns null for non-conventional commits", () => {
      expect(parseConventionalCommit("abc", "random message", "Author", "2026-04-01")).toBeNull();
      expect(parseConventionalCommit("abc", "Merge branch 'main'", "Author", "2026-04-01")).toBeNull();
    });
  });

  describe("groupCommitsByType", () => {
    it("groups commits by their conventional type", () => {
      const commits: ConventionalCommit[] = [
        { hash: "a1", type: "feat", subject: "feature 1", author: "A", date: "2026-04-01", breaking: false },
        { hash: "a2", type: "fix", subject: "bugfix 1", author: "A", date: "2026-04-01", breaking: false },
        { hash: "a3", type: "feat", subject: "feature 2", author: "A", date: "2026-04-01", breaking: false },
      ];

      const groups = groupCommitsByType(commits);

      expect(groups.get("feat")?.length).toBe(2);
      expect(groups.get("fix")?.length).toBe(1);
    });

    it("returns empty map for empty input", () => {
      const groups = groupCommitsByType([]);
      expect(groups.size).toBe(0);
    });
  });

  describe("formatChangelogEntry", () => {
    it("formats a changelog entry in Keep a Changelog format", () => {
      const entry: ChangelogEntry = {
        version: "0.4.0",
        date: "2026-04-01",
        sections: new Map([
          [
            "feat",
            [
              {
                hash: "a1",
                type: "feat",
                subject: "add upgrade merge",
                author: "Dev",
                date: "2026-04-01",
                breaking: false,
              },
            ],
          ],
          [
            "fix",
            [
              {
                hash: "b1",
                type: "fix",
                subject: "fix doctor crash",
                author: "Dev",
                date: "2026-04-01",
                breaking: false,
              },
            ],
          ],
        ]),
      };

      const output = formatChangelogEntry(entry);

      expect(output).toContain("## [0.4.0]");
      expect(output).toContain("2026-04-01");
      expect(output).toContain("### Added");
      expect(output).toContain("add upgrade merge");
      expect(output).toContain("### Fixed");
      expect(output).toContain("fix doctor crash");
    });

    it("omits empty sections", () => {
      const entry: ChangelogEntry = {
        version: "0.4.0",
        date: "2026-04-01",
        sections: new Map([
          [
            "feat",
            [{ hash: "a1", type: "feat", subject: "only feature", author: "Dev", date: "2026-04-01", breaking: false }],
          ],
        ]),
      };

      const output = formatChangelogEntry(entry);

      expect(output).toContain("### Added");
      expect(output).not.toContain("### Fixed");
      expect(output).not.toContain("### Changed");
    });

    it("includes scope in parentheses when present", () => {
      const entry: ChangelogEntry = {
        version: "0.4.0",
        date: "2026-04-01",
        sections: new Map([
          [
            "feat",
            [
              {
                hash: "a1",
                type: "feat",
                scope: "upgrade",
                subject: "add merge",
                author: "Dev",
                date: "2026-04-01",
                breaking: false,
              },
            ],
          ],
        ]),
      };

      const output = formatChangelogEntry(entry);

      expect(output).toContain("**(upgrade)**");
    });
  });

  describe("getLastTag", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("returns the latest tag when tags exist", async () => {
      const { execa } = await import("execa");
      vi.mocked(execa).mockResolvedValue(createExecaResult("v0.4.0", "git describe --tags --abbrev=0"));

      const result = await getLastTag("/fake/cwd");

      expect(result).toBe("v0.4.0");
    });

    it("returns null when no tags exist", async () => {
      const { execa } = await import("execa");
      vi.mocked(execa).mockRejectedValue(new Error("fatal: No names found"));

      const result = await getLastTag("/fake/cwd");

      expect(result).toBeNull();
    });

    it("returns null when stdout is empty", async () => {
      const { execa } = await import("execa");
      vi.mocked(execa).mockResolvedValue(createExecaResult("", "git describe --tags --abbrev=0"));

      const result = await getLastTag("/fake/cwd");

      expect(result).toBeNull();
    });
  });

  describe("getCommitsSinceTag", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("parses multi-commit output with tag range", async () => {
      const { execa } = await import("execa");
      const stdout = [
        "abc1234\x00feat: add feature\x00Author\x002026-04-01T00:00:00+00:00",
        "def5678\x00fix: fix bug\x00Author\x002026-04-01T00:00:00+00:00",
      ].join("\n");

      vi.mocked(execa).mockResolvedValue(createExecaResult(stdout, "git log"));

      const result = await getCommitsSinceTag("/fake/cwd", "v0.3.0");

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("feat");
      expect(result[0].subject).toBe("add feature");
      expect(result[1].type).toBe("fix");
      expect(result[1].subject).toBe("fix bug");
    });

    it("returns empty array when no commits", async () => {
      const { execa } = await import("execa");
      vi.mocked(execa).mockResolvedValue(createExecaResult("", "git log"));

      const result = await getCommitsSinceTag("/fake/cwd", "v0.4.0");

      expect(result).toHaveLength(0);
    });

    it("skips non-conventional commits", async () => {
      const { execa } = await import("execa");
      const stdout = [
        "abc1234\x00feat: add feature\x00Author\x002026-04-01T00:00:00+00:00",
        "def5678\x00Merge branch 'main'\x00Author\x002026-04-01T00:00:00+00:00",
      ].join("\n");

      vi.mocked(execa).mockResolvedValue(createExecaResult(stdout, "git log"));

      const result = await getCommitsSinceTag("/fake/cwd");

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("feat");
    });

    it("returns empty array when git command fails", async () => {
      const { execa } = await import("execa");
      vi.mocked(execa).mockRejectedValue(new Error("git error"));

      const result = await getCommitsSinceTag("/fake/cwd");

      expect(result).toHaveLength(0);
    });
  });

  describe("generateChangelog", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("generates changelog entry from git history", async () => {
      const { execa } = await import("execa");

      vi.mocked(execa)
        // Mock getLastTag → returns "v0.3.0"
        .mockResolvedValueOnce(createExecaResult("v0.3.0", "git describe"))
        // Mock getCommitsSinceTag → returns 2 commits
        .mockResolvedValueOnce(
          createExecaResult(
            [
              "abc1234\x00feat: add three-way merge\x00Dev\x002026-04-01T00:00:00+00:00",
              "def5678\x00fix: fix doctor crash\x00Dev\x002026-04-01T00:00:00+00:00",
            ].join("\n"),
            "git log",
          ),
        );

      const result = await generateChangelog("/fake/cwd", "0.4.0", "2026-04-01");

      expect(result.commitCount).toBe(2);
      expect(result.entry).toContain("## [0.4.0] - 2026-04-01");
      expect(result.entry).toContain("### Added");
      expect(result.entry).toContain("add three-way merge");
      expect(result.entry).toContain("### Fixed");
      expect(result.entry).toContain("fix doctor crash");
    });

    it("handles no tags scenario", async () => {
      const { execa } = await import("execa");

      vi.mocked(execa)
        // Mock getLastTag → rejects (no tags)
        .mockRejectedValueOnce(new Error("No tags"))
        // Mock getCommitsSinceTag → returns 1 commit (no range)
        .mockResolvedValueOnce(
          createExecaResult("abc1234\x00feat: initial release\x00Dev\x002026-03-30T00:00:00+00:00", "git log"),
        );

      const result = await generateChangelog("/fake/cwd", "0.1.0", "2026-03-30");

      expect(result.commitCount).toBe(1);
      expect(result.entry).toContain("## [0.1.0] - 2026-03-30");
    });
  });

  describe("appendToChangelog", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("creates new changelog file when none exists", async () => {
      const fs = await import("../../../src/utils/fs.js");
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(fs.writeTextFile).mockResolvedValue(undefined);

      await appendToChangelog("/fake/cwd", "## [1.0.0] - 2026-04-01\n\n### Added\n\n- Feature", "CHANGELOG.md");

      expect(fs.writeTextFile).toHaveBeenCalledOnce();
      const written = vi.mocked(fs.writeTextFile).mock.calls[0][1];
      expect(written).toContain("# Changelog");
      expect(written).toContain("## [1.0.0]");
    });

    it("inserts entry after header in existing file", async () => {
      const fs = await import("../../../src/utils/fs.js");
      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(
        "# Changelog\n\n## [0.4.0] - 2026-04-01\n\n### Added\n\n- Old feature\n",
      );
      vi.mocked(fs.writeTextFile).mockResolvedValue(undefined);

      await appendToChangelog("/fake/cwd", "## [1.0.0] - 2026-04-01\n\n### Added\n\n- New feature", "CHANGELOG.md");

      expect(fs.writeTextFile).toHaveBeenCalledOnce();
      const written = vi.mocked(fs.writeTextFile).mock.calls[0][1];
      expect(written).toMatch(/# Changelog\n\n## \[1\.0\.0\]/);
      expect(written).toContain("## [0.4.0]");
    });

    it("appends to file without standard header", async () => {
      const fs = await import("../../../src/utils/fs.js");
      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue("Some non-standard content\n");
      vi.mocked(fs.writeTextFile).mockResolvedValue(undefined);

      await appendToChangelog("/fake/cwd", "## [1.0.0] - 2026-04-01", "CHANGELOG.md");

      expect(fs.writeTextFile).toHaveBeenCalledOnce();
      const written = vi.mocked(fs.writeTextFile).mock.calls[0][1];
      expect(written).toContain("Some non-standard content");
      expect(written).toContain("## [1.0.0]");
    });

    it("rejects path traversal", async () => {
      await expect(appendToChangelog("/fake/cwd", "entry", "../../etc/passwd")).rejects.toThrow(
        "changelogPath must resolve within cwd",
      );
    });
  });
});
