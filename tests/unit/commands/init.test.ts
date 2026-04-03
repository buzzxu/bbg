import { join, win32 } from "node:path";
import { describe, expect, it } from "vitest";

import { deriveGitignorePath } from "../../../src/commands/init.js";

describe("deriveGitignorePath", () => {
  it("derives the root gitignore path for Windows config paths", () => {
    const configPath = win32.join("C:\\work", "project", ".bbg", "config.json");

    expect(deriveGitignorePath(configPath)).toBe(win32.join("C:\\work", "project", ".gitignore"));
  });

  it("derives the root gitignore path for POSIX config paths", () => {
    const configPath = join("/tmp", "project", ".bbg", "config.json");

    expect(deriveGitignorePath(configPath)).toBe(join("/tmp", "project", ".gitignore"));
  });
});
