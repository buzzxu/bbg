import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serializeConfig } from "../../src/config/read-write.js";
import { runDeliverCommand } from "../../src/commands/deliver.js";
import { buildDefaultRuntimeConfig } from "../../src/runtime/schema.js";
import { writeTextFile } from "../../src/utils/fs.js";

const execaState = vi.hoisted(() => ({
  execa: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: execaState.execa,
}));

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-deliver-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  await writeTextFile(
    join(cwd, ".bbg", "config.json"),
    serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "deliver test",
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
  await writeTextFile(
    join(cwd, "docs", "specs", "2026", "04", "notification.md"),
    "Build notification center; include preferences; support audit trail.\n",
  );
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

beforeEach(() => {
  execaState.execa.mockReset();
  execaState.execa
    .mockResolvedValueOnce({ stdout: " M src/a.ts\n M src/b.ts\n" })
    .mockResolvedValueOnce({ stdout: "a1 commit\na2 commit\n" });
});

describe("deliver command", () => {
  it("generates report and dynamic svg diagrams", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    const result = await runDeliverCommand({
      cwd,
      task: "TASK-20260409-001",
      spec: "docs/specs/2026/04/notification.md",
      includeSvg: true,
    });

    expect(result.reportPath).toContain("docs/delivery/");
    expect(result.diagramPaths).toHaveLength(2);

    const report = await readFile(join(cwd, result.reportPath), "utf8");
    expect(report).toContain("Client Delivery Report");
    expect(report).toContain("TASK-20260409-001");
    expect(report).toMatch(/\| Total \| [0-9.]+ \|/);

    expect(result.estimatedHours.total).toBeGreaterThan(0);

    const svg = await readFile(join(cwd, result.diagramPaths[0]), "utf8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("Architecture Flow");
  });
});
