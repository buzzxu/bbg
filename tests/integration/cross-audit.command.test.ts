import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { serializeConfig } from "../../src/config/read-write.js";
import { runCrossAuditCommand } from "../../src/commands/cross-audit.js";
import { buildDefaultRuntimeConfig } from "../../src/runtime/schema.js";
import { writeTextFile } from "../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-cross-audit-command-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(cwd: string): Promise<void> {
  await writeTextFile(
    join(cwd, ".bbg", "config.json"),
    serializeConfig({
      version: "0.1.0",
      projectName: "bbg-project",
      projectDescription: "cross audit test",
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
    join(cwd, "docs", "reports", "primary.md"),
    "- finding [validation] medium src/service.ts input validation missing\n",
  );
  await writeTextFile(
    join(cwd, "docs", "reports", "cross.md"),
    "- finding [validation] high src/service.ts input validation missing\n",
  );
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("cross-audit command", () => {
  it("requires different models and writes report", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    await expect(
      runCrossAuditCommand({
        cwd,
        primaryModel: "codex",
        crossModel: "codex",
      }),
    ).rejects.toThrow("different primary and cross models");

    const result = await runCrossAuditCommand({
      cwd,
      primaryModel: "codex",
      crossModel: "claude",
      from: ["docs/reports/primary.md", "docs/reports/cross.md"],
    });

    expect(result.reportPath).toContain("docs/reports/");
    expect(result.reportJsonPath).toContain("docs/reports/");
    expect(result.conflicts).toBe(1);
    expect(result.agreementRate).toBe(0);
    expect(result.verdict).toBe("BLOCK");

    const jsonReport = JSON.parse(await readFile(join(cwd, result.reportJsonPath), "utf8")) as {
      summary: { conflicts: number; verdict: string };
    };
    expect(jsonReport.summary.conflicts).toBe(1);
    expect(jsonReport.summary.verdict).toBe("BLOCK");
  });

  it("accepts structured JSON inputs", async () => {
    const cwd = await makeTempDir();
    await seedWorkspace(cwd);

    await writeTextFile(
      join(cwd, "docs", "reports", "primary-audit.json"),
      `${JSON.stringify(
        {
          findings: [
            {
              id: "SEC-1",
              severity: "medium",
              filePath: "src/service.ts",
              rule: "validation",
              description: "Input validation missing",
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    await writeTextFile(
      join(cwd, "docs", "reports", "cross-audit.json"),
      `${JSON.stringify(
        {
          findings: [
            {
              id: "SEC-1B",
              severity: "high",
              filePath: "src/service.ts",
              rule: "validation",
              description: "Input validation missing",
            },
          ],
        },
        null,
        2,
      )}\n`,
    );

    const result = await runCrossAuditCommand({
      cwd,
      primaryModel: "codex",
      crossModel: "claude",
      from: ["docs/reports/primary-audit.json", "docs/reports/cross-audit.json"],
    });

    expect(result.conflicts).toBe(1);
    expect(result.verdict).toBe("BLOCK");
    const markdown = await readFile(join(cwd, result.reportPath), "utf8");
    expect(markdown).toContain("Reconciliation Matrix");
  });
});
