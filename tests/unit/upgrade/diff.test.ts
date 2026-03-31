import { describe, expect, it } from "vitest";
import { createUnifiedPatch } from "../../../src/upgrade/diff.js";

describe("upgrade/diff – createUnifiedPatch", () => {
  describe("identical content", () => {
    it("produces no diff lines when content is the same", () => {
      const result = createUnifiedPatch("hello\n", "hello\n");

      expect(result).toContain("--- stored");
      expect(result).toContain("+++ rendered");
      // No added or removed lines
      expect(result).not.toMatch(/^[-+][^-+]/m);
    });

    it("reports zero counts in the hunk header", () => {
      const result = createUnifiedPatch("hello\n", "hello\n");

      // "hello\n" splits to ["hello", ""], prefixLen=2, oldStart=3
      expect(result).toContain("@@ -3,0 +3,0 @@");
    });
  });

  describe("added lines", () => {
    it("shows + prefixed lines for additions", () => {
      const result = createUnifiedPatch("a\n", "a\nb\n");

      expect(result).toContain("+b");
      // No removed lines (lines starting with - that aren't the header)
      const lines = result.split("\n");
      const removedLines = lines.filter((l) => l.startsWith("-") && !l.startsWith("---"));
      expect(removedLines).toHaveLength(0);
    });

    it("reports correct hunk header for a single added line", () => {
      const result = createUnifiedPatch("a\n", "a\nb\n");

      // before: ["a",""], after: ["a","b",""]
      // prefixLen=1, suffixLen=1, removed=[], added=["b"]
      // oldStart=2, oldCount=0, newStart=2, newCount=1
      expect(result).toContain("@@ -2,0 +2,1 @@");
    });
  });

  describe("removed lines", () => {
    it("shows - prefixed lines for removals", () => {
      const result = createUnifiedPatch("a\nb\n", "a\n");

      expect(result).toContain("-b");
      // No added lines (lines starting with + that aren't the header)
      const lines = result.split("\n");
      const addedLines = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++"));
      expect(addedLines).toHaveLength(0);
    });

    it("reports correct hunk header for a single removed line", () => {
      const result = createUnifiedPatch("a\nb\n", "a\n");

      // before: ["a","b",""], after: ["a",""]
      // prefixLen=1, suffixLen=1, removed=["b"], added=[]
      // oldStart=2, oldCount=1, newStart=2, newCount=0
      expect(result).toContain("@@ -2,1 +2,0 @@");
    });
  });

  describe("custom labels", () => {
    it("uses provided fromLabel and toLabel", () => {
      const result = createUnifiedPatch("a\n", "b\n", "old.txt", "new.txt");

      expect(result).toContain("--- old.txt");
      expect(result).toContain("+++ new.txt");
    });
  });

  describe("default labels", () => {
    it("uses 'stored' and 'rendered' when labels are omitted", () => {
      const result = createUnifiedPatch("a\n", "b\n");

      expect(result).toContain("--- stored");
      expect(result).toContain("+++ rendered");
    });
  });

  describe("empty strings", () => {
    it("handles two empty strings without crashing", () => {
      const result = createUnifiedPatch("", "");

      expect(result).toContain("--- stored");
      expect(result).toContain("+++ rendered");
      // "" splits to [""], prefixLen=1, oldStart=2, counts=0
      expect(result).toContain("@@ -2,0 +2,0 @@");
    });

    it("handles empty previous with non-empty next", () => {
      const result = createUnifiedPatch("", "hello\n");

      expect(result).toContain("+hello");
    });

    it("handles non-empty previous with empty next", () => {
      const result = createUnifiedPatch("hello\n", "");

      expect(result).toContain("-hello");
    });
  });

  describe("multi-line changes", () => {
    it("correctly diffs replacing multiple lines in the middle", () => {
      const before = "header\nold1\nold2\nfooter\n";
      const after = "header\nnew1\nnew2\nnew3\nfooter\n";
      const result = createUnifiedPatch(before, after);

      // before: ["header","old1","old2","footer",""]
      // after:  ["header","new1","new2","new3","footer",""]
      // prefixLen=1 ("header" matches)
      // suffixLen: ""==="" → 1, "footer"==="footer" → 2
      // removed = slice(1, 5-2) = slice(1,3) = ["old1","old2"]
      // added   = slice(1, 6-2) = slice(1,4) = ["new1","new2","new3"]
      // oldStart=2, oldCount=2, newStart=2, newCount=3
      expect(result).toContain("@@ -2,2 +2,3 @@");
      expect(result).toContain("-old1");
      expect(result).toContain("-old2");
      expect(result).toContain("+new1");
      expect(result).toContain("+new2");
      expect(result).toContain("+new3");
    });

    it("handles completely different content", () => {
      const before = "aaa\nbbb\n";
      const after = "xxx\nyyy\nzzz\n";
      const result = createUnifiedPatch(before, after);

      // before: ["aaa","bbb",""], after: ["xxx","yyy","zzz",""]
      // prefixLen=0, suffixLen: ""==="" → 1
      // removed = slice(0, 3-1) = ["aaa","bbb"]
      // added   = slice(0, 4-1) = ["xxx","yyy","zzz"]
      // oldStart=1, oldCount=2, newStart=1, newCount=3
      expect(result).toContain("@@ -1,2 +1,3 @@");
      expect(result).toContain("-aaa");
      expect(result).toContain("-bbb");
      expect(result).toContain("+xxx");
      expect(result).toContain("+yyy");
      expect(result).toContain("+zzz");
    });

    it("output ends with a trailing newline", () => {
      const result = createUnifiedPatch("a\n", "b\n");

      expect(result.endsWith("\n")).toBe(true);
    });
  });
});
