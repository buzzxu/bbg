import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { serializeConfig } from "../../src/config/read-write.js";
import { runTaskStartCommand } from "../../src/commands/task-start.js";
import { buildDefaultRuntimeConfig } from "../../src/runtime/schema.js";
import { writeTextFile } from "../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-task-start-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  await writeTextFile(
    join(cwd, ".bbg", "config.json"),
    serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "task-start test",
      createdAt: "2026-04-09T00:00:00.000Z",
      updatedAt: "2026-04-09T00:00:00.000Z",
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
      runtime: buildDefaultRuntimeConfig(),
    }),
  );
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("task-start command", () => {
  it("writes confirmed spec and wiki artifact", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runTaskStartCommand({
      cwd,
      requirement: "Build notification center with preferences",
      workflow: "full-feature",
      autoWiki: true,
    });

    expect(result.workflow).toBe("full-feature");
    expect(result.specPath).toContain("docs/specs/");
    expect(result.wikiPath).toContain("docs/wiki/concepts/");

    const specContent = await readFile(join(cwd, result.specPath), "utf8");
    expect(specContent).toContain("Confirmed Requirement");
    expect(specContent).toContain("Build notification center with preferences");

    if (!result.wikiPath) {
      throw new Error("Expected wiki path to be generated.");
    }
    const wikiContent = await readFile(join(cwd, result.wikiPath), "utf8");
    expect(wikiContent).toContain("Requirement Knowledge");
  });
});
