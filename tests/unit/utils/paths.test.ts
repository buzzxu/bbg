import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join, sep } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  normalizeWorkspaceRelativePath,
  resolveBuiltinTemplatesRoot,
  resolvePackageRoot,
  toSnapshotRelativePath,
} from "../../../src/utils/paths.js";

describe("utils/paths", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function makeTempDir(): string {
    tempDir = mkdtempSync(join(tmpdir(), "bbg-paths-test-"));
    return tempDir;
  }

  describe("toSnapshotRelativePath", () => {
    it("wraps a simple file path with .bbg/generated-snapshots prefix and .gen suffix", () => {
      expect(toSnapshotRelativePath("AGENTS.md")).toBe(
        ".bbg/generated-snapshots/AGENTS.md.gen",
      );
    });

    it("preserves nested paths", () => {
      expect(toSnapshotRelativePath("docs/workflows/code-review-policy.md")).toBe(
        ".bbg/generated-snapshots/docs/workflows/code-review-policy.md.gen",
      );
    });

    it("handles paths with special characters", () => {
      expect(toSnapshotRelativePath("my-repo/AGENTS.md")).toBe(
        ".bbg/generated-snapshots/my-repo/AGENTS.md.gen",
      );
    });
  });

  describe("normalizeWorkspaceRelativePath", () => {
    it("converts an absolute path to a forward-slash relative path", () => {
      const cwd = "/workspace/project";
      const filePath = "/workspace/project/src/index.ts";
      const result = normalizeWorkspaceRelativePath(cwd, filePath);
      expect(result).toBe("src/index.ts");
    });

    it("uses forward slashes regardless of platform sep", () => {
      // On all platforms the result should use forward slashes
      const dir = makeTempDir();
      const nested = join(dir, "a", "b", "c.txt");
      const result = normalizeWorkspaceRelativePath(dir, nested);
      expect(result).toBe("a/b/c.txt");
      expect(result).not.toContain("\\");
    });

    it("returns the file name when it is directly inside cwd", () => {
      const cwd = "/workspace";
      const filePath = "/workspace/file.txt";
      expect(normalizeWorkspaceRelativePath(cwd, filePath)).toBe("file.txt");
    });
  });

  describe("resolveBuiltinTemplatesRoot", () => {
    it("returns first candidate when templates dir exists at that path", async () => {
      const dir = makeTempDir();
      const commandDir = join(dir, "dist", "commands");
      // Create the first candidate: commandDir/../../templates
      const templatesDir = join(commandDir, "..", "..", "templates");
      mkdirSync(templatesDir, { recursive: true });

      const result = await resolveBuiltinTemplatesRoot(commandDir);
      expect(result).toBe(join(commandDir, "..", "..", "templates"));
    });

    it("returns second candidate when only that one exists", async () => {
      const dir = makeTempDir();
      const commandDir = join(dir, "src", "commands");
      // Only create the second candidate: commandDir/../templates
      const templatesDir = join(commandDir, "..", "templates");
      mkdirSync(templatesDir, { recursive: true });
      mkdirSync(commandDir, { recursive: true });

      const result = await resolveBuiltinTemplatesRoot(commandDir);
      expect(result).toBe(join(commandDir, "..", "templates"));
    });

    it("returns first candidate as fallback when no candidates exist", async () => {
      const dir = makeTempDir();
      const commandDir = join(dir, "dist", "commands");
      mkdirSync(commandDir, { recursive: true });

      const result = await resolveBuiltinTemplatesRoot(commandDir);
      expect(result).toBe(join(commandDir, "..", "..", "templates"));
    });

    it("uses extra candidates when base candidates do not exist", async () => {
      const dir = makeTempDir();
      const commandDir = join(dir, "dist", "commands");
      mkdirSync(commandDir, { recursive: true });
      // Create extra candidate
      const extraCandidate = join(dir, "node_modules", "bbg", "templates");
      mkdirSync(extraCandidate, { recursive: true });

      const result = await resolveBuiltinTemplatesRoot(commandDir, [extraCandidate]);
      expect(result).toBe(extraCandidate);
    });

    it("prefers base candidates over extra candidates", async () => {
      const dir = makeTempDir();
      const commandDir = join(dir, "dist", "commands");
      // Create both the first candidate and an extra candidate
      const firstCandidate = join(commandDir, "..", "..", "templates");
      mkdirSync(firstCandidate, { recursive: true });
      const extraCandidate = join(dir, "node_modules", "bbg", "templates");
      mkdirSync(extraCandidate, { recursive: true });

      const result = await resolveBuiltinTemplatesRoot(commandDir, [extraCandidate]);
      expect(result).toBe(firstCandidate);
    });
  });

  describe("resolvePackageRoot", () => {
    it("returns first candidate when agents dir exists there", async () => {
      const dir = makeTempDir();
      const commandDir = join(dir, "dist", "commands");
      mkdirSync(commandDir, { recursive: true });
      // Create agents dir at commandDir/../../agents (= dir/agents)
      mkdirSync(join(dir, "agents"), { recursive: true });

      const result = await resolvePackageRoot(commandDir);
      expect(result).toBe(join(commandDir, "..", ".."));
    });

    it("returns second candidate when only that one has agents dir", async () => {
      const dir = makeTempDir();
      const commandDir = join(dir, "src", "commands");
      mkdirSync(commandDir, { recursive: true });
      // Create agents at commandDir/../agents (= dir/src/agents)
      mkdirSync(join(dir, "src", "agents"), { recursive: true });

      const result = await resolvePackageRoot(commandDir);
      expect(result).toBe(join(commandDir, ".."));
    });

    it("returns first candidate as fallback when no agents dir found", async () => {
      const dir = makeTempDir();
      const commandDir = join(dir, "dist", "commands");
      mkdirSync(commandDir, { recursive: true });

      const result = await resolvePackageRoot(commandDir);
      expect(result).toBe(join(commandDir, "..", ".."));
    });
  });
});
