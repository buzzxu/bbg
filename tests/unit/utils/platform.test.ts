import { chmodSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadPlatformModule(platform: NodeJS.Platform) {
  vi.resetModules();
  vi.spyOn(process, "platform", "get").mockReturnValue(platform);
  return import("../../../src/utils/platform.js");
}

describe("utils/platform", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("exposes platform booleans based on process.platform", async () => {
    const windowsModule = await loadPlatformModule("win32");
    expect(windowsModule.isWindows).toBe(true);
    expect(windowsModule.isMac).toBe(false);
    expect(windowsModule.isLinux).toBe(false);

    const macModule = await loadPlatformModule("darwin");
    expect(macModule.isWindows).toBe(false);
    expect(macModule.isMac).toBe(true);
    expect(macModule.isLinux).toBe(false);

    const linuxModule = await loadPlatformModule("linux");
    expect(linuxModule.isWindows).toBe(false);
    expect(linuxModule.isMac).toBe(false);
    expect(linuxModule.isLinux).toBe(true);
  });

  it("makes file executable on non-windows platforms", async () => {
    const { makeExecutable } = await loadPlatformModule("linux");
    const tempDir = mkdtempSync(join(tmpdir(), "bbg-exec-"));
    const filePath = join(tempDir, "script.sh");

    writeFileSync(filePath, "#!/usr/bin/env node\n", "utf8");
    chmodSync(filePath, 0o644);

    const result = makeExecutable(filePath);
    expect(result).toBeUndefined();

    const fileStat = statSync(filePath);
    expect((fileStat.mode & 0o111) !== 0).toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("does nothing on windows", async () => {
    const { makeExecutable } = await loadPlatformModule("win32");

    expect(makeExecutable("ignored-path")).toBeUndefined();
  });

  it("normalizes gitignore paths for cross-platform usage", async () => {
    const { normalizeGitIgnorePath } = await loadPlatformModule("linux");

    expect(normalizeGitIgnorePath("a\\b\\c")).toBe("a/b/c");
    expect(normalizeGitIgnorePath("./src//utils/")).toBe("src/utils");
    expect(normalizeGitIgnorePath("")).toBe(".");
  });
});
