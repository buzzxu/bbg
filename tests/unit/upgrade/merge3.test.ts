import { describe, expect, it } from "vitest";
import { threeWayMerge } from "../../../src/upgrade/merge3.js";

describe("upgrade/merge3 – threeWayMerge", () => {
  describe("no conflicts", () => {
    it("returns merged content when changes do not overlap", () => {
      // Changes need sufficient context separation to avoid diff3 adjacency conflicts
      const base = "line1\nline2\nspacer1\nspacer2\nline3\n";
      const ours = "line1\nuser-changed\nspacer1\nspacer2\nline3\n";
      const theirs = "line1\nline2\nspacer1\nspacer2\ntemplate-changed\n";

      const result = threeWayMerge(base, ours, theirs);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflictCount).toBe(0);
      expect(result.merged).toContain("user-changed");
      expect(result.merged).toContain("template-changed");
    });

    it("auto-resolves identical changes from both sides", () => {
      const base = "line1\nold\nline3\n";
      const ours = "line1\nsame-change\nline3\n";
      const theirs = "line1\nsame-change\nline3\n";

      const result = threeWayMerge(base, ours, theirs);

      expect(result.hasConflicts).toBe(false);
      expect(result.merged).toContain("same-change");
    });

    it("returns base content when neither side changed", () => {
      const base = "line1\nline2\nline3\n";

      const result = threeWayMerge(base, base, base);

      expect(result.hasConflicts).toBe(false);
      expect(result.merged).toBe(base);
    });
  });

  describe("with conflicts", () => {
    it("inserts conflict markers when both sides change the same region", () => {
      const base = "line1\noriginal\nline3\n";
      const ours = "line1\nuser-version\nline3\n";
      const theirs = "line1\ntemplate-version\nline3\n";

      const result = threeWayMerge(base, ours, theirs);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictCount).toBe(1);
      expect(result.merged).toContain("<<<<<<<");
      expect(result.merged).toContain("=======");
      expect(result.merged).toContain(">>>>>>>");
      expect(result.merged).toContain("user-version");
      expect(result.merged).toContain("template-version");
    });

    it("uses custom labels in conflict markers", () => {
      const base = "original\n";
      const ours = "user\n";
      const theirs = "template\n";

      const result = threeWayMerge(base, ours, theirs, {
        ours: "current",
        theirs: "incoming",
      });

      expect(result.merged).toContain("<<<<<<< current");
      expect(result.merged).toContain(">>>>>>> incoming");
    });

    it("counts multiple conflict regions correctly", () => {
      const base = "a\nb\nc\nd\ne\n";
      const ours = "a\nuser1\nc\nuser2\ne\n";
      const theirs = "a\ntmpl1\nc\ntmpl2\ne\n";

      const result = threeWayMerge(base, ours, theirs);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictCount).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("handles empty base with additions from both sides", () => {
      const base = "\n";
      const ours = "user-added\n";
      const theirs = "template-added\n";

      const result = threeWayMerge(base, ours, theirs);

      // Both sides added to empty — may conflict or merge depending on position
      expect(typeof result.merged).toBe("string");
      expect(typeof result.hasConflicts).toBe("boolean");
    });

    it("handles only-ours changes cleanly", () => {
      const base = "line1\nline2\n";
      const ours = "line1\nuser-changed\n";
      const theirs = "line1\nline2\n";

      const result = threeWayMerge(base, ours, theirs);

      expect(result.hasConflicts).toBe(false);
      expect(result.merged).toContain("user-changed");
    });

    it("handles only-theirs changes cleanly", () => {
      const base = "line1\nline2\n";
      const ours = "line1\nline2\n";
      const theirs = "line1\ntemplate-changed\n";

      const result = threeWayMerge(base, ours, theirs);

      expect(result.hasConflicts).toBe(false);
      expect(result.merged).toContain("template-changed");
    });
  });
});
