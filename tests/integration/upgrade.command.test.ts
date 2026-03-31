import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sha256Hex } from "../../src/config/hash.js";
import { writeTextFile } from "../../src/utils/fs.js";

const promptState = vi.hoisted(() => ({
  promptConfirm: vi.fn(),
}));

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-upgrade-test-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  const config = {
    version: "0.0.1",
    projectName: "bbg-project",
    projectDescription: "upgrade test",
    createdAt: "2026-03-29T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
    repos: [
      {
        name: "repo-a",
        gitUrl: "https://example.com/repo-a.git",
        branch: "main",
        type: "backend",
        stack: {
          language: "typescript",
          framework: "node",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
        },
        description: "repo",
      },
    ],
    governance: {
      riskThresholds: {
        high: { grade: "A+", minScore: 99 },
        medium: { grade: "A", minScore: 95 },
        low: { grade: "B", minScore: 85 },
      },
      enableRedTeam: true,
      enableCrossAudit: true,
    },
    context: {},
  };

  const trackedOld = {
    "AGENTS.md": "old agents\n",
    "docs/workflows/release-checklist.md": "old checklist\n",
    ".gitignore": "old ignore\n",
  };

  await Promise.all([
    writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`),
    writeTextFile(join(cwd, "AGENTS.md"), trackedOld["AGENTS.md"]),
    writeTextFile(join(cwd, ".gitignore"), trackedOld[".gitignore"]),
    writeTextFile(join(cwd, "docs", "workflows", "release-checklist.md"), trackedOld["docs/workflows/release-checklist.md"]),
    writeTextFile(join(cwd, ".bbg", "generated-snapshots", "AGENTS.md.gen"), trackedOld["AGENTS.md"]),
    writeTextFile(
      join(cwd, ".bbg", "generated-snapshots", "docs", "workflows", "release-checklist.md.gen"),
      trackedOld["docs/workflows/release-checklist.md"],
    ),
    writeTextFile(join(cwd, ".bbg", "generated-snapshots", ".gitignore.gen"), trackedOld[".gitignore"]),
    mkdir(join(cwd, "repo-a"), { recursive: true }),
  ]);

  const hashes = {
    "AGENTS.md": {
      generatedHash: sha256Hex(trackedOld["AGENTS.md"]),
      generatedAt: "2026-03-29T00:00:00.000Z",
      templateVersion: "0.0.1",
    },
    "docs/workflows/release-checklist.md": {
      generatedHash: sha256Hex(trackedOld["docs/workflows/release-checklist.md"]),
      generatedAt: "2026-03-29T00:00:00.000Z",
      templateVersion: "0.0.1",
    },
    ".gitignore": {
      generatedHash: sha256Hex(trackedOld[".gitignore"]),
      generatedAt: "2026-03-29T00:00:00.000Z",
      templateVersion: "0.0.1",
    },
  };

  await writeTextFile(join(cwd, ".bbg", "file-hashes.json"), `${JSON.stringify(hashes, null, 2)}\n`);
}

vi.mock("../../src/utils/prompts.js", () => ({
  promptConfirm: promptState.promptConfirm,
}));

import { runUpgrade } from "../../src/commands/upgrade.js";

describe("upgrade command", () => {
  beforeEach(() => {
    promptState.promptConfirm.mockReset();
    promptState.promptConfirm.mockResolvedValue(true);
  });

  afterEach(async () => {
    const { rm } = await import("node:fs/promises");
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("applies decision matrix, uses render pipeline, and updates config/hash records", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    await writeTextFile(join(cwd, "docs", "workflows", "release-checklist.md"), "user changed checklist\n");

    const result = await runUpgrade({ cwd });

    expect(result.overwritten).toContain("AGENTS.md");
    expect(result.patches).toContain(".bbg/upgrade-patches/docs/workflows/release-checklist.md.patch");
    expect(result.skippedWithNotice).not.toContain("docs/workflows/release-checklist.md");
    expect(result.skippedDeletedTemplate).toContain(".gitignore");
    expect(result.created).toContain("README.md");
    expect(result.created).toContain(".githooks/pre-commit");

    const patchText = await readFile(
      join(cwd, ".bbg", "upgrade-patches", "docs", "workflows", "release-checklist.md.patch"),
      "utf8",
    );
    expect(patchText).toContain("--- old-generated");
    expect(patchText).toContain("+++ new-generated");

    const createdHookContent = await readFile(join(cwd, ".githooks", "pre-commit"), "utf8");
    expect(createdHookContent).toContain("#!/usr/bin/env bash");

    const updatedConfig = JSON.parse(await readFile(join(cwd, ".bbg", "config.json"), "utf8")) as {
      version: string;
    };
    expect(updatedConfig.version).toBe("0.1.0");

    const hashRecord = JSON.parse(await readFile(join(cwd, ".bbg", "file-hashes.json"), "utf8")) as Record<
      string,
      { generatedHash: string; generatedAt: string; templateVersion: string }
    >;
    expect(hashRecord["AGENTS.md"]?.templateVersion).toBe("0.1.0");
    expect(hashRecord["README.md"]?.templateVersion).toBe("0.1.0");
    expect(hashRecord[".githooks/pre-commit"]?.templateVersion).toBe("0.1.0");
    expect(hashRecord["docs/workflows/release-checklist.md"]?.templateVersion).toBe("0.0.1");
  });

  it("supports dry-run and asks confirmation before --force overwrite", { timeout: 15000 }, async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    await writeTextFile(join(cwd, "docs", "workflows", "release-checklist.md"), "user changed checklist\n");

    const dryRunResult = await runUpgrade({ cwd, dryRun: true });
    expect(dryRunResult.patches).toContain(".bbg/upgrade-patches/docs/workflows/release-checklist.md.patch");
    await expect(
      readFile(join(cwd, ".bbg", "upgrade-patches", "docs", "workflows", "release-checklist.md.patch"), "utf8"),
    ).rejects.toThrow();
  
    promptState.promptConfirm.mockResolvedValueOnce(false);
    await expect(runUpgrade({ cwd, force: true })).rejects.toThrow(/force/i);

    const forceResult = await runUpgrade({ cwd, force: true });
    expect(forceResult.patches).toEqual([]);
    expect(forceResult.overwritten).toContain("docs/workflows/release-checklist.md");
    expect(promptState.promptConfirm).toHaveBeenCalled();
  });

  it("iterates hash-tracked files and marks newly introduced manifest files as new", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runUpgrade({ cwd, dryRun: true });

    expect(result.created).toContain("README.md");
    expect(result.created).toContain(".githooks/pre-commit");
    expect(result.skippedDeletedTemplate).toContain(".gitignore");
  });

  it("creates unified diff patch for user-modified tracked files using old snapshot baseline", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    await writeTextFile(join(cwd, "docs", "workflows", "release-checklist.md"), "user changed checklist\n");

    const result = await runUpgrade({ cwd });

    const patchPath = ".bbg/upgrade-patches/docs/workflows/release-checklist.md.patch";
    expect(result.patches).toContain(patchPath);
    const patchText = await readFile(join(cwd, patchPath), "utf8");
    expect(patchText).toContain("--- old-generated");
    expect(patchText).toContain("+++ new-generated");
    expect(patchText).not.toContain("BASELINE UNAVAILABLE");
  });

  it("protects existing untracked files that are newly introduced by manifest", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const protectedReadme = "user-owned readme\n";
    await writeTextFile(join(cwd, "README.md"), protectedReadme);

    const result = await runUpgrade({ cwd });

    expect(result.overwritten).not.toContain("README.md");
    expect(result.created).not.toContain("README.md");
    expect(result.skippedWithNotice).toContain("README.md");
    expect(result.patches).toContain(".bbg/upgrade-patches/README.md.patch");

    const readmeAfter = await readFile(join(cwd, "README.md"), "utf8");
    expect(readmeAfter).toBe(protectedReadme);

    const noticeText = await readFile(join(cwd, ".bbg", "upgrade-patches", "README.md.patch"), "utf8");
    expect(noticeText).toContain("BASELINE UNAVAILABLE");
    expect(noticeText).toContain("new generated content preview");

    const hashRecord = JSON.parse(await readFile(join(cwd, ".bbg", "file-hashes.json"), "utf8")) as Record<
      string,
      { generatedHash: string; generatedAt: string; templateVersion: string }
    >;
    expect(hashRecord["README.md"]).toBeUndefined();
  });

  it("renders child AGENTS with repo context and skips orphan child AGENTS with notice", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const trackedChildAgents = {
      "repo-a/AGENTS.md": "old child agents\n",
      "orphan-repo/AGENTS.md": "old orphan child agents\n",
    };

    await Promise.all([
      writeTextFile(join(cwd, "repo-a", "AGENTS.md"), trackedChildAgents["repo-a/AGENTS.md"]),
      writeTextFile(join(cwd, "orphan-repo", "AGENTS.md"), trackedChildAgents["orphan-repo/AGENTS.md"]),
      writeTextFile(
        join(cwd, ".bbg", "generated-snapshots", "repo-a", "AGENTS.md.gen"),
        trackedChildAgents["repo-a/AGENTS.md"],
      ),
      writeTextFile(
        join(cwd, ".bbg", "generated-snapshots", "orphan-repo", "AGENTS.md.gen"),
        trackedChildAgents["orphan-repo/AGENTS.md"],
      ),
    ]);

    const existingHashes = JSON.parse(await readFile(join(cwd, ".bbg", "file-hashes.json"), "utf8")) as Record<
      string,
      { generatedHash: string; generatedAt: string; templateVersion: string }
    >;
    existingHashes["repo-a/AGENTS.md"] = {
      generatedHash: sha256Hex(trackedChildAgents["repo-a/AGENTS.md"]),
      generatedAt: "2026-03-29T00:00:00.000Z",
      templateVersion: "0.0.1",
    };
    existingHashes["orphan-repo/AGENTS.md"] = {
      generatedHash: sha256Hex(trackedChildAgents["orphan-repo/AGENTS.md"]),
      generatedAt: "2026-03-29T00:00:00.000Z",
      templateVersion: "0.0.1",
    };
    await writeTextFile(join(cwd, ".bbg", "file-hashes.json"), `${JSON.stringify(existingHashes, null, 2)}\n`);

    const result = await runUpgrade({ cwd });

    expect(result.overwritten).toContain("repo-a/AGENTS.md");
    const childAgentsContent = await readFile(join(cwd, "repo-a", "AGENTS.md"), "utf8");
    expect(childAgentsContent).toContain("# repo-a -- Agent Rules");
    expect(childAgentsContent).toContain("**Type:** backend");
    expect(childAgentsContent).toContain("**Description:** repo");
    expect(childAgentsContent).toContain("**Stack:** typescript / node");

    expect(result.skippedWithNotice).toContain("orphan-repo/AGENTS.md");
    expect(result.patches).toContain(".bbg/upgrade-patches/orphan-repo/AGENTS.md.patch");
    const orphanNotice = await readFile(join(cwd, ".bbg", "upgrade-patches", "orphan-repo", "AGENTS.md.patch"), "utf8");
    expect(orphanNotice).toContain("CHILD AGENTS REPO CONTEXT MISSING");
  });
});
