import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  BBG_GITIGNORE_ENTRIES,
  MANAGED_GITIGNORE_BLOCK_END,
  MANAGED_GITIGNORE_BLOCK_START,
} from "../../src/constants.js";
import { runInit } from "../../src/commands/init.js";
import { runUninstall } from "../../src/commands/uninstall.js";
import { exists, writeTextFile } from "../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "bbg-uninstall-test-"));
  tempDirs.push(cwd);
  return cwd;
}

describe("uninstall command", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((cwd) => rm(cwd, { recursive: true, force: true })));
  });

  it("plans removals without mutating files in dry-run mode", { timeout: 30000 }, async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });

    await writeTextFile(join(cwd, "AGENTS.md"), `${await readFile(join(cwd, "AGENTS.md"), "utf8")}\nuser notes\n`);
    const beforeConfig = await readFile(join(cwd, ".bbg", "config.json"), "utf8");

    const result = await runUninstall({
      cwd,
      dryRun: true,
      yes: true,
    });

    expect(result.deleted).toContain(".bbg/config.json");
    expect(result.skippedModified).toContain("AGENTS.md");
    expect(await readFile(join(cwd, ".bbg", "config.json"), "utf8")).toBe(beforeConfig);
    expect(await exists(join(cwd, "AGENTS.md"))).toBe(true);
  });

  it("removes managed sections safely and preserves modified mixed-ownership files", { timeout: 30000 }, async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });

    const originalClaude = await readFile(join(cwd, "CLAUDE.md"), "utf8");
    await writeTextFile(join(cwd, "CLAUDE.md"), `# Local Notes\n\n${originalClaude}\n## Footer\nKeep this.\n`);
    await writeTextFile(join(cwd, "AGENTS.md"), `${await readFile(join(cwd, "AGENTS.md"), "utf8")}\nuser notes\n`);

    const result = await runUninstall({
      cwd,
      yes: true,
    });

    expect(result.removedSections).toContain("CLAUDE.md");
    expect(result.skippedModified).toContain("AGENTS.md");
    const claudeContent = await readFile(join(cwd, "CLAUDE.md"), "utf8");
    expect(claudeContent).toContain("# Local Notes");
    expect(claudeContent).toContain("## Footer");
    expect(claudeContent).not.toContain("BBG:BEGIN MANAGED");

    if (await exists(join(cwd, ".gitignore"))) {
      const gitignoreContent = await readFile(join(cwd, ".gitignore"), "utf8");
      for (const entry of BBG_GITIGNORE_ENTRIES) {
        expect(gitignoreContent).not.toContain(entry);
      }
      expect(gitignoreContent).not.toContain(MANAGED_GITIGNORE_BLOCK_START);
      expect(gitignoreContent).not.toContain(MANAGED_GITIGNORE_BLOCK_END);
    }

    expect(await exists(join(cwd, ".bbg", "config.json"))).toBe(false);
  });

  it("preserves runtime task data when requested", { timeout: 30000 }, async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });

    await writeTextFile(
      join(cwd, ".bbg", "tasks", "sample-task", "session.json"),
      '{\n  "status": "implementing"\n}\n',
    );

    const result = await runUninstall({
      cwd,
      yes: true,
      keepRuntimeData: true,
    });

    expect(result.kept).toContain(".bbg/tasks");
    expect(await exists(join(cwd, ".bbg", "tasks", "sample-task", "session.json"))).toBe(true);
    expect(await exists(join(cwd, ".bbg", "config.json"))).toBe(false);
  });

  it("allows re-initialization after uninstall", { timeout: 45000 }, async () => {
    const cwd = await makeTempDir();
    await runInit({ cwd, yes: true, dryRun: false });
    await runUninstall({ cwd, yes: true });

    const result = await runInit({ cwd, yes: true, dryRun: false });

    expect(result.createdFiles).toContain(join(cwd, ".bbg", "config.json"));
    expect(await exists(join(cwd, ".bbg", "config.json"))).toBe(true);
  });
});
