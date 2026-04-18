import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-doc-garden-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedConfig(cwd: string): Promise<void> {
  await writeTextFile(
    join(cwd, ".bbg", "config.json"),
    `${JSON.stringify(
      {
        version: "1.0.0",
        projectName: "test",
        projectDescription: "test",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        repos: [],
        governance: {
          riskThresholds: {
            high: { grade: "A", minScore: 90 },
            medium: { grade: "B", minScore: 70 },
            low: { grade: "C", minScore: 50 },
          },
          enableRedTeam: false,
          enableCrossAudit: false,
        },
        context: {},
      },
      null,
      2,
    )}\n`,
  );
}

describe("doc-garden command", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("reports stale and missing references", async () => {
    const cwd = await makeTempDir();
    await seedConfig(cwd);
    await writeTextFile(join(cwd, "docs", "guide.md"), "See `src/app.ts` and `src/missing.ts`.\n");
    await new Promise((resolve) => setTimeout(resolve, 20));
    await writeTextFile(join(cwd, "src", "app.ts"), "export const app = true;\n");

    const { runDocGardenCommand } = await import("../../../src/commands/doc-garden.js");
    const result = await runDocGardenCommand({ cwd, mode: "scan" });

    expect(result.report?.docsScanned).toBe(1);
    expect(result.report?.findings.map((finding) => finding.type).sort()).toEqual(["missing-reference", "stale-reference"]);
  });
});
