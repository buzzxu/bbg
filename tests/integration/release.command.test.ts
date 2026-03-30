import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeTextFile } from "../../src/utils/fs.js";

const promptState = vi.hoisted(() => ({
  promptConfirm: vi.fn(),
  promptInput: vi.fn(),
}));

const doctorState = vi.hoisted(() => ({
  runDoctor: vi.fn(),
}));

const syncState = vi.hoisted(() => ({
  runSync: vi.fn(),
}));

vi.mock("../../src/utils/prompts.js", () => ({
  promptConfirm: promptState.promptConfirm,
  promptInput: promptState.promptInput,
}));

vi.mock("../../src/commands/doctor.js", () => ({
  runDoctor: doctorState.runDoctor,
}));

vi.mock("../../src/commands/sync.js", () => ({
  runSync: syncState.runSync,
}));

import { runRelease } from "../../src/commands/release.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-release-test-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  const config = {
    version: "0.0.1",
    projectName: "bbg-project",
    projectDescription: "release test",
    createdAt: "2026-03-29T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
    repos: [],
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

  await Promise.all([
    writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`),
    writeTextFile(
      join(cwd, "docs", "workflows", "release-checklist.md"),
      "# Release Checklist\n\n- [ ] Confirm doctor status\n- [ ] Confirm sync status\n",
    ),
  ]);
}

async function seedWorkspaceWithoutChecklist(cwd: string): Promise<void> {
  const config = {
    version: "0.0.1",
    projectName: "bbg-project",
    projectDescription: "release test",
    createdAt: "2026-03-29T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
    repos: [],
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

  await writeTextFile(join(cwd, ".bbg", "config.json"), `${JSON.stringify(config, null, 2)}\n`);
}

describe("release command", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    promptState.promptConfirm.mockReset();
    promptState.promptInput.mockReset();
    doctorState.runDoctor.mockReset();
    syncState.runSync.mockReset();

    promptState.promptConfirm.mockResolvedValue(true);
    doctorState.runDoctor.mockResolvedValue({
      ok: true,
      mode: "full",
      checks: [],
      errors: [],
      warnings: [],
      info: [],
      exitCode: 0,
      fixesApplied: [],
    });
    syncState.runSync.mockResolvedValue({
      repoStatuses: [],
      orphanRepos: [],
      drift: [],
    });
  });

  afterEach(async () => {
    warnSpy.mockRestore();
    const { rm } = await import("node:fs/promises");
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("runs doctor/sync, confirms checklist, and writes a release record", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);
    promptState.promptInput
      .mockResolvedValueOnce("v1.2.3")
      .mockResolvedValueOnce("release notes");

    const result = await runRelease({ cwd });

    expect(doctorState.runDoctor).toHaveBeenCalledWith({ cwd });
    expect(syncState.runSync).toHaveBeenCalledWith({ cwd });
    expect(result.version).toBe("v1.2.3");
    expect(result.checklistConfirmed).toBe(true);
    expect(result.releaseFile).toMatch(/^docs\/changes\/\d{4}-\d{2}-\d{2}-release-v1.2.3\.md$/);

    const releaseText = await readFile(join(cwd, result.releaseFile), "utf8");
    expect(releaseText).toContain("# Release v1.2.3");
    expect(releaseText).toContain("## Notes");
    expect(releaseText).toContain("release notes");
    expect(releaseText).toContain("- [x] Confirm doctor status");
    expect(releaseText).toContain("- [x] Confirm sync status");
  });

  it("supports checklist non-yes flow and skip flags", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    promptState.promptConfirm
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    promptState.promptInput
      .mockResolvedValueOnce("v1.2.4")
      .mockResolvedValueOnce("some notes");

    const result = await runRelease({ cwd, skipDoctor: true, skipSync: true });

    expect(doctorState.runDoctor).not.toHaveBeenCalled();
    expect(syncState.runSync).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/skipDoctor=true/i));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/skipSync=true/i));
    expect(result.checklistConfirmed).toBe(false);
    expect(result.version).toBe("v1.2.4");
  });

  it("blocks release when sync drift exists and user does not acknowledge", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    syncState.runSync.mockResolvedValueOnce({
      repoStatuses: [],
      orphanRepos: [],
      drift: [
        {
          repoName: "repo-a",
          kind: "stack",
          expected: {
            language: "typescript",
            framework: "node",
            buildTool: "npm",
            testFramework: "vitest",
            packageManager: "npm",
          },
          actual: {
            language: "typescript",
            framework: "next",
            buildTool: "npm",
            testFramework: "vitest",
            packageManager: "npm",
          },
        },
      ],
    });
    promptState.promptConfirm.mockResolvedValueOnce(false);
    promptState.promptInput
      .mockResolvedValueOnce("v1.2.3")
      .mockResolvedValueOnce("release notes");

    await expect(runRelease({ cwd })).rejects.toThrow(/drift/i);
    expect(promptState.promptConfirm).toHaveBeenCalledTimes(1);
  });

  it("generates deterministic fallback checklist without templating residue", async () => {
    const cwd = await makeTempDir();
    await seedWorkspaceWithoutChecklist(cwd);

    promptState.promptInput.mockResolvedValueOnce("v1.3.0").mockResolvedValueOnce("fallback notes");

    await runRelease({ cwd });

    const checklistText = await readFile(join(cwd, "docs", "workflows", "release-checklist.md"), "utf8");
    expect(checklistText).not.toContain("{{else}}");
    expect(checklistText).not.toContain("{{");
    expect(checklistText).not.toMatch(/^\s*-\s*\[\s\]\s*$/m);
  });
});
