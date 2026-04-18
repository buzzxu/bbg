import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runRepairAdapters } from "../../../src/commands/repair-adapters.js";
import { serializeConfig } from "../../../src/config/read-write.js";
import type { BbgConfig } from "../../../src/config/schema.js";
import { MANAGED_SECTION_END, MANAGED_SECTION_START } from "../../../src/adapters/managed.js";
import { writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-repair-adapters-"));
  tempDirs.push(dir);
  return dir;
}

function buildConfig(): BbgConfig {
  const now = "2026-04-17T00:00:00.000Z";
  return {
    version: "1.0.0",
    projectName: "adapter-workspace",
    projectDescription: "adapter repair test",
    createdAt: now,
    updatedAt: now,
    repos: [],
    governance: {
      riskThresholds: {
        high: { grade: "A+", minScore: 99 },
        medium: { grade: "A", minScore: 95 },
        low: { grade: "B", minScore: 85 },
      },
      enableRedTeam: false,
      enableCrossAudit: false,
    },
    context: {},
  };
}

describe("repair-adapters command", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("repairs managed sections and recreates missing adapter files", async () => {
    const cwd = await makeTempDir();
    await writeTextFile(join(cwd, ".bbg", "config.json"), serializeConfig(buildConfig()));
    await writeTextFile(
      join(cwd, "CLAUDE.md"),
      [
        "# Adapter",
        "",
        MANAGED_SECTION_START,
        "stale managed block",
        MANAGED_SECTION_END,
        "",
        "User notes stay here.",
        "",
      ].join("\n"),
    );

    const result = await runRepairAdapters({ cwd });

    expect(result.repaired).toContain("CLAUDE.md");
    expect(result.created).toContain(".gemini/settings.json");

    const claudeText = await readFile(join(cwd, "CLAUDE.md"), "utf8");
    expect(claudeText).toContain("User notes stay here.");
    expect(claudeText).toContain("Use the repo-level canonical governance files as the primary source of truth");

    const geminiSettings = await readFile(join(cwd, ".gemini", "settings.json"), "utf8");
    expect(geminiSettings).toContain(".bbg/context/repo-map.json");
    expect(geminiSettings).toContain(".bbg/policy/decisions.json");
  });
});
