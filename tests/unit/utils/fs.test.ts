import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { exists, readIfExists, readTextFile, writeTextFile } from "../../../src/utils/fs.js";

describe("utils/fs", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function makeTempDir(): string {
    tempDir = mkdtempSync(join(tmpdir(), "bbg-fs-test-"));
    return tempDir;
  }

  describe("exists", () => {
    it("returns true for an existing file", async () => {
      const dir = makeTempDir();
      const filePath = join(dir, "test.txt");
      await writeTextFile(filePath, "hello");

      expect(await exists(filePath)).toBe(true);
    });

    it("returns false for a non-existent path", async () => {
      const dir = makeTempDir();
      const filePath = join(dir, "does-not-exist.txt");

      expect(await exists(filePath)).toBe(false);
    });

    it("returns true for an existing directory", async () => {
      const dir = makeTempDir();

      expect(await exists(dir)).toBe(true);
    });
  });

  describe("readTextFile", () => {
    it("reads file contents as utf8 string", async () => {
      const dir = makeTempDir();
      const filePath = join(dir, "read-test.txt");
      await writeTextFile(filePath, "file content here");

      const content = await readTextFile(filePath);
      expect(content).toBe("file content here");
    });

    it("throws when file does not exist", async () => {
      const dir = makeTempDir();
      const filePath = join(dir, "missing.txt");

      await expect(readTextFile(filePath)).rejects.toThrow();
    });
  });

  describe("writeTextFile", () => {
    it("writes content to a file", async () => {
      const dir = makeTempDir();
      const filePath = join(dir, "write-test.txt");

      await writeTextFile(filePath, "written content");

      const content = await readTextFile(filePath);
      expect(content).toBe("written content");
    });

    it("creates intermediate directories if needed", async () => {
      const dir = makeTempDir();
      const filePath = join(dir, "nested", "deep", "file.txt");

      await writeTextFile(filePath, "deep content");

      expect(await exists(filePath)).toBe(true);
      const content = await readTextFile(filePath);
      expect(content).toBe("deep content");
    });

    it("overwrites an existing file", async () => {
      const dir = makeTempDir();
      const filePath = join(dir, "overwrite.txt");

      await writeTextFile(filePath, "first");
      await writeTextFile(filePath, "second");

      const content = await readTextFile(filePath);
      expect(content).toBe("second");
    });
  });

  describe("readIfExists", () => {
    it("returns file contents when file exists", async () => {
      const dir = makeTempDir();
      const filePath = join(dir, "present.txt");
      await writeTextFile(filePath, "present content");

      const content = await readIfExists(filePath);
      expect(content).toBe("present content");
    });

    it("returns empty string when file does not exist", async () => {
      const dir = makeTempDir();
      const filePath = join(dir, "absent.txt");

      const content = await readIfExists(filePath);
      expect(content).toBe("");
    });
  });
});
