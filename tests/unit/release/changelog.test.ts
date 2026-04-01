import { describe, expect, it } from "vitest";
import {
  parseConventionalCommit,
  groupCommitsByType,
  formatChangelogEntry,
  type ConventionalCommit,
  type ChangelogEntry,
} from "../../../src/release/changelog.js";

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
          ["feat", [
            { hash: "a1", type: "feat", subject: "add upgrade merge", author: "Dev", date: "2026-04-01", breaking: false },
          ]],
          ["fix", [
            { hash: "b1", type: "fix", subject: "fix doctor crash", author: "Dev", date: "2026-04-01", breaking: false },
          ]],
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
          ["feat", [
            { hash: "a1", type: "feat", subject: "only feature", author: "Dev", date: "2026-04-01", breaking: false },
          ]],
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
          ["feat", [
            { hash: "a1", type: "feat", scope: "upgrade", subject: "add merge", author: "Dev", date: "2026-04-01", breaking: false },
          ]],
        ]),
      };

      const output = formatChangelogEntry(entry);

      expect(output).toContain("**(upgrade)**");
    });
  });
});
